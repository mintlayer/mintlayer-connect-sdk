import { Client, MintlayerApiProvider, MnemonicAccountProvider, type ApiProvider } from '@mintlayer/sdk';

import type { MarketMakerConfig } from './types';

const DEFAULT_API_URLS = {
  testnet: 'https://api-server-lovelace.mintlayer.org/api/v2',
  mainnet: 'https://api-server.mintlayer.org/api/v2',
};

const DEFAULT_BATCH_URLS = {
  testnet: 'https://mojito-api.mintlayer.org/mintlayer/testnet/batch',
  mainnet: 'https://mojito-api.mintlayer.org/mintlayer/mainnet/batch',
};

class HeaderApiProvider implements ApiProvider {
  private readonly baseUrl: string;
  private readonly batchUrl: string;
  private readonly headers: HeadersInit;

  constructor(baseUrl: string, batchUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.batchUrl = batchUrl.replace(/\/$/, '');
    this.headers = apiKey ? { Authorization: `Bearer ${apiKey}`, 'X-API-Key': apiKey } : {};
  }

  private async get(path: string): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, { headers: this.headers });
    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${path}`);
    }
    return response.json();
  }

  getChainTip(): Promise<unknown> {
    return this.get('/chain/tip');
  }

  getAddress(addr: string): Promise<unknown> {
    return this.get(`/address/${addr}`);
  }

  getAddressDelegations(addr: string): Promise<unknown> {
    return this.get(`/address/${addr}/delegations`);
  }

  getAddressTokenAuthority(addr: string): Promise<unknown> {
    return this.get(`/address/${addr}/token-authority`);
  }

  getToken(token_id: string): Promise<unknown> {
    return this.get(`/token/${token_id}`);
  }

  getNft(token_id: string): Promise<unknown> {
    return this.get(`/nft/${token_id}`);
  }

  getOrder(order_id: string): Promise<unknown> {
    return this.get(`/order/${order_id}`);
  }

  getOrders(): Promise<unknown> {
    return this.get('/order');
  }

  getPoolDelegations(pool_id: string): Promise<unknown> {
    return this.get(`/pool/${pool_id}/delegations`);
  }

  getDelegation(delegation_id: string): Promise<unknown> {
    return this.get(`/delegation/${delegation_id}`);
  }

  getTransaction(transaction_id: string): Promise<unknown> {
    return this.get(`/transaction/${transaction_id}`);
  }

  async broadcastTransaction(tx: string | { hex: string; json: unknown }): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/transaction`, {
      method: 'POST',
      headers:
        typeof tx === 'string'
          ? { ...this.headers, 'Content-Type': 'text/plain' }
          : { ...this.headers, 'Content-Type': 'application/json' },
      body: typeof tx === 'string' ? tx : JSON.stringify({ transaction: tx.hex, json: tx.json }),
    });

    if (!response.ok) {
      throw new Error(`Broadcast error ${response.status}`);
    }

    return response.json();
  }

  async getAccountUtxos(addresses: string[], network: number): Promise<unknown> {
    const response = await fetch(this.batchUrl, {
      method: 'POST',
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: addresses,
        type: '/address/:address/spendable-utxos',
        network,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch utxos: ${response.status}`);
    }

    const data = await response.json();
    return (data.results ?? []).flat();
  }
}

function createApiProvider(config: MarketMakerConfig): ApiProvider | undefined {
  if (!config.apiUrl && !config.apiKey) {
    return undefined;
  }

  const baseUrl = config.apiUrl ?? DEFAULT_API_URLS[config.network];
  return new HeaderApiProvider(baseUrl, DEFAULT_BATCH_URLS[config.network], config.apiKey);
}

export async function createBotClient(config: MarketMakerConfig): Promise<Client> {
  if (!config.walletSeed) {
    throw new Error('VITE_WALLET_SEED is required for browser mnemonic mode.');
  }

  const accountProvider = new MnemonicAccountProvider(config.walletSeed, config.network, {
    receivingAddressCount: 8,
    changeAddressCount: 8,
  });

  const apiProvider = createApiProvider(config);
  const client = await Client.create({
    network: config.network,
    autoRestore: false,
    accountProvider,
    ...(apiProvider ? { apiProvider } : {}),
  });

  await client.connect();
  return client;
}

export function createDefaultApiProvider(config: MarketMakerConfig): MintlayerApiProvider {
  return new MintlayerApiProvider(DEFAULT_API_URLS[config.network], DEFAULT_BATCH_URLS[config.network]);
}

export function resolveApiBaseUrl(config: MarketMakerConfig): string {
  return (config.apiUrl ?? DEFAULT_API_URLS[config.network]).replace(/\/$/, '');
}
