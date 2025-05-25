import { Client } from '../src/mintlayer-connect-sdk';
import fetchMock from 'jest-fetch-mock';

import { addresses, utxos } from './__mocks__/accounts/account_01'
import { pool_01 } from './__mocks__/pools/pool_01';

beforeEach(() => {
  fetchMock.resetMocks();

  // эмуляция window.mojito
  (window as any).mojito = {
    isExtension: true,
    connect: jest.fn().mockResolvedValue(addresses),
    restore: jest.fn().mockResolvedValue(addresses),
    disconnect: jest.fn().mockResolvedValue(undefined),
    request: jest.fn().mockResolvedValue('signed-transaction'),
  };

  fetchMock.doMock();

  fetchMock.mockResponse(async req => {
    const url = req.url;

    if (url.endsWith('/chain/tip')) {
      return JSON.stringify({ height: 200000 });
    }

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
      if(poolId === 'wrong_pool_id') {
        return {
          body: JSON.stringify(JSON.stringify({"error":"Invalid pool Id"})),
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        };
      }
    }

    if (url.includes('/token/')) {
      const tokenId = url.split('/token/').pop();
      if (tokenId === 'tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq') {
        return JSON.stringify({
          "authority": "tmt1qyjlh9w9t7qwx7cawlqz6rqwapflsvm3dulgmxyx",
          "circulating_supply": {
            "atoms": "209000000000",
            "decimal": "2090"
          },
          "frozen": false,
          "is_locked": false,
          "is_token_freezable": true,
          "is_token_unfreezable": null,
          "metadata_uri": {
            "hex": "697066733a2f2f516d4578616d706c6548617368313233",
            "string": "ipfs://QmExampleHash123"
          },
          "next_nonce": 7,
          "number_of_decimals": 8,
          "token_ticker": {
            "hex": "58595a32",
            "string": "XYZ2"
          },
          "total_supply": {
            "Fixed": {
              "atoms": "100000000000000"
            }
          }
        });
      }
      if (tokenId === 'tmltk17jgtcm3gc8fne3su8s96gwj0yw8k2khx3fglfe8mz72jhygemgnqm57l7l') {
        return JSON.stringify({
          "authority": "tmt1qyjlh9w9t7qwx7cawlqz6rqwapflsvm3dulgmxyx",
          "circulating_supply": {
            "atoms": "209000000000",
            "decimal": "2090"
          },
          "frozen": false,
          "is_locked": false,
          "is_token_freezable": true,
          "is_token_unfreezable": null,
          "metadata_uri": {
            "hex": "697066733a2f2f516d4578616d706c6548617368313233",
            "string": "ipfs://QmExampleHash123"
          },
          "next_nonce": 7,
          "number_of_decimals": 11,
          "token_ticker": {
            "hex": "58595a32",
            "string": "XYZ2"
          },
          "total_supply": {
            "Fixed": {
              "atoms": "100000000000000"
            }
          }
        });
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

    if(url.endsWith('/account')) {
      return {
        body: JSON.stringify({
          utxos: utxos,
        }),
      };
    }

    console.warn('No mock for:', url);
    return JSON.stringify({ error: 'No mock defined' });
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
    pool_id: 'wrong_pool_id',
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
