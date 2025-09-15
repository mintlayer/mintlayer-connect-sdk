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
      if(txId === '5a6752ae5d4da45c9f163d0f1b24aed13e3fda88b11742469b202b37f7b9e38f') {
        return JSON.stringify({
          "block_id": "abe6ebe0f1b51f9c404348d0e9fb2a3ef1dadfdb67ad7644ca940aebe392c7d4",
          "confirmations": "12",
          "fee": {
            "atoms": "134500000000",
            "decimal": "1.345"
          },
          "flags": 0,
          "id": "5a6752ae5d4da45c9f163d0f1b24aed13e3fda88b11742469b202b37f7b9e38f",
          "inputs": [
            {
              "input": {
                "index": 0,
                "input_type": "UTXO",
                "source_id": "408a1e5a8c59ed10ffc6a55244f29e465b692223ef6e6ef05b03a3a4b6010507",
                "source_type": "Transaction"
              },
              "utxo": {
                "htlc": {
                  "refund_key": "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6",
                  "refund_timelock": {
                    "content": 20,
                    "type": "ForBlockCount"
                  },
                  "secret_hash": {
                    "hex": "d5777dbd9541baea8a562381387323773b18e0f6",
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
              }
            },
            {
              "input": {
                "index": 0,
                "input_type": "UTXO",
                "source_id": "e4e82208a042b4c30be2d3f49ef880cd5393345d25a87de096cebf96b90751ae",
                "source_type": "Transaction"
              },
              "utxo": {
                "destination": "tmt1qyrjfd5e3nref7zga24jcthffahjwyg3csxu3xgc",
                "type": "Transfer",
                "value": {
                  "amount": {
                    "atoms": "1000000000000",
                    "decimal": "10"
                  },
                  "type": "Coin"
                }
              }
            }
          ],
          "is_replaceable": false,
          "outputs": [
            {
              "destination": "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6",
              "type": "Transfer",
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
                  "atoms": "865500000000",
                  "decimal": "8.655"
                },
                "type": "Coin"
              }
            }
          ],
          "timestamp": "1749419790",
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
      if (tokenId === 'tmltk18wg2xa7qxflwmcjpcd7nepsrsjj0gcrqyc7k5ej4cq5q3lf7ry7qtm2l6z') {
        return JSON.stringify({
          "authority": "tmt1q9874wgx6enm2mzfu0yxhzleu84pp00l95l7er5z",
          "circulating_supply": {
            "atoms": "1000000000000000",
            "decimal": "10000"
          },
          "frozen": false,
          "is_locked": false,
          "is_token_freezable": false,
          "is_token_unfreezable": null,
          "metadata_uri": {
            "hex": "697066733a2f2f6261667962656965706a746a34653271736b7a7561366763777173767267633362377164363777326d757132687a716333766f67656c666b7377652f746f6b656e5f6d657461646174612e6a736f6e",
            "string": "ipfs://bafybeiepjtj4e2qskzua6gcwqsvrgc3b7qd67w2muq2hzqc3vogelfkswe/token_metadata.json"
          },
          "next_nonce": 1,
          "number_of_decimals": 11,
          "token_ticker": {
            "hex": "485547",
            "string": "HUG"
          },
          "total_supply": {
            "Fixed": {
              "atoms": "100000000000000000"
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

test('buildTransaction for transfer htlc - snapshot', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.createHtlc({
    amount: 10,
    spend_address: "tmt1q9874wgx6enm2mzfu0yxhzleu84pp00l95l7er5z",
    spend_pubkey: "0002aac655156131ce3a06eab9f0a38f43df1b1c1f25f4944bae262ed614fd52d4c6",
    refund_address: "tmt1q9r4gz3aevjm38yq8ycd6gl3kqd25xh4jqzjthdc",
    refund_timelock: {
      type: "ForBlockCount",
      content: 6
    },
    token_id: 'tmltk18wg2xa7qxflwmcjpcd7nepsrsjj0gcrqyc7k5ej4cq5q3lf7ry7qtm2l6z', // null for native token
    // @ts-ignore
    secret_hash: { hex: '0000000000000000000000000000000000000000' },
  });

  const result = await spy.mock.results[0]?.value;

  console.log('result', result);

  console.log(JSON.stringify(result.JSONRepresentation, null, 2));
});

// example of TX: 513932890fb1fee9b21d3004d4292e7eace8753f43d601013d635b8b1195f207
// test('buildTransaction for htlc transfer - snapshot 2', async () => {
//   const client = await Client.create({ network: 'testnet', autoRestore: false });
//
//   const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');
//
//   await client.connect();
//
//   // secret;
//   const secret = new Uint8Array([47, 236, 147, 140, 26, 135, 53, 164, 102, 152, 202, 10, 164, 83, 156, 186, 199, 3, 110, 204, 10, 144, 10, 244, 63, 197, 236, 4, 89, 26, 72, 4]);
//   const sha256 = createHash('sha256').update(secret).digest();
//   const ripemd160 = createHash('ripemd160').update(sha256).digest();
//
//   const secret_hash_hex = Buffer.from(ripemd160).toString('hex');
//
//   console.log('sha256', sha256);
//   console.log('ripemd160', ripemd160);
//   console.log('secret_hash_hex', secret_hash_hex);
//
//   await client.createHtlc({
//     amount: "10",
//     spend_address: "tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc",
//     refund_address: "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6",
//     refund_timelock: {
//       type: "ForBlockCount",
//       content: "20"
//     },
//     token_id: null, // null for native token
//     // token_id: "tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq",
//     secret_hash: { hex: secret_hash_hex }, // "test"
//   });
//
//   const result = await spy.mock.results[0]?.value;
//
//   console.log('result', result);
//
//   console.log(JSON.stringify(result.JSONRepresentation, null, 2));
//   expect(result).toMatchSnapshot();
// });

// test('buildTransaction for htlc refund', async () => {
//   const client = await Client.create({ network: 'testnet', autoRestore: false });
//
//   const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');
//
//   await client.connect();
//
//   await client.refundHtlc({
//     transaction_id: "513932890fb1fee9b21d3004d4292e7eace8753f43d601013d635b8b1195f207",
//   });
//
//   const result = await spy.mock.results[0]?.value;
//
//   console.log('result', result);
//   console.log(JSON.stringify(result.JSONRepresentation, null, 2));
//   expect(result).toMatchSnapshot();
// })

test('extract Htlc from transaction', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  await client.connect();

  const secret = await client.extractHtlcSecret({
    transaction_id: "5a6752ae5d4da45c9f163d0f1b24aed13e3fda88b11742469b202b37f7b9e38f",
    transaction_hex: "0100080000408a1e5a8c59ed10ffc6a55244f29e465b692223ef6e6ef05b03a3a4b6010507000000000000e4e82208a042b4c30be2d3f49ef880cd5393345d25a87de096cebf96b90751ae00000000080000070010a5d4e80186ec450457d09ad9807393d89cec9c71d620602100000700efd183c90186ec450457d09ad9807393d89cec9c71d62060210801011902002fec938c1a8735a46698ca0aa4539cbac7036ecc0a900af43fc5ec04591a48048d01000263e8a1cbb56634ef88997b93fed52b3420fcc7d169954b67def9dce82b549953007ff174e51f07617fe6a6d4eda904999a4468d464b9a82df43bf5fac01dd73241fc8f6ca2822050d61591d04aa4bdc3c484d222882ec5dca2b02738b87b5a3dbc01018d010003b8b4a52ce4957f998479c5e881133648b95fc4b0c54bd58c7d32d37c4d0f235a007765bf6b6b50d44dca4bba8e95c40d610d1130535c22a4f50f3cd9d9b432938d436348180153aaf905a6d8b330e428c8d0d92402bb3cfbd21da02eacd426ad9b",
  });

  const secret_original = new Uint8Array([47, 236, 147, 140, 26, 135, 53, 164, 102, 152, 202, 10, 164, 83, 156, 186, 199, 3, 110, 204, 10, 144, 10, 244, 63, 197, 236, 4, 89, 26, 72, 4]);

  expect(Array.from(secret)).toEqual(Array.from(secret_original));
});
