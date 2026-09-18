import { Client } from '../src/mintlayer-connect-sdk';
import fetchMock from 'jest-fetch-mock';

import {
  MOCK_TOKEN,
  MOCK_TOKEN_11_DECIMALS,
  MOCK_TOKEN_11_DECIMALS_ID,
  MOCK_TOKEN_ID,
  setupApiMocks,
} from './helpers/api-mocks';

import { pool_01 } from './__mocks__/pools/pool_01';

/**
 * Well-formed but unknown pool id: `validateRawId` rejects malformed ids
 * (underscores etc.) BEFORE the fetch, so this fixture preserves the test's
 * intent — unknown pool → 'Failed to fetch delegation id'.
 */
const UNKNOWN_POOL_ID = 'tpool1wrongpoolid000000000000000000000000000000000000000000qqqqqqqqqq';

let mocks: ReturnType<typeof setupApiMocks>;

beforeEach(() => {
  mocks = setupApiMocks({
    tokens: {
      [MOCK_TOKEN_ID]: MOCK_TOKEN,
      [MOCK_TOKEN_11_DECIMALS_ID]: MOCK_TOKEN_11_DECIMALS,
    },
  });

  fetchMock.mockResponse(async req => {
    const url = req.url;

    if (url.includes('/pool/')) {
      const poolId = url.split('/pool/')[1].split('/delegations')[0];
      if(poolId === 'tpool1tl784md209n53kuuwqxu68zav5lu5pdg8ca7kuhs6jg5lw24827q6qgxkc') {
        return JSON.stringify([
          {
            "balance": {
              "atoms": "0",
              "decimal": "0"
            },
            "creation_block_height": 195930,
            "delegation_id": "tdelg1d57nmkp24k0rh0fgsjnjy78wxql8wvgr420ncdsesvssvdgfcg6sx6262w",
            "next_nonce": 0,
            "spend_destination": "tmt1q86huq7e03hmk6wj8sf7hezqgnshhtwy6s8gz3ur"
          }
        ]);
      }
      if(poolId === 'tpool1tl784md209n53kuuwqxu68zav5lu5pdg8ca7kuhs6jg5lw24827q6qgxka') {
        return JSON.stringify([
          {
            "balance": {
              "atoms": "0",
              "decimal": "0"
            },
            "creation_block_height": 195930,
            "delegation_id": "tdelg1d57nmkp24k0rh0fgsjnjy78wxql8wvgr420ncdsesvssvdgfcg6sx6262w",
            "next_nonce": 0,
            "spend_destination": "tmt1q86huq7e03hmk6wj8sf7hezqgnshhtwy6s8gz3ut" // not belonging to the user
          }
        ]);
      }
      if(poolId === UNKNOWN_POOL_ID) {
        return {
          body: JSON.stringify(JSON.stringify({"error":"Invalid pool Id"})),
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        };
      }
    }

    if (url.includes('/delegation/')) {
      const delegationId = url.split('/delegation/').pop();
      if(delegationId === 'tdelg1d57nmkp24k0rh0fgsjnjy78wxql8wvgr420ncdsesvssvdgfcg6sx6262w') {
        return JSON.stringify({
          "balance": {
            "atoms": "0",
            "decimal": "0"
          },
          "creation_block_height": 195930,
          "next_nonce": 0,
          "pool_id": "tpool1tl784md209n53kuuwqxu68zav5lu5pdg8ca7kuhs6jg5lw24827q6qgxkc",
          "spend_destination": "tmt1q86huq7e03hmk6wj8sf7hezqgnshhtwy6s8gz3ur"
        })
      }
    }

    return mocks.defaultRouter(req);
  });
});

test('create delegation - snapshot', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.delegationCreate({
    pool_id: 'tpool1dwpe7zy0mhagnwl36ywt5q20xxvu5dwmph4z6q8sc0a3srz5h8jqr0r2yg',
    destination: 'tmt1qyrjfd5e3nref7zga24jcthffahjwyg3csxu3xgc',
  });

  const result = await spy.mock.results[0]?.value;

  expect(result).toMatchSnapshot();
  spy.mockRestore();
});

test('delegate staking - snaphsot', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.delegationStake({
    delegation_id: 'tdelg1d57nmkp24k0rh0fgsjnjy78wxql8wvgr420ncdsesvssvdgfcg6sx6262w',
    amount: 10,
  });

  const result = await spy.mock.results[0]?.value;

  expect(result).toMatchSnapshot();
  spy.mockRestore();
})

test('delegate staking providing only pool_id - snapshot', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.delegationStake({
    pool_id: 'tpool1tl784md209n53kuuwqxu68zav5lu5pdg8ca7kuhs6jg5lw24827q6qgxkc',
    amount: 10,
  });

  const result = await spy.mock.results[0]?.value;

  expect(result).toMatchSnapshot();
  spy.mockRestore();
})

test('delegate staking providing only wrong pool_id', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  await client.connect();

  await expect(client.delegationStake({
    pool_id: UNKNOWN_POOL_ID,
    amount: 10,
  })).rejects.toThrow('Failed to fetch delegation id')
})

test('delegate staking providing only pool_id user not delegated to', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  await client.connect();

  await expect(client.delegationStake({
    pool_id: 'tpool1tl784md209n53kuuwqxu68zav5lu5pdg8ca7kuhs6jg5lw24827q6qgxka', // pool_id user not delegated to
    amount: 10,
  })).rejects.toThrow('No delegation id found for the given pool id')
})

test('staking withdraw - snapshot', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.delegationWithdraw({
    delegation_id: 'tdelg1d57nmkp24k0rh0fgsjnjy78wxql8wvgr420ncdsesvssvdgfcg6sx6262w',
    amount: 10,
  });

  const result = await spy.mock.results[0]?.value;

  expect(result).toMatchSnapshot();
  spy.mockRestore();
})
