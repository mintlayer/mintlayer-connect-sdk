import { Client, MnemonicAccountProvider, type ApiProvider, type SyncCursor, type WalletTx } from '@mintlayer/sdk';
import { getPairOrdersPath } from '../src/lib/orders';
import type { MarketMakerConfig, MarketOrder } from '../src/lib/types';
import type { TokenMetadata } from '../src/lib/tokens';
type UtxoEntry = Pick<import('@mintlayer/sdk').WalletUtxo, 'outpoint' | 'utxo'>;
import type { ServerOptions } from './config';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export class BroadcastRejection extends Error {}
// This error describes invalid bytes, so a previous timeout cannot mean those
// same bytes were accepted. Do not use it for conflicts or temporary failures.
export class InvalidTransactionRejection extends BroadcastRejection {}
function checkIntrinsicRejection(message: unknown): void {
  if (typeof message === 'string' && message.includes('Zero amount token transfers are not allowed'))
    throw new InvalidTransactionRejection('Node rejected an invalid zero-amount token transfer');
}
export type TransactionObservation = {
  id: string;
  inputs: unknown[];
  outputs: unknown[];
  confirmations?: string | number;
  confirmation?: string | number;
  block_id?: string;
  block_height?: number;
  timestamp?: number;
  [key: string]: unknown;
};

export class ChainApi implements ApiProvider {
  private acceptedOrderCreations = new Map<string, MarketOrder>();
  constructor(
    readonly options: ServerOptions,
    private readonly fetcher: typeof fetch = fetch,
  ) {}
  async get(path: string): Promise<any> {
    const response = await this.fetcher(`${this.options.apiUrl}${path}`, {
      headers: this.options.apiKey
        ? { Authorization: `Bearer ${this.options.apiKey}`, 'X-API-Key': this.options.apiKey }
        : {},
      signal: AbortSignal.timeout(this.options.requestTimeoutMs),
    });
    if (!response.ok) throw new HttpError(response.status, `Indexer ${response.status}: ${path}`);
    return response.json();
  }
  async all<T>(path: string): Promise<T[]> {
    const items: T[] = [];
    const started = Date.now();
    for (let offset = 0; offset < 100_000; offset += 100) {
      if (Date.now() - started > this.options.staleAfterMs)
        throw new Error(`Order pagination exceeded freshness budget: ${path}`);
      const page = await this.get(`${path}?items=100&offset=${offset}`);
      if (!Array.isArray(page)) throw new Error(`Unexpected paginated response: ${path}`);
      items.push(...page);
      if (page.length < 100) return items;
    }
    throw new Error(`Incomplete order pagination: ${path}`);
  }
  async pairOrders(config: MarketMakerConfig): Promise<MarketOrder[]> {
    const orders = await this.all<MarketOrder>(getPairOrdersPath(config));
    for (const order of orders) this.validateOrder(order);
    return [...new Map(orders.map((order) => [order.order_id, order])).values()];
  }
  validateOrder(order: MarketOrder): void {
    if (!order || typeof order.order_id !== 'string' || typeof order.conclude_destination !== 'string')
      throw new Error('Malformed order response');
    for (const amount of [order.ask_balance, order.give_balance, order.initially_asked, order.initially_given]) {
      if (!amount || typeof amount.atoms !== 'string' || !/^\d+$/.test(amount.atoms))
        throw new Error('Order is missing exact atom amounts');
    }
    if (BigInt(order.initially_asked.atoms!) <= 0n || BigInt(order.initially_given.atoms!) <= 0n)
      throw new Error('Order initial amounts must be positive');
  }
  getChainTip(): Promise<any> {
    return this.get('/chain/tip');
  }
  getAddress(address: string): Promise<any> {
    return this.get(`/address/${address}`);
  }
  getAddressDelegations(address: string): Promise<any> {
    return this.get(`/address/${address}/delegations`);
  }
  getAddressTokenAuthority(address: string): Promise<any> {
    return this.get(`/address/${address}/token-authority`);
  }
  getToken(id: string): Promise<any> {
    return this.get(`/token/${id}`);
  }
  getNft(id: string): Promise<any> {
    return this.get(`/nft/${id}`);
  }
  setAcceptedOrderCreations(orders: MarketOrder[]): void {
    this.acceptedOrderCreations = new Map(orders.map(order => [order.order_id, structuredClone(order)]));
  }
  async getOrder(id: string): Promise<any> {
    try {
      return await this.get(`/order/${id}`);
    } catch (error) {
      // An accepted create can be spent before the indexer publishes its order
      // endpoint. These exact initial amounts/nonce come from our durable tx;
      // the runner supplies only creations independently observed in mempool.
      if (error instanceof HttpError && error.status === 404 && this.acceptedOrderCreations.has(id))
        return structuredClone(this.acceptedOrderCreations.get(id));
      throw error;
    }
  }
  getOrders(): Promise<any> {
    return this.all('/order');
  }
  getPoolDelegations(id: string): Promise<any> {
    return this.get(`/pool/${id}/delegations`);
  }
  getDelegation(id: string): Promise<any> {
    return this.get(`/delegation/${id}`);
  }
  getTransaction(id: string): Promise<any> {
    return this.get(`/transaction/${id}`);
  }
  async transaction(id: string): Promise<TransactionObservation | null> {
    try {
      const tx = await this.getTransaction(id);
      if (!tx || tx.id !== id || !Array.isArray(tx.inputs) || !Array.isArray(tx.outputs))
        throw new Error('Malformed transaction response');
      return tx;
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return null;
      throw error;
    }
  }
  async getAccountUtxos(addresses: string[]): Promise<UtxoEntry[]> {
    const pages = await Promise.all(addresses.map((address) => this.get(`/address/${address}/spendable-utxos`)));
    if (pages.some((page) => !Array.isArray(page))) throw new Error('Malformed UTXO response');
    return [
      ...new Map(
        pages.flat().map((entry) => {
          if (!entry?.outpoint || !entry.utxo || !Number.isInteger(entry.outpoint.index))
            throw new Error('Malformed UTXO entry');
          return [`${entry.outpoint.source_type}:${entry.outpoint.source_id}:${entry.outpoint.index}`, entry];
        }),
      ).values(),
    ] as UtxoEntry[];
  }
  async rpc(method: string, params: unknown[]): Promise<any> {
    if (!this.options.rpcUrl) throw new Error('BOT_RPC_URL is not configured');
    const response = await this.fetcher(this.options.rpcUrl, {
      method: 'POST',
      signal: AbortSignal.timeout(this.options.requestTimeoutMs),
      headers: {
        'Content-Type': 'application/json',
        ...(this.options.rpcUser
          ? {
              Authorization: `Basic ${Buffer.from(`${this.options.rpcUser}:${this.options.rpcPassword ?? ''}`).toString('base64')}`,
            }
          : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    if (!response.ok) throw new HttpError(response.status, `Node RPC ${response.status}: ${method}`);
    const payload = (await response.json()) as any;
    if (payload.error) {
      if (method === 'p2p_submit_transaction') checkIntrinsicRejection(payload.error.message);
      const message = `Node RPC ${method} failed (${payload.error.code})`;
      if (method === 'p2p_submit_transaction' && [-32601, -32602].includes(payload.error.code))
        throw new BroadcastRejection(message);
      throw new Error(message);
    }
    return payload.result;
  }
  async mempool(id: string): Promise<'accepted' | 'orphan' | 'absent' | 'unavailable'> {
    if (!this.options.rpcUrl) return 'unavailable';
    if (await this.rpc('mempool_contains_tx', [id])) return 'accepted';
    if (await this.rpc('mempool_contains_orphan_tx', [id])) return 'orphan';
    return 'absent';
  }
  async hasConfirmedInputConflict(inputs: unknown[], txId: string): Promise<boolean> {
    for (const entry of inputs as any[]) {
      const input = entry?.input;
      if (input?.input_type !== 'UTXO' || input.source_type !== 'Transaction') continue;
      try {
        const output = await this.get(`/transaction/${input.source_id}/output/${input.index}`);
        const height = output.spent_at_block_height;
        if (height === null || height === undefined) continue;
        if (!Number.isSafeInteger(Number(height)) || Number(height) < 0) continue;
        const hash = await this.blockId(Number(height));
        const block = await this.get(`/block/${hash}`);
        const transactions = block.body?.transactions;
        // A spent input alone is not a conflict: our own transaction may have
        // mined while its transaction endpoint still lags. Identify the actual
        // different spender in a canonical block before invalidating anything.
        if (!Array.isArray(transactions) || transactions.some(tx => tx.id === txId)) continue;
        const conflict = transactions.some(tx =>
          typeof tx.id === 'string' && /^[0-9a-f]{64}$/i.test(tx.id) &&
          Array.isArray(tx.inputs) && tx.inputs.some((entry: any) =>
            entry.input?.input_type === 'UTXO' && entry.input.source_type === input.source_type &&
            entry.input.source_id === input.source_id && entry.input.index === input.index,
          ),
        );
        if (conflict && await this.blockId(Number(height)) === hash) return true;
      } catch (error) {
        // Older public deployments do not implement this endpoint. Neither
        // absence nor an unsupported endpoint proves a spend or a rejection.
        if (!(error instanceof HttpError) || ![400, 404].includes(error.status)) throw error;
      }
    }
    return false;
  }
  async broadcastTransaction(tx: string | { hex: string; json: unknown }): Promise<unknown> {
    const hex = typeof tx === 'string' ? tx : tx.hex;
    if (this.options.rpcUrl) return this.rpc('p2p_submit_transaction', [hex, { trust_policy: 'Untrusted' }]);
    const response = await this.fetcher(`${this.options.apiUrl}/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        ...(this.options.apiKey
          ? { Authorization: `Bearer ${this.options.apiKey}`, 'X-API-Key': this.options.apiKey }
          : {}),
      },
      body: hex,
      signal: AbortSignal.timeout(this.options.requestTimeoutMs),
    });
    if (!response.ok) {
      // The public indexer wraps node validation errors in HTTP 500. Only a
      // specific invariant failure proves that durable bytes cannot be mined.
      const payload = await response.json().catch(() => null) as any;
      checkIntrinsicRejection(payload?.error);
      if ([400, 401, 403, 404, 405, 413, 415, 422].includes(response.status))
        throw new BroadcastRejection(`Broadcast rejected with HTTP ${response.status}`);
      throw new HttpError(response.status, `Broadcast returned HTTP ${response.status}; reconciliation required`);
    }
    // Some nodes return an empty body after accepting. HTTP success is enough.
    return { accepted: true };
  }
  async tip(): Promise<SyncCursor> {
    const raw = await this.getChainTip();
    const height = Number(raw.block_height ?? raw.height);
    const blockHash = raw.block_id ?? raw.block_hash;
    if (
      !Number.isSafeInteger(height) ||
      height < 0 ||
      typeof blockHash !== 'string' ||
      !/^[0-9a-f]{64}$/i.test(blockHash)
    )
      throw new Error('Malformed chain tip');
    return { height, blockHash, updatedAt: Date.now() };
  }
  async blockId(height: number): Promise<string> {
    const result = await this.get(`/chain/${height}`);
    const id = typeof result === 'string' ? result : result.block_id;
    if (typeof id !== 'string' || !/^[0-9a-f]{64}$/i.test(id)) throw new Error('Malformed block ID');
    return id;
  }
  async verifyNode(tip: SyncCursor): Promise<void> {
    if (!this.options.rpcUrl) return;
    const [indexerGenesis, nodeGenesis, nodeTip] = await Promise.all([
      this.blockId(0),
      this.rpc('chainstate_block_id_at_height', [0]),
      this.rpc('chainstate_block_id_at_height', [tip.height]),
    ]);
    if (indexerGenesis !== nodeGenesis || tip.blockHash !== nodeTip)
      throw new Error('Node and indexer are on different chains or tips');
    const height = Number(await this.rpc('chainstate_best_block_height', []));
    if (!Number.isSafeInteger(height) || height - tip.height > 3 || height < tip.height)
      throw new Error('Indexer is too far behind the broadcast node');
  }
  async observe(tx: TransactionObservation, tip: SyncCursor, createdByWallet = false): Promise<WalletTx> {
    const confirmed = typeof tx.block_id === 'string';
    let blockHeight: number | undefined;
    if (confirmed) {
      const block = await this.get(`/block/${tx.block_id}`);
      blockHeight = Number(block.height ?? block.block_height);
      if (!Number.isSafeInteger(blockHeight) || blockHeight < 0 || blockHeight > tip.height)
        throw new Error('Cannot establish transaction block height');
      if ((await this.blockId(blockHeight)) !== tx.block_id)
        throw new Error('Transaction is not in the canonical chain');
    } else if (Number(tx.confirmations ?? tx.confirmation) >= 0) {
      throw new Error('Transaction reports confirmation without a block ID');
    }
    return {
      txId: tx.id,
      tx: { id: tx.id, inputs: tx.inputs, outputs: tx.outputs },
      state: confirmed ? 'confirmed' : 'mempool',
      blockHeight,
      blockHash: confirmed ? tx.block_id : undefined,
      timestamp: tx.timestamp,
      createdByWallet,
    };
  }
  async metadata(id: string): Promise<TokenMetadata> {
    if (id === 'Coin')
      return { tokenId: id, ticker: this.options.config.network === 'testnet' ? 'TML' : 'ML', decimals: 11 };
    const token = await this.getToken(id);
    if (!Number.isInteger(token.number_of_decimals) || token.number_of_decimals < 0 || token.number_of_decimals > 18)
      throw new Error(`Missing or invalid decimals for ${id}`);
    return { tokenId: id, ticker: token.token_ticker?.string ?? id, decimals: token.number_of_decimals };
  }
}
export async function createClient(options: ServerOptions, api: ChainApi): Promise<Client> {
  if (!options.walletSeed) throw new Error('BOT_WALLET_SEED is required on the server');
  const client = await Client.create({
    network: options.config.network,
    autoRestore: false,
    apiProvider: api,
    accountProvider: new MnemonicAccountProvider(options.walletSeed, options.config.network, {
      receivingAddressCount: 8,
      changeAddressCount: 8,
    }),
  });
  await client.connect();
  return client;
}
