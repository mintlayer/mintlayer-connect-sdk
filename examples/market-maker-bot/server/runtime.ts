import { Client, WalletState, atomsToDecimal, type WalletTx, type WalletUtxo } from '@mintlayer/sdk';
import { createHash } from 'node:crypto';
import type { FastifyBaseLogger } from 'fastify';
import type { BotSnapshot, CommandEnvelope, CommandResult, Control } from '../shared/protocol';
import { errorMessage } from '../shared/protocol';
import { validateConfig } from '../src/lib/config';
import { strategyActionToRequest } from '../src/lib/execution';
import { buildSyntheticBook, isOwnOrder } from '../src/lib/orderBook';
import { listTrades } from '../src/lib/trades';
import { analyzeBranches, createBranchPreparationPlan } from '../src/lib/utxoBranches';
import type { TokenLabelMap } from '../src/lib/tokens';
import type {
  ExecutionRequest,
  MarketMakerConfig,
  MarketOrder,
  StrategyAction,
  MarketBook,
  WalletSnapshot,
} from '../src/lib/types';
import { BotDatabase, txJson } from './database';
import { ChainApi, HttpError, createClient } from './chain';
import { Executor, PolicyPause } from './execution';
import { validateTradingConfig, type ServerOptions } from './config';
import { asset, atoms, manualQuote, planServerActions, referencePrice, displayMarketBook } from './strategy';
import { orderIdFromJson } from './orderId';
import { reconcileOrderAttempt } from './reconciliation';

const outpoint = (entry: { outpoint: { source_type: unknown; source_id: string; index: number } }) =>
  `utxo:${entry.outpoint.source_type}:${entry.outpoint.source_id}:${entry.outpoint.index}`;
const emptyBook = () => ({ bids: [], asks: [], midPrice: null, bestBid: null, bestAsk: null });
class BootstrapPending extends Error {}
type ReorgRecovery = { phase: 'rollback' | 'replay'; fork: import('@mintlayer/sdk').SyncCursor };
export class BotRunner {
  config: MarketMakerConfig;
  control: Control;
  private client: Client | null = null;
  private walletState: WalletState | null = null;
  private executor: Executor | null = null;
  private account = '';
  private wallet: WalletSnapshot | null = null;
  private orders: MarketOrder[] = [];
  private marketBook: MarketBook | undefined;
  private ownOrders: MarketOrder[] = [];
  private labels: TokenLabelMap = {};
  private timer: ReturnType<typeof setTimeout> | null = null;
  private busy: Promise<void> | null = null;
  private generation = 0;
  private closing = false;
  private revision = 0;
  private lastSyncAt: number | null = null;
  private lastCycleAt: number | null = null;
  private pauseReason: string | null = 'Waiting for initial synchronization';
  private initializedAt: number | null = null;
  private failures = 0;
  private bootstrapping = false;
  private lastMaintenance = 0;
  private deferredReason: string | null = null;
  private listeners = new Set<() => void>();

  constructor(
    readonly db: BotDatabase,
    readonly api: ChainApi,
    readonly options: ServerOptions,
    private readonly logger: Pick<FastifyBaseLogger, 'info' | 'warn' | 'error'>,
    private readonly clientFactory = createClient,
  ) {
    const saved = db.initialize(options.config);
    this.config = validateTradingConfig(saved.config, options.config.network);
    this.control = saved.control;
    if (!options.autoResume) this.control = { ...this.control, running: false };
    if (!options.config.allowMainnetBroadcast) this.config.allowMainnetBroadcast = false;
    if (
      this.config.network === 'mainnet' &&
      !options.config.allowMainnetBroadcast &&
      this.control.executionMode === 'live'
    )
      this.control.executionMode = 'observe';
    this.persist();
  }
  private persist(): void {
    this.db.setSetting('bot', { config: this.config, control: this.control });
  }
  private safeError(error: unknown): string {
    let message = errorMessage(error);
    for (const secret of [
      this.options.walletSeed,
      this.options.apiKey,
      this.options.rpcPassword,
      this.options.adminPassword,
    ])
      if (secret) message = message.split(secret).join('[redacted]');
    return message.slice(0, 1000);
  }
  private emit(): void {
    this.revision++;
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        this.listeners.delete(listener);
      }
    }
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  start(): void {
    this.wake();
  }
  private wake(): void {
    if (this.closing) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.tick();
    }, 0);
  }
  accept(envelope: CommandEnvelope): CommandResult {
    const existing = this.db.command(envelope.id);
    this.db.atomic(() => {
      this.db.enqueue(envelope);
      // Stop and mode downgrades must fence a build/sign already awaiting I/O.
      if (
        !existing &&
        (envelope.command.kind === 'stop' || (envelope.command.kind === 'mode' && envelope.command.mode !== 'live'))
      ) {
        this.generation++;
        if (envelope.command.kind === 'stop') this.control.running = false;
        else this.control.executionMode = envelope.command.mode;
        this.persist();
        this.db.finishCommand(envelope.id);
      }
    });
    this.logger.info({ commandId: envelope.id, kind: envelope.command.kind }, 'Bot command accepted');
    this.emit();
    this.wake();
    return this.db.command(envelope.id)!;
  }
  async tick(): Promise<void> {
    if (this.busy || this.closing) return this.busy ?? undefined;
    this.busy = this.runTick();
    try {
      await this.busy;
    } finally {
      this.busy = null;
      if (!this.closing) {
        const queued = this.db.queuedCommands().length > 0;
        const delay = this.bootstrapping
          ? 250
          : queued
            ? 0
            : Math.min(300_000, this.config.pollIntervalMs * 2 ** Math.min(this.failures, 5));
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.timer = null;
          void this.tick();
        }, delay);
      }
    }
  }
  private async runTick(): Promise<void> {
    const started = Date.now();
    this.bootstrapping = false;
    try {
      for (const envelope of this.db.queuedCommands()) {
        try {
          await this.command(envelope);
          this.db.finishCommand(envelope.id);
        } catch (error) {
          if (error instanceof BootstrapPending) throw error;
          this.db.finishCommand(envelope.id, this.safeError(error));
          this.db.event('warn', 'command-failed', this.safeError(error), { commandId: envelope.id });
          this.logger.warn({ commandId: envelope.id, error: this.safeError(error) }, 'Bot command failed');
        }
      }
      if (!this.client) await this.initialize();
      await this.sync();
      if (this.control.running && this.control.executionMode !== 'observe') {
        const pending = this.db.pendingAttempts();
        const unresolved = pending.some((attempt) =>
          ['local', 'signed', 'submitting', 'unknown'].includes(attempt.record.status),
        );
        if (unresolved) this.pauseReason = 'Resolving uncertain transaction submissions';
        else if (pending.length >= this.options.maxPending) this.pauseReason = 'Pending transaction limit reached';
        else {
          this.deferredReason = null;
          const action = this.config.simulateOwnFills ? this.simulationAction()
            : this.actions().find(action => this.simulationRetryReady(action.id));
          if (action) await this.execute(strategyActionToRequest(action, this.wallet!.addresses.receiving[0]), false);
          else if (this.deferredReason) this.pauseReason = this.deferredReason;
        }
      }
      this.failures = 0;
      if (Date.now() - this.lastMaintenance > 3_600_000) {
        this.db.maintain(this.options.eventRetentionDays);
        this.lastMaintenance = Date.now();
      }
      this.logger.info(
        {
          cycleDurationMs: Date.now() - started,
          configVersion: this.control.configVersion,
          pending: this.db.pendingAttempts().length,
        },
        'Bot cycle complete',
      );
    } catch (error) {
      if (error instanceof PolicyPause) {
        this.failures = 0;
        this.pauseReason = error.message;
        return;
      }
      if (error instanceof BootstrapPending) {
        this.bootstrapping = true;
        this.lastSyncAt = null;
        this.pauseReason = error.message;
        this.failures = 0;
        this.logger.info({ progress: error.message }, 'Wallet history bootstrap');
        return;
      }
      this.pauseReason = this.safeError(error);
      this.failures++;
      this.logger.error({ error: this.pauseReason }, 'Bot cycle failed; trading paused');
      try {
        this.db.event('error', 'cycle-failed', this.pauseReason);
      } catch {
        /* A full disk must not turn into an unhandled rejection. */
      }
    } finally {
      this.lastCycleAt = Date.now();
      this.emit();
    }
  }
  private async initialize(): Promise<void> {
    const client = await this.clientFactory(this.options, this.api);
    const addresses = client.getAddresses();
    const owned = new Set([...addresses.receiving, ...addresses.change]);
    this.account = createHash('sha256')
      .update(`${this.config.network}:${[...owned].sort().join('|')}`)
      .digest('hex');
    const previous = this.db.getSetting<string>('account');
    if (previous && previous !== this.account)
      throw new Error('Wallet differs from this database; use a separate BOT_DB_PATH');
    this.db.setSetting('account', this.account);
    const wallet = await WalletState.create({
      accountId: this.account,
      store: this.db.walletStore(),
      isMineOutput: (output: any) => owned.has(output?.destination),
    });
    this.client = client;
    this.walletState = wallet;
    this.executor = new Executor(this.db, client, wallet, this.account, this.options);
    this.initializedAt = Date.now();
    this.db.event('info', 'initialized', 'Server wallet initialized', { network: this.config.network });
  }
  private async command({ id, command }: CommandEnvelope): Promise<void> {
    if (command.kind === 'stop') {
      this.db.atomic(() => {
        this.control.running = false;
        this.persist();
        this.db.finishCommand(id);
      });
      return;
    }
    if (command.kind === 'mode') {
      if (!this.db.isLatestControl(id, ['mode'])) throw new Error('Mode command superseded by a newer command');
      if (command.mode === 'live' && this.config.network === 'mainnet' && !this.options.config.allowMainnetBroadcast)
        throw new Error('Server policy blocks mainnet broadcast');
      const control = { ...this.control, executionMode: command.mode };
      this.db.atomic(() => {
        this.db.setSetting('bot', { config: this.config, control });
        this.db.finishCommand(id);
      });
      this.generation++;
      this.control = control;
      return;
    }
    if (command.kind === 'config') {
      if (command.expectedVersion !== this.control.configVersion)
        throw new Error('Config changed; refresh before saving');
      const config = validateTradingConfig(command.config, this.options.config.network);
      if (config.allowMainnetBroadcast !== this.options.config.allowMainnetBroadcast)
        throw new Error('Mainnet broadcast policy is server-only');
      const changedPair = config.baseToken !== this.config.baseToken || config.quoteToken !== this.config.quoteToken;
      if (changedPair && (this.control.running || this.db.pendingAttempts().length || this.ownOrders.length))
        throw new Error('Stop and settle open orders before changing assets');
      const control = { ...this.control, configVersion: this.control.configVersion + 1 };
      this.db.atomic(() => {
        this.db.setSetting('bot', { config, control });
        this.db.finishCommand(id);
      });
      this.generation++;
      this.config = config;
      this.control = control;
      this.lastSyncAt = null;
      return;
    }
    if (!this.client) await this.initialize();
    await this.sync();
    if (command.kind === 'sync') return;
    if (command.kind === 'abandon-attempt') {
      const attempt = this.db.getAttempt(command.attemptId);
      if (!attempt || attempt.preview) throw new Error('Unknown live attempt');
      if (attempt.record.status === 'signed' && !attempt.submittedAt) {
        await this.executor!.submit(attempt, () => false);
        return;
      }
      if (this.db.pendingAttempts().some(item => item.record.id === attempt.record.id))
        throw new Error('Cannot abandon without canonical rejection evidence; inputs remain reserved. Reconciliation continues automatically.');
      return;
    }
    if (command.kind === 'start') {
      if (!this.db.isLatestControl(id, ['start', 'stop']))
        throw new Error('Start superseded by a newer control command');
      const control = { ...this.control, running: true };
      this.db.atomic(() => {
        this.db.setSetting('bot', { config: this.config, control });
        this.db.finishCommand(id);
      });
      this.control = control;
      return;
    }
    if (command.kind === 'manual-order')
      return void (await this.execute(
        strategyActionToRequest(
          manualQuote(command.side, this.config, this.wallet!, this.orders, this.ownOrders, this.labels, id, this.marketBook),
          this.wallet!.addresses.receiving[0],
        ),
        true,
      ));
    if (command.kind === 'conclude') {
      if (!this.ownOrders.some((order) => order.order_id === command.orderId))
        throw new Error('Order is not owned by this wallet');
      return void (await this.execute(
        {
          id,
          kind: 'conclude-order',
          orderId: command.orderId,
          description: 'Manual order conclusion.',
          idempotencyKey: `manual-conclude:${id}`,
        },
        true,
      ));
    }
    if (command.kind === 'execute') {
      const action = this.actions().find((action) => action.id === command.actionId);
      if (!action) throw new Error('Proposal is no longer current');
      return void (await this.execute(strategyActionToRequest(action, this.wallet!.addresses.receiving[0]), true));
    }
    const request = this.preparationPlan().actions.find((request) => request.id === command.requestId);
    if (!request) throw new Error('Branch preparation is no longer current');
    await this.execute({ ...request, idempotencyKey: `${request.idempotencyKey}:${id}` }, true);
  }
  private async execute(request: ExecutionRequest, manual: boolean): Promise<void> {
    if (this.control.executionMode === 'observe') throw new Error('Observe mode does not execute transactions');
    if (!this.wallet || !this.lastSyncAt || Date.now() - this.lastSyncAt > this.options.staleAfterMs)
      throw new Error('Wallet snapshot is stale');
    const pending = this.db.pendingAttempts();
    if (
      pending.length >= this.options.maxPending ||
      pending.some((attempt) => ['unknown', 'submitting', 'local'].includes(attempt.record.status))
    )
      throw new Error('Resolve pending submissions before creating another transaction');
    if (
      request.kind === 'create-order' &&
      this.ownOrders.filter((order) => atoms(order.ask_balance) > 0n && atoms(order.give_balance) > 0n).length >=
        this.config.maxOrders
    )
      throw new Error('Open order limit reached');
    const generation = this.generation;
    const version = this.control.configVersion;
    const canSend = () =>
      !this.closing &&
      generation === this.generation &&
      version === this.control.configVersion &&
      this.control.executionMode === 'live' &&
      (this.config.network !== 'mainnet' || this.options.config.allowMainnetBroadcast) &&
      (manual || this.control.running) &&
      Date.now() - this.lastSyncAt! <= this.options.staleAfterMs;
    const attempt = await this.executor!.execute(
      request,
      this.config,
      this.wallet.availableUtxos,
      canSend,
      this.control.executionMode === 'dry-run',
    );
    if (attempt) {
      const context = { actionId: attempt.record.id, txId: attempt.record.txId, status: attempt.record.status };
      if (attempt.record.error)
        this.logger.warn({ ...context, error: this.safeError(attempt.record.error) }, 'Transaction attempt');
      else this.logger.info(context, 'Transaction attempt');
    }
    if (attempt?.record.status === 'rejected') {
      if (attempt.record.error?.startsWith('Rolling daily fee budget exhausted')) throw new PolicyPause(attempt.record.error);
      throw new Error(attempt.record.error ?? 'Transaction build failed');
    }
    await this.sync();
  }
  private async sync(): Promise<void> {
    if (!this.client || !this.walletState) throw new Error('Wallet is not initialized');
    const started = Date.now();
    const tip = await this.api.tip();
    await this.api.verifyNode(tip);
    const previous = this.db.cursor(this.account);
    const reorg =
      previous && (previous.height > tip.height || (await this.api.blockId(previous.height)) !== previous.blockHash);
    let recovery = this.db.getSetting<ReorgRecovery>('reorgRecovery');
    if (recovery?.phase === 'replay' && reorg) recovery = null;
    if (!recovery && reorg) {
      recovery = { phase: 'rollback', fork: await this.findFork(previous!, tip) };
      this.db.setSetting('reorgRecovery', recovery);
    }
    if (recovery?.phase === 'rollback') {
      const affected = new Set(this.db.transactions(this.account)
        .filter(tx => tx.blockHeight !== undefined && tx.blockHeight > recovery!.fork.height).map(tx => tx.txId));
      // Persist the fork cursor immediately. Bootstrap continuations must never
      // re-roll back the batches that they have already re-observed.
      await this.walletState.rollbackTo(recovery.fork);
      this.db.atomic(() => {
        for (const attempt of this.db.listAttempts(1_000_000).reverse()) {
          if (attempt.record.status !== 'confirmed' || attempt.preview || !attempt.tx || !affected.has(attempt.record.txId!)) continue;
          attempt.record = { ...attempt.record, status: 'unknown', updatedAt: Date.now(), error: 'Rechecking after chain reorganization' };
          this.db.saveAttempt(attempt);
          if (attempt.createdOrder) {
            this.db.saveOrder(attempt.createdOrder, true);
            this.db.restoreConfirmedCreation(attempt.createdOrder.order_id);
          }
          if (attempt.request.kind === 'conclude-order') this.db.restoreConfirmedCreation(attempt.request.orderId);
        }
        recovery = { ...recovery!, phase: 'replay' };
        this.db.setSetting('reorgRecovery', recovery);
        this.db.setSetting('reorgSearch', null);
        this.db.event('warn', 'reorg', 'Chain changed; rechecking affected transactions', { forkHeight: recovery.fork.height });
      });
    }
    const addresses = this.client.getAddresses();
    await this.discoverHistory(addresses, tip, !!recovery);
    if (recovery) {
      for (const attempt of this.db.pendingAttempts())
        if (attempt.tx && attempt.signedHex) this.db.reserve(this.account, attempt, true);
      await this.walletState.reload();
    }
    const [orders, entries, marketBook] = await Promise.all([
      this.api.pairOrders(this.config),
      this.api.getAccountUtxos([...addresses.receiving, ...addresses.change]),
      this.api.openBook(this.config),
    ]);
    const known = new Map(this.db.transactions(this.account).map((tx) => [tx.txId, tx]));
    const observations = new Map<string, Awaited<ReturnType<ChainApi['transaction']>>>();
    const observe = async (id: string) => {
      if (!observations.has(id)) observations.set(id, await this.api.transaction(id));
      return observations.get(id)!;
    };
    const updated: WalletTx[] = [];
    const networkUtxos: WalletUtxo[] = [];
    for (const entry of entries) {
      let blockHeight: number | undefined, blockHash: string | undefined;
      if (String(entry.outpoint.source_type) === 'BlockReward') {
        const block = await this.api.get(`/block/${entry.outpoint.source_id}`);
        blockHeight = Number(block.height);
        if (!Number.isSafeInteger(blockHeight) || (await this.api.blockId(blockHeight)) !== entry.outpoint.source_id)
          throw new Error('Unverified block reward output');
        blockHash = entry.outpoint.source_id;
      } else {
        const existing = known.get(entry.outpoint.source_id);
        // A confirmed parent is immutable until our canonical cursor changes.
        let tx = existing?.state === 'confirmed' && !reorg ? existing : null;
        if (!tx) {
          const raw = await observe(entry.outpoint.source_id);
          if (!raw) throw new Error('UTXO source is not yet visible to the indexer');
          tx = await this.api.observe(raw, tip, existing?.createdByWallet);
          updated.push(tx);
        }
        if (tx.state !== 'confirmed') continue;
        blockHeight = tx.blockHeight;
        blockHash = tx.blockHash;
      }
      networkUtxos.push({
        ...entry,
        txId: entry.outpoint.source_id,
        outputIndex: entry.outpoint.index,
        status: 'confirmed',
        txState: 'confirmed',
        unconfirmedChainDepth: 0,
        blockHeight,
        blockHash,
      });
    }
    const accepted = new Set<string>();
    for (const attempt of this.db.pendingAttempts()) {
      if (!this.db.pendingAttempts().some((current) => current.record.id === attempt.record.id)) continue;
      if (!attempt.tx || !attempt.record.txId) continue;
      const raw = await observe(attempt.record.txId);
      if (raw) {
        const tx = await this.api.observe(raw, tip, true);
        updated.push(tx);
        attempt.record = {
          ...attempt.record,
          status: tx.state === 'confirmed' ? 'confirmed' : 'broadcasted',
          error: undefined,
          updatedAt: Date.now(),
        };
        this.db.transition(this.account, attempt, tx, tx.state === 'confirmed');
        if (tx.state === 'confirmed' && attempt.request.kind === 'conclude-order')
          this.db.concludeOrder(attempt.request.orderId);
        if (tx.state === 'mempool') accepted.add(tx.txId);
        continue;
      }
      const status = await this.api.mempool(attempt.record.txId);
      if (status === 'accepted') {
        accepted.add(attempt.record.txId!);
        if (attempt.record.status !== 'broadcasted') {
          attempt.record = { ...attempt.record, status: 'broadcasted', error: undefined, updatedAt: Date.now() };
          this.db.transition(this.account, attempt, {
            txId: attempt.record.txId!,
            tx: attempt.tx,
            state: 'mempool',
            createdByWallet: true,
            timestamp: attempt.record.createdAt,
          });
        }
      } else {
        const orderRecovery = await reconcileOrderAttempt(this.api, this.db, this.account, attempt, tip);
        if (orderRecovery.confirmed) {
          const tx = orderRecovery.confirmed;
          attempt.record = { ...attempt.record, status: 'confirmed', error: undefined, updatedAt: Date.now() };
          updated.push(tx);
          this.db.transition(this.account, attempt, tx, true);
          if (attempt.request.kind === 'conclude-order') this.db.concludeOrder(attempt.request.orderId);
          continue;
        }
        if (orderRecovery.conflict) {
          this.invalidateChain(attempt.record.txId, orderRecovery.conflict);
          continue;
        }
        if (await this.api.hasConfirmedInputConflict(txJson(attempt.tx).inputs, attempt.record.txId)) {
          this.invalidateChain(attempt.record.txId);
          continue;
        }
        if (attempt.record.status === 'broadcasted' && status !== 'unavailable') {
          attempt.record = {
            ...attempt.record,
            status: 'unknown',
            error: status === 'orphan' ? 'Transaction is in orphan pool' : 'Transaction left the node mempool',
            updatedAt: Date.now(),
          };
          this.db.transition(this.account, attempt, {
            txId: attempt.record.txId!,
            tx: attempt.tx,
            state: 'local',
            createdByWallet: true,
          });
        }
        // Only retransmit durable bytes. Stop and observe/dry-run still sync,
        // but never rebroadcast old live attempts behind the operator's back.
        if (Date.now() >= attempt.retryAt && this.control.running && this.control.executionMode === 'live') {
          const generation = this.generation;
          await this.executor!.submit(
            attempt,
            () =>
              !this.closing &&
              generation === this.generation &&
              this.control.running &&
              this.control.executionMode === 'live' &&
              (this.config.network !== 'mainnet' || this.options.config.allowMainnetBroadcast),
          );
          if (attempt.record.status === 'broadcasted' && this.options.rpcUrl) accepted.add(attempt.record.txId!);
        }
      }
    }
    this.api.setAcceptedOrderCreations(this.db.pendingAttempts().flatMap(attempt =>
      attempt.createdOrder && attempt.record.status === 'broadcasted' && accepted.has(attempt.record.txId!)
        ? [attempt.createdOrder as MarketOrder] : [],
    ));
    for (const order of orders) if (isOwnOrder(order, addresses)) this.db.saveOrder(order, true);
    const own: MarketOrder[] = [];
    for (const stored of this.db.ownOrders<MarketOrder & { originTxId?: string }>()) {
      let order = orders.find((order) => order.order_id === stored.order_id);
      if (!order) {
        try {
          order = await this.api.getOrder(stored.order_id);
          this.api.validateOrder(order!);
          this.db.saveOrder(order!, true);
        } catch (error) {
          if (!(error instanceof HttpError) || error.status !== 404) throw error;
          const origin = this.db.pendingAttempts().some((attempt) =>
            attempt.record.txId === stored.originTxId ||
            ((attempt.request.kind === 'fill-order' || attempt.request.kind === 'conclude-order') && attempt.request.orderId === stored.order_id));
          if (origin) order = stored;
          else throw new Error(`Owned order ${stored.order_id} is missing; resynchronization required`);
        }
      }
      if (order) own.push(order);
    }
    for (const id of new Set([
      'Coin',
      this.config.baseToken,
      this.config.quoteToken,
      ...own.flatMap((order) => [asset(order.ask_currency), asset(order.give_currency)]),
      ...entries.flatMap((entry) => {
        const value = (entry.utxo as any).value;
        return value?.token_id ? [value.token_id] : [];
      }),
    ])) {
      if (!this.labels[id]) this.labels[id] = await this.api.metadata(id);
    }
    const endTip = await this.api.tip();
    if (tip.blockHash !== endTip.blockHash || Date.now() - started > this.options.staleAfterMs)
      throw new Error('Network changed during synchronization; retrying before trading');
    await this.walletState.applySyncDiff({ toCursor: endTip, transactions: updated });
    if (recovery) this.db.setSetting('reorgRecovery', null);
    const resources = this.db.reservedResources();
    const networkKeys = new Set(networkUtxos.map(outpoint));
    const spendable = this.walletState
      .getSpendableUtxos({
        allowUnconfirmed: true,
        allowOwnChangeOnly: true,
        maxUnconfirmedChainDepth: this.config.maxUnconfirmedBranchDepth - 1,
      })
      .filter((utxo) => (utxo.status === 'confirmed' ? networkKeys.has(outpoint(utxo)) : accepted.has(utxo.txId)));
    const available = [
      ...new Map(
        [...spendable, ...networkUtxos]
          .filter((utxo) => !resources.has(outpoint(utxo)))
          .map((utxo) => [outpoint(utxo), utxo]),
      ).values(),
    ];
    const sdkBalances = { coin: 0, token: {} as Record<string, number> };
    for (const utxo of available) {
      const value = (utxo.utxo as any).value;
      if (!value?.amount) continue;
      const token = value.type === 'Coin' ? 'Coin' : value.token_id;
      const decimal = Number(atomsToDecimal(String(value.amount.atoms), this.labels[token]?.decimals ?? 11));
      if (token === 'Coin') sdkBalances.coin += decimal;
      else sdkBalances.token[token] = (sdkBalances.token[token] ?? 0) + decimal;
    }
    this.wallet = {
      addresses,
      sdkBalances,
      localBalance: this.walletState.getBalance({ includeUnconfirmed: true }),
      networkUtxos,
      availableUtxos: available,
      utxos: this.walletState
        .getUtxos({
          includeSpent: true,
          includeRejected: true,
          includeUnconfirmed: true,
          includeOrphaned: true,
          includeConflicted: true,
        })
        .slice(-500),
      spendableUtxos: spendable,
      transactions: this.db.transactions(this.account).slice(-100),
    };
    this.orders = orders;
    this.marketBook = marketBook;
    this.ownOrders = own;
    this.lastSyncAt = Date.now();
    this.pauseReason = null;
  }
  private async findFork(previous: import('@mintlayer/sdk').SyncCursor, tip: import('@mintlayer/sdk').SyncCursor): Promise<import('@mintlayer/sdk').SyncCursor> {
    const saved = this.db.getSetting<{ from: string; height: number; hash: string }>('reorgSearch');
    let height = saved?.from === previous.blockHash ? saved.height : previous.height;
    let hash = saved?.from === previous.blockHash ? saved.hash : previous.blockHash;
    for (let count = 0; count < 50; count++) {
      if (height <= tip.height && await this.api.blockId(height) === hash)
        return { height, blockHash: hash, updatedAt: Date.now() };
      if (height === 0) throw new Error('Indexer genesis changed');
      let parent: string | undefined;
      try { parent = (await this.api.get(`/block/${hash}`)).header?.previous_block_id; }
      catch (error) { if (!(error instanceof HttpError) || error.status !== 404) throw error; }
      if (!parent || !/^[0-9a-f]{64}$/i.test(parent)) {
        // Some indexers remove old-branch headers. A verified older wallet
        // checkpoint is a safe lower bound; rechecking extra history is fine.
        const checkpoints = this.db.transactions(this.account)
          .filter(tx => tx.blockHeight !== undefined && tx.blockHash && tx.blockHeight < height && tx.blockHeight <= tip.height)
          .sort((a, b) => b.blockHeight! - a.blockHeight!);
        for (const tx of new Map(checkpoints.map(tx => [tx.blockHeight!, tx])).values())
          if (await this.api.blockId(tx.blockHeight!) === tx.blockHash)
            return { height: tx.blockHeight!, blockHash: tx.blockHash!, updatedAt: Date.now() };
        return { height: 0, blockHash: await this.api.blockId(0), updatedAt: Date.now() };
      }
      height--;
      hash = parent;
      this.db.setSetting('reorgSearch', { from: previous.blockHash, height, hash });
    }
    throw new BootstrapPending(`Finding reorganization fork: checking height ${height}`);
  }
  private async discoverHistory(
    addresses: { receiving: string[]; change: string[] },
    tip: import('@mintlayer/sdk').SyncCursor,
    reorg: boolean,
  ): Promise<void> {
    const started = Date.now();
    const owned = new Set([...addresses.receiving, ...addresses.change]);
    const summaries = await Promise.all(
      [...owned].map(async (address) => {
        try {
          return await this.api.getAddress(address);
        } catch (error) {
          if (error instanceof HttpError && error.status === 404) return { transaction_history: [] };
          throw error;
        }
      }),
    );
    if (summaries.some((summary) => !Array.isArray(summary.transaction_history)))
      throw new Error('Address history response is incomplete');
    const known = new Map(this.db.transactions(this.account).map((tx) => [tx.txId, tx]));
    const missing = [...new Set<string>(summaries.flatMap((summary) => summary.transaction_history))].filter(
      (id) => !known.has(id) || ['orphaned', 'rejected', 'conflicted'].includes(known.get(id)!.state ?? ''),
    );
    let processed = 0;
    for (const id of missing.reverse().slice(0, 100)) {
      if (Date.now() - started > this.options.staleAfterMs)
        throw new BootstrapPending(
          `Bootstrapping wallet history: ${missing.length - processed} transactions remaining`,
        );
      if (!/^[0-9a-f]{64}$/i.test(id)) throw new Error('Malformed address transaction ID');
      const raw = await this.api.transaction(id);
      if (!raw) throw new Error('Address history is ahead of transaction lookup');
      const observed = await this.api.observe(raw, tip, known.get(id)?.createdByWallet ?? false);
      this.db.atomic(() => {
        for (const item of raw.outputs as any[]) {
          const destination = item.conclude_key ?? item.conclude_destination;
          if (item.type !== 'CreateOrder' || !owned.has(destination)) continue;
          const orderId = orderIdFromJson(raw.inputs, this.config.network, observed.blockHeight ?? tip.height);
          const askValue = item.ask_value,
            giveValue = item.give_value;
          const order: MarketOrder =
            askValue && giveValue
              ? {
                  order_id: orderId,
                  conclude_destination: destination,
                  ask_currency: { type: askValue.type, token_id: askValue.token_id },
                  give_currency: { type: giveValue.type, token_id: giveValue.token_id },
                  ask_balance: askValue.amount,
                  initially_asked: askValue.amount,
                  give_balance: giveValue.amount,
                  initially_given: giveValue.amount,
                  nonce: 0,
                }
              : { ...item, order_id: orderId };
          this.db.saveOrder(order, true);
        }
        this.db.putWalletTx(this.account, observed);
        if (observed.state === 'confirmed') {
          const attempt = this.db.attemptByTxId(id);
          if (attempt && attempt.record.status !== 'confirmed') {
            attempt.record = { ...attempt.record, status: 'confirmed', error: undefined, updatedAt: Date.now() };
            this.db.transition(this.account, attempt, observed, true);
            if (attempt.createdOrder) this.db.restoreConfirmedCreation(attempt.createdOrder.order_id);
            if (attempt.request.kind === 'conclude-order') this.db.concludeOrder(attempt.request.orderId);
          }
        } else {
          const attempt = this.db.attemptByTxId(id);
          if (attempt?.tx && attempt.signedHex && ['rejected', 'conflicted', 'cancelled'].includes(attempt.record.status)) {
            attempt.record = { ...attempt.record, status: 'broadcasted', error: undefined, updatedAt: Date.now() };
            // Renew reservations atomically before treating a previously
            // invalidated transaction as accepted. Conflicting ownership must
            // fail synchronization rather than expose the inputs twice.
            this.db.reserve(this.account, attempt);
            this.db.transition(this.account, attempt, observed);
          }
        }
      });
      processed++;
    }
    // Reconstruct settlement flags from confirmed wallet history. Unlike a
    // zero-balance order response, an actual ConcludeOrder is unambiguous.
    if (missing.length || reorg) {
      for (const tx of this.db.transactions(this.account)) {
        if (tx.state !== 'confirmed') continue;
        for (const entry of txJson(tx.tx).inputs as any[])
          if (entry.input?.command === 'ConcludeOrder') this.db.concludeOrder(entry.input.order_id);
      }
    }
    if (missing.length > 100)
      throw new BootstrapPending(`Bootstrapping wallet history: ${missing.length - 100} transactions remaining`);
  }
  private invalidateChain(root: string, reason = 'Confirmed input conflict invalidated this transaction chain'): void {
    const invalid = new Set([root]);
    const pending = this.db.pendingAttempts();
    let changed = true;
    while (changed) {
      changed = false;
      for (const attempt of pending) {
        if (
          attempt.tx &&
          !invalid.has(attempt.record.txId!) &&
          (txJson(attempt.tx).inputs as any[]).some((entry) => invalid.has(entry.input?.source_id))
        ) {
          invalid.add(attempt.record.txId!);
          changed = true;
        }
      }
    }
    this.db.atomic(() => {
      for (const attempt of pending) {
        if (!attempt.tx || !invalid.has(attempt.record.txId!)) continue;
        const state = attempt.record.txId === root ? 'conflicted' : 'rejected';
        attempt.record = {
          ...attempt.record,
          status: state,
          error: reason,
          updatedAt: Date.now(),
        };
        this.db.transition(
          this.account,
          attempt,
          { txId: attempt.record.txId!, tx: attempt.tx, state, createdByWallet: true, rebuildRequired: true },
          true,
        );
      }
    });
  }
  private actions(): StrategyAction[] {
    if (!this.wallet) return [];
    const reserved = this.db.reservedResources();
    return planServerActions({
      config: this.config,
      wallet: this.wallet,
      orders: this.orders,
      ownOrders: this.ownOrders,
      labels: this.labels,
      configVersion: this.control.configVersion,
      marketBook: this.marketBook,
    }).filter((action) => action.kind === 'create-order' || !reserved.has(`order:${action.orderId}`));
  }
  private simulationAction(): StrategyAction | undefined {
    if (!this.wallet || this.config.network !== 'testnet') return;
    // Broadcasted transactions can fund another order from their accepted
    // change via WalletState. runTick still fences uncertain submissions and
    // the pending/depth limits; reservations serialize each individual order.
    for (const order of this.ownOrders) {
      if (this.db.reservedResources().has(`order:${order.order_id}`)) continue;
      const fills = this.db
        .orderAttempts(order.order_id)
        .filter(
          (attempt) =>
            attempt.request.kind === 'fill-order' && ['confirmed', 'broadcasted'].includes(attempt.record.status),
        );
      if (fills[0]) {
        if (
          Date.now() - fills[0].record.createdAt >= this.config.simulationTradeTimeoutMs &&
          this.simulationRetryReady(`simulation-conclude:${order.order_id}`)
        ) return {
            id: `simulation-conclude:${order.order_id}`,
            kind: 'conclude-order',
            orderId: order.order_id,
            reason: 'Conclude self-filled testnet order.',
          };
        continue;
      }
      if (atoms(order.ask_balance) <= 1n) continue;
      if (!this.simulationRetryReady(`simulation-fill:${order.order_id}`)) continue;
      const askToken = asset(order.ask_currency);
      const exactAmount = atomsToDecimal((atoms(order.ask_balance) / 2n).toString(), this.labels[askToken].decimals);
      const available = this.wallet.availableUtxos.reduce((total, utxo) => {
        const value = (utxo.utxo as any).value;
        return (
          total + (value && (value.type === 'Coin' ? 'Coin' : value.token_id) === askToken ? atoms(value.amount) : 0n)
        );
      }, 0n);
      if (available < atoms(order.ask_balance) / 2n) continue;
      const buyingBase = asset(order.give_currency) === this.config.baseToken;
      const paid = atoms(order.ask_balance) / 2n;
      const received = (paid * atoms(order.initially_given)) / atoms(order.initially_asked);
      if (received <= 0n) continue;
      const expectedBaseAmount = Number(
        atomsToDecimal((buyingBase ? received : paid).toString(), this.labels[this.config.baseToken].decimals),
      );
      const expectedQuoteAmount = Number(
        atomsToDecimal((buyingBase ? paid : received).toString(), this.labels[this.config.quoteToken].decimals),
      );
      return {
        id: `simulation-fill:${order.order_id}`,
        kind: 'fill-order',
        side: buyingBase ? 'buy' : 'sell',
        orderId: order.order_id,
        amount: Number(exactAmount),
        exactAmount,
        price: expectedQuoteAmount / expectedBaseAmount,
        expectedBaseAmount,
        expectedQuoteAmount,
        isOwnOrder: true,
        reason: 'Testnet self-fill simulation.',
      };
    }
    return this.actions().find((action) => action.kind !== 'fill-order' && this.simulationRetryReady(action.id));
  }
  private simulationRetryReady(id: string): boolean {
    const attempt = this.db.getAttempt(this.control.executionMode === 'dry-run' ? `preview:${id}` : id);
    const ready = !attempt || !['draft', 'rejected', 'cancelled'].includes(attempt.record.status) ||
      (this.executor ? this.executor.retryReady(attempt) : attempt.retryAt <= Date.now());
    if (!ready && attempt.record.error) this.deferredReason ??= `${attempt.record.error}; retry after ${new Date(attempt.retryAt).toISOString()}`;
    return ready;
  }
  private preparationPlan() {
    return createBranchPreparationPlan({
      snapshot: this.wallet,
      sourceAsset: this.config.baseToken,
      targetBranchCount: 4,
      perBranchAmount: this.config.orderSize,
      maxUnconfirmedBranchDepth: this.config.maxUnconfirmedBranchDepth,
    });
  }
  snapshot(): BotSnapshot {
    const records = this.db.listAttempts(100).map((attempt) => this.db.publicRecord(attempt.record));
    const stale = !this.lastSyncAt || Date.now() - this.lastSyncAt > this.options.staleAfterMs || this.failures > 0;
    const book = this.wallet
      ? this.marketBook ? displayMarketBook(this.marketBook, this.config, this.labels)
        : buildSyntheticBook(this.orders, this.config.baseToken, this.config.quoteToken, this.labels)
      : emptyBook();
    let actions: StrategyAction[] = [];
    let manualReferencePrice = this.config.referencePrice;
    try {
      actions = stale ? [] : this.actions();
      if (this.wallet && this.labels[this.config.baseToken] && this.labels[this.config.quoteToken]) {
        const reference = referencePrice(this.orders, this.ownOrders, this.config, this.labels, this.marketBook);
        manualReferencePrice =
          (Number(reference.n) / Number(reference.d)) *
          10 ** (this.labels[this.config.baseToken].decimals - this.labels[this.config.quoteToken].decimals);
      }
    } catch {
      /* Invalid metadata is reported by the cycle. */
    }
    return {
      revision: this.revision,
      control: { ...this.control },
      runtime: {
        mode: this.failures ? 'error' : this.control.running ? 'running' : this.client ? 'ready' : 'initializing',
        initialized: !!this.client,
        initializedAt: this.initializedAt,
        error: this.failures ? this.pauseReason : null,
      },
      config: { ...this.config },
      configWarnings: validateConfig(this.config),
      wallet: this.wallet,
      orders: this.orders,
      ownOrders: this.ownOrders,
      book,
      actions,
      records,
      trades: listTrades(records),
      branches: analyzeBranches(this.wallet, this.config.maxUnconfirmedBranchDepth),
      preparationPlan: this.preparationPlan(),
      tokenLabels: this.labels,
      manualReferencePrice,
      lastCycleAt: this.lastCycleAt,
      lastSyncAt: this.lastSyncAt,
      stale,
      pauseReason: this.pauseReason,
      events: this.db.events(50),
      totals: this.db.totals(),
    };
  }
  async close(): Promise<void> {
    this.closing = true;
    this.generation++;
    if (this.timer) clearTimeout(this.timer);
    await this.busy;
  }
}
