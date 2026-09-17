import fetchMock from 'jest-fetch-mock';

import { addresses, utxos } from '../__mocks__/accounts/account_01';

export const MOCK_TOKEN_ID = 'tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq';
export const MOCK_TOKEN_AUTHORITY = 'tmt1qyjlh9w9t7qwx7cawlqz6rqwapflsvm3dulgmxyx';

/**
 * Shared token details fixture: authority-owned token with 8 decimals and
 * `next_nonce` 7 (so auto nonces start at 7 and explicit-nonce validation has
 * a known baseline).
 */
export const MOCK_TOKEN = {
  authority: MOCK_TOKEN_AUTHORITY,
  circulating_supply: {
    atoms: '209000000000',
    decimal: '2090',
  },
  frozen: false,
  is_locked: false,
  is_token_freezable: true,
  is_token_unfreezable: null,
  metadata_uri: {
    hex: '697066733a2f2f516d4578616d706c6548617368313233',
    string: 'ipfs://QmExampleHash123',
  },
  next_nonce: 7,
  number_of_decimals: 8,
  token_ticker: {
    hex: '58595a32',
    string: 'XYZ2',
  },
  total_supply: {
    Fixed: {
      atoms: '100000000000000',
    },
  },
};

export interface ApiMockOptions {
  /** Height served by `GET /chain/tip` (default 200000). */
  chainTipHeight?: number;
  /** Token details served per token id by `GET /token/<id>`; defaults to `{ [MOCK_TOKEN_ID]: MOCK_TOKEN }`. */
  tokens?: Record<string, any>;
  /** UTXOs served by the `/batch` endpoint; defaults to the account_01 fixtures. */
  utxos?: any[];
  /** Value resolved by `window.mojito.request` (default 'signed-transaction'). */
  signedResponse?: any;
}

export interface ApiMocks {
  /** The `window.mojito` stub installed for the test — assert on its jest.fn()s. */
  mojito: {
    isExtension: boolean;
    connect: jest.Mock;
    restore: jest.Mock;
    disconnect: jest.Mock;
    request: jest.Mock;
  };
  addresses: any;
  utxos: any[];
  tokens: Record<string, any>;
}

/**
 * Installs the shared API test double used by transaction-building suites:
 * a `fetch` router (chain tip, token details, UTXO batch) plus a
 * `window.mojito` wallet stub. Call it from `beforeEach` for a deterministic,
 * network-free setup; the returned object exposes the stubs for assertions.
 */
export function setupApiMocks(options: ApiMockOptions = {}): ApiMocks {
  const {
    chainTipHeight = 200000,
    tokens = { [MOCK_TOKEN_ID]: MOCK_TOKEN },
    utxos: utxoList = utxos,
    signedResponse = 'signed-transaction',
  } = options;

  const mojito: ApiMocks['mojito'] = {
    isExtension: true,
    connect: jest.fn().mockResolvedValue(addresses),
    restore: jest.fn().mockResolvedValue(addresses),
    disconnect: jest.fn().mockResolvedValue(undefined),
    request: jest.fn().mockResolvedValue(signedResponse),
  };
  (window as any).mojito = mojito;

  fetchMock.resetMocks();
  fetchMock.doMock();

  fetchMock.mockResponse(async req => {
    const url = req.url;

    if (url.endsWith('/chain/tip')) {
      return JSON.stringify({ height: chainTipHeight });
    }

    if (url.includes('/token/')) {
      const tokenId = url.split('/token/').pop()!;
      const details = tokens[tokenId];
      if (details) {
        return JSON.stringify(details);
      }
      return JSON.stringify({ a: 'b' });
    }

    if (url.endsWith('/batch')) {
      return {
        body: JSON.stringify({
          results: [utxoList],
        }),
      };
    }

    console.warn('No mock for:', url);
    return JSON.stringify({ error: 'No mock defined' });
  });

  return { mojito, addresses, utxos: utxoList, tokens };
}
