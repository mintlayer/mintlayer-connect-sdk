import type { Client, WalletState, WalletTx, WalletUtxo } from '@mintlayer/sdk';
import { randomUUID } from 'node:crypto';
import { BotDatabase, inputResources, txJson, type Attempt } from './database';
import { errorMessage } from '../shared/protocol';
import type { ExecutionRequest, MarketMakerConfig } from '../src/lib/types';
import { orderIdFromInputs } from './orderId';
import type { ServerOptions } from './config';
import { BroadcastRejection, InvalidTransactionRejection } from './chain';
export class PolicyPause extends Error {}

export class Executor {
  constructor(
    private readonly db: BotDatabase,
    private readonly client: Client,
    private readonly wallet: WalletState,
    private readonly account: string,
    private readonly policy?: Pick<ServerOptions, 'dailyFeeLimitAtoms' | 'maxTxFeeAtoms'>,
  ) {}

  retryReady(attempt: Attempt): boolean {
    if (attempt.retryAt <= Date.now()) return true;
    // A raised budget (or expired spend window) makes an old budget cooldown
    // obsolete when even the maximum permitted transaction now fits.
    return !!(attempt.record.error?.startsWith('Rolling daily fee budget exhausted') &&
      this.policy?.dailyFeeLimitAtoms && this.policy?.maxTxFeeAtoms &&
      this.db.reservedFeesSince(Date.now() - 86_400_000) + BigInt(this.policy.maxTxFeeAtoms) <= BigInt(this.policy.dailyFeeLimitAtoms));
  }

  async execute(
    request: ExecutionRequest,
    config: MarketMakerConfig,
    available: WalletUtxo[],
    canSend: () => boolean,
    preview: boolean,
  ): Promise<Attempt | null> {
    if (preview) request = { ...request, idempotencyKey: `preview:${request.idempotencyKey}` };
    const existing = this.db.getAttempt(request.idempotencyKey);
    if (
      existing &&
      (!['draft', 'rejected', 'cancelled'].includes(existing.record.status) ||
        !this.retryReady(existing))
    )
      return existing;
    const now = Date.now();
    let attempt: Attempt = {
      record: {
        id: existing?.record.id ?? randomUUID(),
        kind: request.kind,
        description: request.description,
        idempotencyKey: request.idempotencyKey,
        status: 'draft',
        createdAt: existing?.record.createdAt ?? now,
        updatedAt: now,
        tradeMeta: request.kind === 'fill-order' ? request.tradeMeta : undefined,
      },
      request,
      retries: existing?.retries ?? 0,
      retryAt: 0,
      preview,
    };
    // Intents are durable before build/sign. A crash here may retry a build;
    // there are no signed bytes to accidentally broadcast yet.
    this.db.saveAttempt(attempt);
    try {
      if (!preview && config.network === 'mainnet' && !config.allowMainnetBroadcast)
        throw new Error('Server policy blocks mainnet broadcast');
      const depths = [...new Set(available.map((utxo) => utxo.unconfirmedChainDepth))].sort((a, b) => a - b);
      if (!depths.length) throw new Error('No spendable UTXOs under the current policy');
      let built: Awaited<ReturnType<Client['buildTransfer']>> | undefined;
      for (const depth of depths) {
        const opts = { withUTXO: available.filter((utxo) => utxo.unconfirmedChainDepth <= depth) };
        try {
          built =
            request.kind === 'create-order'
              ? await this.client.buildCreateOrder(request.args, opts)
              : request.kind === 'fill-order'
                ? await this.client.buildFillOrder(
                    { order_id: request.orderId, amount: request.amount, destination: request.destination },
                    opts,
                  )
                : request.kind === 'conclude-order'
                  ? await this.client.buildConcludeOrder({ order_id: request.orderId }, opts)
                  : request.tokenId
                    ? await this.client.buildTransfer(
                        { to: request.to, amount: request.amount, token_id: request.tokenId },
                        opts,
                      )
                    : await this.client.buildTransfer({ to: request.to, amount: request.amount }, opts);
          break;
        } catch (error) {
          if (!/Not enough (coin|token) UTXOs/i.test(errorMessage(error)) || depth === depths[depths.length - 1])
            throw error;
        }
      }
      if (!built) throw new Error('Unable to build on available branches');
      const json = built.JSONRepresentation;
      const fee = BigInt(json.fee?.atoms ?? '0');
      if (!preview && this.policy?.maxTxFeeAtoms && fee > BigInt(this.policy.maxTxFeeAtoms))
        throw new Error('Transaction exceeds BOT_MAX_TX_FEE');
      if (
        !preview &&
        this.policy?.dailyFeeLimitAtoms &&
        this.db.reservedFeesSince(Date.now() - 86_400_000) + fee > BigInt(this.policy.dailyFeeLimitAtoms)
      )
        throw new Error('Rolling daily fee budget exhausted');
      const resources = this.db.reservedResources();
      if (inputResources({ JSONRepresentation: json }).some((resource) => resources.has(resource)))
        throw new Error('Transaction resource is reserved by an unresolved attempt');
      if (!preview && !canSend()) return this.cancel(attempt, 'Execution mode or configuration changed during build');
      const signedHex = await this.client.signTransaction(built);
      if (typeof signedHex !== 'string' || !/^[0-9a-f]+$/i.test(signedHex))
        throw new Error('Signer returned invalid transaction bytes');
      attempt = {
        ...attempt,
        tx: json,
        signedHex,
        record: {
          ...attempt.record,
          txId: json.id,
          inputOutpoints: inputResources(json).filter((resource) => resource.startsWith('utxo:')),
          status: 'signed',
          updatedAt: Date.now(),
        },
      };
      if (preview) {
        this.db.saveAttempt(attempt);
        return attempt;
      }
      if (!canSend()) return this.cancel(attempt, 'Execution stopped before reservation');
      // This commit is the point after which recovery owns these inputs.
      if (request.kind === 'create-order') {
        const inputs = built.BINRepresentation?.inputs;
        if (!inputs) throw new Error('Builder did not expose encoded inputs');
        const id = orderIdFromInputs(inputs, config.network);
        const output = json.outputs.find((item: any) => item.type === 'CreateOrder') as any;
        attempt.createdOrder = { ...output, order_id: id, nonce: 0, originTxId: json.id };
      }
      this.db.reserve(this.account, attempt);
      await this.wallet.reload();
      return await this.submit(attempt, canSend);
    } catch (error) {
      // If a reservation exists, a persistence failure must leave it owned by
      // the durable attempt. Never turn that into an untracked rejection.
      if (attempt.tx && inputResources(attempt.tx).some((resource) => this.db.reservedResources().has(resource)))
        throw error;
      attempt.record = { ...attempt.record, status: 'rejected', error: errorMessage(error), updatedAt: Date.now() };
      attempt.retries += 1;
      // A temporary indexer failure or an exhausted rolling fee budget can
      // recover hours later. Bound the rate, not the lifetime retry count.
      attempt.retryAt = Date.now() + Math.min(300_000, 5000 * 2 ** Math.min(attempt.retries, 6));
      this.db.saveAttempt(attempt);
      this.db.event('warn', 'build-failed', errorMessage(error), { actionId: attempt.record.id });
      return attempt;
    }
  }

  private cancel(attempt: Attempt, reason: string): Attempt {
    attempt.record = { ...attempt.record, status: 'cancelled', error: reason, updatedAt: Date.now() };
    this.db.saveAttempt(attempt);
    return attempt;
  }

  async submit(attempt: Attempt, canSend: () => boolean): Promise<Attempt> {
    if (!attempt.tx || !attempt.signedHex) throw new Error('Missing durable signed transaction');
    if (!canSend()) {
      // A stopped retry may already have reached the network on an earlier
      // attempt. It must keep its reservations and cannot be cancelled locally.
      if (attempt.submittedAt || attempt.record.status !== 'signed') return attempt;
      attempt.record = {
        ...attempt.record,
        status: 'cancelled',
        error: 'Stopped before network submission',
        updatedAt: Date.now(),
      };
      this.db.transition(
        this.account,
        attempt,
        { txId: txJson(attempt.tx).id, tx: attempt.tx, state: 'rejected', createdByWallet: true },
        true,
      );
      await this.wallet.reload();
      return attempt;
    }
    const previouslySubmitted = attempt.submittedAt !== undefined;
    attempt.record = { ...attempt.record, status: 'submitting', updatedAt: Date.now() };
    attempt.submittedAt ??= Date.now();
    attempt.submittedCursor ??= this.db.cursor(this.account) ?? undefined;
    this.db.saveAttempt(attempt);
    // There is no await between this gate check and invoking broadcast.
    if (!canSend()) return this.submit(attempt, () => false);
    let accepted = false;
    let error: string | undefined;
    let rejected = false;
    try {
      await this.client.broadcastTx(attempt.signedHex);
      accepted = true;
    } catch (cause) {
      error = errorMessage(cause);
      rejected = cause instanceof InvalidTransactionRejection ||
        (cause instanceof BroadcastRejection && !previouslySubmitted);
    }
    attempt.retries += 1;
    attempt.retryAt = Date.now() + Math.min(300_000, 5000 * 2 ** Math.min(attempt.retries, 6));
    attempt.record = {
      ...attempt.record,
      status: accepted ? 'broadcasted' : rejected ? 'rejected' : 'unknown',
      error,
      updatedAt: Date.now(),
    };
    const walletTx: WalletTx = {
      txId: txJson(attempt.tx).id,
      tx: attempt.tx,
      state: accepted ? 'mempool' : rejected ? 'rejected' : 'local',
      timestamp: attempt.record.createdAt,
      createdByWallet: true,
    };
    // If this write fails after acceptance, the stored 'submitting' record
    // remains recoverable. Its input reservations are deliberately retained.
    this.db.transition(this.account, attempt, walletTx, rejected);
    await this.wallet.reload();
    return attempt;
  }
}
