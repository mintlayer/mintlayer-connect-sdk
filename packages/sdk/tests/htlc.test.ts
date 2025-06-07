import { Client } from '../src/mintlayer-connect-sdk';
import fetchMock from 'jest-fetch-mock';

import { addresses, utxos } from './__mocks__/accounts/account_01'

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
      return JSON.stringify({ a: 'b' });
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

test('buildTransaction for transfer - snapshot', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.createHtlc({
    amount: "10",
    spend_address: "tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc",
    refund_address: "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6",
    refund_timelock: {
      type: "UntilTime",
      content: {
        timestamp: '1749239730'
      }
    },
    token_id: null, // null for native token
    // token_id: "tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq",
    secret_hash: "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3",
  });

  const result = await spy.mock.results[0]?.value;

  console.log('result', result);

  console.log(JSON.stringify(result.JSONRepresentation, null, 2));
});

// example of TX: 513932890fb1fee9b21d3004d4292e7eace8753f43d601013d635b8b1195f207
test('buildTransaction for transfer - snapshot 2', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.createHtlc({
    amount: "10",
    spend_address: "tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc",
    refund_address: "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6",
    refund_timelock: {
      type: "ForBlockCount",
      content: "20"
    },
    token_id: null, // null for native token
    // token_id: "tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq",
    secret_hash: "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3", // "test"
  });

  const result = await spy.mock.results[0]?.value;

  console.log('result', result);

  console.log(JSON.stringify(result.JSONRepresentation, null, 2));
});

