import fetchMock, { MockResponseInitFunction } from 'jest-fetch-mock';

import { addresses, utxos } from '../__mocks__/accounts/account_01';

export const MOCK_TOKEN_ID = 'tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq';

/**
 * Id of the secondary shared token fixture — identical to `MOCK_TOKEN` but
 * with 11 decimals. Several suites mock both decimals variants.
 */
export const MOCK_TOKEN_11_DECIMALS_ID = 'tmltk17jgtcm3gc8fne3su8s96gwj0yw8k2khx3fglfe8mz72jhygemgnqm57l7l';
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

/** `MOCK_TOKEN` with 11 decimals (key order preserved for snapshot parity). */
export const MOCK_TOKEN_11_DECIMALS = { ...MOCK_TOKEN, number_of_decimals: 11 };

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
  /**
   * The shared routing rules (chain tip, token details, UTXO batch). Suites
   * with extra endpoints register their own `fetchMock.mockResponse` router
   * (the last registration wins) and delegate all unmatched URLs to this
   * function.
   */
  defaultRouter: MockResponseInitFunction;
}

/** The shared fetch routing rules shared by transaction-building suites. */
function createDefaultRouter(options: {
  chainTipHeight: number;
  tokens: Record<string, any>;
  utxoList: any[];
}): MockResponseInitFunction {
  return async req => {
    const url = req.url;

    if (url.endsWith('/chain/tip')) {
      return JSON.stringify({ height: options.chainTipHeight });
    }

    if (url.includes('/token/')) {
      const tokenId = url.split('/token/').pop()!;
      const details = options.tokens[tokenId];
      if (details) {
        return JSON.stringify(details);
      }
      return JSON.stringify({ a: 'b' });
    }

    if (url.endsWith('/batch')) {
      return {
        body: JSON.stringify({
          results: [options.utxoList],
        }),
      };
    }

    console.warn('No mock for:', url);
    return JSON.stringify({ error: 'No mock defined' });
  };
}

/**
 * Installs the shared API test double used by transaction-building suites:
 * a `fetch` router (chain tip, token details, UTXO batch) plus a
 * `window.mojito` wallet stub. Call it from `beforeEach` for a deterministic,
 * network-free setup; the returned object exposes the stubs for assertions.
 *
 * Note: `fetchMock.mockResponse` replaces the previously registered router,
 * so a suite needing extra endpoints must register its own router AFTER this
 * call and delegate unmatched URLs to the returned `defaultRouter`.
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

  const defaultRouter = createDefaultRouter({ chainTipHeight, tokens, utxoList });

  fetchMock.mockResponse(defaultRouter);

  return { mojito, addresses, utxos: utxoList, tokens, defaultRouter };
}
