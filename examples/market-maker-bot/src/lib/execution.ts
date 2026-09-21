import type { Client, TransactionOpts, WalletState, WalletUtxo } from '@mintlayer/sdk';

import type { ExecutionRecord, ExecutionRequest, MarketMakerConfig, StrategyAction } from './types';

function now(): number {
  return Date.now();
}

function createRecord(request: ExecutionRequest): ExecutionRecord {
  return {
    id: request.id,
    kind: request.kind,
    description: request.description,
    idempotencyKey: request.idempotencyKey,
    status: 'draft',
    createdAt: now(),
    updatedAt: now(),
  };
}

type BuiltTransaction = {
  JSONRepresentation: {
    id: string;
    inputs: unknown[];
    outputs: unknown[];
    fee?: unknown;
  };
};

function getTxJson(tx: BuiltTransaction) {
  return tx.JSONRepresentation;
}

export function strategyActionToRequest(action: StrategyAction, destination: string): ExecutionRequest {
  if (action.kind === 'conclude-order') {
    return {
      id: `exec:${action.id}`,
      kind: 'conclude-order',
      orderId: action.orderId,
      description: action.reason,
      idempotencyKey: action.id,
    };
  }

  if (action.kind === 'fill-order') {
    return {
      id: `exec:${action.id}`,
      kind: 'fill-order',
      orderId: action.orderId,
      amount: action.amount,
      destination,
      description: action.reason,
      idempotencyKey: action.id,
      tradeMeta: {
        side: action.side,
        orderId: action.orderId,
        fillAmount: action.amount,
        price: action.price,
        expectedBaseAmount: action.expectedBaseAmount,
        expectedQuoteAmount: action.expectedQuoteAmount,
        isOwnOrder: action.isOwnOrder,
      },
    };
  }

  return {
    id: `exec:${action.id}`,
    kind: 'create-order',
    args: action.args,
    description: action.reason,
    idempotencyKey: action.id,
  };
}

export function mergeRecords(records: ExecutionRecord[], next: ExecutionRecord): ExecutionRecord[] {
  const existing = records.find((record) => record.idempotencyKey === next.idempotencyKey);
  if (existing) {
    return records;
  }

  return [next, ...records];
}

async function buildTransaction(
  client: Client,
  request: ExecutionRequest,
  availableUtxos: WalletUtxo[],
): Promise<BuiltTransaction> {
  const opts: TransactionOpts = { withUTXO: availableUtxos };

  if (request.kind === 'create-order') {
    return (await client.buildCreateOrder(request.args, opts)) as unknown as BuiltTransaction;
  }

  if (request.kind === 'conclude-order') {
    return (await client.buildConcludeOrder({ order_id: request.orderId }, opts)) as unknown as BuiltTransaction;
  }

  if (request.kind === 'fill-order') {
    return (await client.buildFillOrder({
      order_id: request.orderId,
      amount: request.amount,
      destination: request.destination,
    }, opts)) as unknown as BuiltTransaction;
  }

  if (request.tokenId) {
    return (await client.buildTransfer({ to: request.to, amount: request.amount, token_id: request.tokenId }, opts)) as unknown as BuiltTransaction;
  }

  return (await client.buildTransfer({ to: request.to, amount: request.amount }, opts)) as unknown as BuiltTransaction;
}

export async function executeRequest(args: {
  client: Client;
  walletState: WalletState;
  request: ExecutionRequest;
  config: MarketMakerConfig;
  broadcast: boolean;
  availableUtxos: WalletUtxo[];
  tradeMeta?: ExecutionRecord['tradeMeta'];
}): Promise<ExecutionRecord> {
  const { client, walletState, request, config, broadcast, tradeMeta, availableUtxos } = args;
  const record = createRecord(request);

  if (config.network === 'mainnet' && !config.allowMainnetBroadcast && broadcast) {
    return {
      ...record,
      status: 'rejected',
      updatedAt: now(),
      error: 'Mainnet broadcasting is blocked by VITE_ALLOW_MAINNET_BROADCAST=false.',
    };
  }

  try {
    const tx = await buildTransaction(client, request, availableUtxos);
    const signedHex = await (client as unknown as { signTransaction(tx: BuiltTransaction): Promise<string> }).signTransaction(tx);
    const txJson = getTxJson(tx);
    await walletState.applyLocalTx(tx);

    const signedRecord: ExecutionRecord = {
      ...record,
      status: broadcast ? 'local' : 'signed',
      updatedAt: now(),
      txId: txJson.id,
      signedHex,
      tradeMeta,
    };

    if (!broadcast) {
      return signedRecord;
    }

    try {
      const broadcastResponse = await client.broadcastTx(signedHex);
      await walletState.applyMempoolTx(tx);
      return {
        ...signedRecord,
        status: 'broadcasted',
        updatedAt: now(),
        broadcastResponse,
      };
    } catch (error) {
      await walletState.markBroadcastRejected(txJson.id, {
        reason: error instanceof Error ? error.message : String(error),
        rebuildRequired: true,
      });
      return {
        ...signedRecord,
        status: 'rejected',
        updatedAt: now(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  } catch (error) {
    return {
      ...record,
      status: 'rejected',
      updatedAt: now(),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
