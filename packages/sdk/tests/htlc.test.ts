import { Client } from '../src/mintlayer-connect-sdk';
import fetchMock from 'jest-fetch-mock';
import { createHash } from 'crypto'

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

    if (url.includes('/transaction/')) {
      const txId = url.split('/transaction/').pop();
      if(txId === '513932890fb1fee9b21d3004d4292e7eace8753f43d601013d635b8b1195f207') {
        return JSON.stringify({
          "block_id": "445e7c4520afd0f1296aebbe87d8547d9025dd99a86e594d178efaefd6db1f6d",
          "confirmations": "913",
          "fee": {
            "atoms": "124900000000",
            "decimal": "1.249"
          },
          "flags": 0,
          "id": "513932890fb1fee9b21d3004d4292e7eace8753f43d601013d635b8b1195f207",
          "inputs": [
            {
              "input": {
                "index": 1,
                "input_type": "UTXO",
                "source_id": "92b08778d6d0345f1f943f83e7969fbcece9629938dddcec94f0b28382a58feb",
                "source_type": "Transaction"
              },
              "utxo": {
                "destination": "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6",
                "type": "Transfer",
                "value": {
                  "amount": {
                    "atoms": "1689595604300000",
                    "decimal": "16895.956043"
                  },
                  "type": "Coin"
                }
              }
            }
          ],
          "is_replaceable": false,
          "outputs": [
            {
              "htlc": {
                "refund_key": "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6",
                "refund_timelock": {
                  "content": 20,
                  "type": "ForBlockCount"
                },
                "secret_hash": {
                  "hex": "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3",
                  "string": null
                },
                "spend_key": "tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc"
              },
              "type": "Htlc",
              "value": {
                "amount": {
                  "atoms": "1000000000000",
                  "decimal": "10"
                },
                "type": "Coin"
              }
            },
            {
              "destination": "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6",
              "type": "Transfer",
              "value": {
                "amount": {
                  "atoms": "1688470704300000",
                  "decimal": "16884.707043"
                },
                "type": "Coin"
              }
            }
          ],
          "timestamp": "1749276116",
          "version_byte": 1
        });
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

  // secret;
  const secret = new Uint8Array([47, 236, 147, 140, 26, 135, 53, 164, 102, 152, 202, 10, 164, 83, 156, 186, 199, 3, 110, 204, 10, 144, 10, 244, 63, 197, 236, 4, 89, 26, 72, 4]);
  const sha256 = createHash('sha256').update(secret).digest();
  const ripemd160 = createHash('ripemd160').update(sha256).digest();

  const secret_hash_hex = Buffer.from(ripemd160).toString('hex');

  console.log('sha256', sha256);
  console.log('ripemd160', ripemd160);
  console.log('secret_hash_hex', secret_hash_hex);

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
    secret_hash: { hex: secret_hash_hex }, // "test"
  });

  const result = await spy.mock.results[0]?.value;

  console.log('result', result);

  console.log(JSON.stringify(result.JSONRepresentation, null, 2));
  expect(result).toMatchSnapshot();
});

test('buildTransaction for htlc refund', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.refundHtlc({
    transaction_id: "513932890fb1fee9b21d3004d4292e7eace8753f43d601013d635b8b1195f207",
  });

  const result = await spy.mock.results[0]?.value;

  console.log('result', result);
  console.log(JSON.stringify(result.JSONRepresentation, null, 2));
  expect(result).toMatchSnapshot();
})
