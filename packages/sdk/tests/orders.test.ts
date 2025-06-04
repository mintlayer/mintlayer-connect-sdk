import { Client } from '../src/mintlayer-connect-sdk';
import fetchMock from 'jest-fetch-mock';

import { addresses, utxos } from './__mocks__/accounts/account_01'

let spy: jest.SpyInstance;

beforeEach(() => {
  fetchMock.resetMocks();

  spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

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
      if (tokenId === 'tmltk16yw5sdh3x3ryxu83w50jzs462ttp4au0j2tff6vztt0nyfve892q7ggcsg') {
        return JSON.stringify({
          "authority": "tmt1q9w0srpalrz5t3ep54tjq774cf09p6683sqtqsxl",
          "circulating_supply": {
            "atoms": "10000000000",
            "decimal": "10000"
          },
          "frozen": false,
          "is_locked": false,
          "is_token_freezable": true,
          "is_token_unfreezable": null,
          "metadata_uri": {
            "hex": "697066733a2f2f6261666b726569636f6166727062627077643265353235677a6d776972706a796a6c6961626e776b61766832627a65746e6f6f7373666377767534",
            "string": "ipfs://bafkreicoafrpbbpwd2e525gzmwirpjyjliabnwkavh2bzetnoossfcwvu4"
          },
          "next_nonce": 1,
          "number_of_decimals": 6,
          "token_ticker": {
            "hex": "4a757374546f6b656e",
            "string": "JustToken"
          },
          "total_supply": "Unlimited"
        });
      }
      return JSON.stringify({ a: 'b' });
    }

    if(url.includes('/order/')) {
      const orderId = req.url.split('/order/').pop();

      if (orderId === 'tordr1thu5ykcdl0uj30g97wqkam7kart50lgzaq60edh8nq6zrn366lmql50gnu') {
        return {
          body: JSON.stringify({
            "ask_balance": {
              "atoms": "1000000000000",
              "decimal": "10"
            },
            "ask_currency": {
              "type": "Coin"
            },
            "conclude_destination": "tmt1qxf50ffxunjw557a9zf2et0vywkwjszyxyppa0py",
            "give_balance": {
              "atoms": "10000000000000",
              "decimal": "100"
            },
            "give_currency": {
              "token_id": "tmltk17jgtcm3gc8fne3su8s96gwj0yw8k2khx3fglfe8mz72jhygemgnqm57l7l",
              "type": "Token"
            },
            "initially_asked": {
              "atoms": "1000000000000",
              "decimal": "10"
            },
            "initially_given": {
              "atoms": "10000000000000",
              "decimal": "100"
            },
            "nonce": 0,
            "order_id": "tordr1thu5ykcdl0uj30g97wqkam7kart50lgzaq60edh8nq6zrn366lmql50gnu"
          }),
        };
      }

      if (orderId === 'tordr1fkrac7mpjc4sgseufyasm472fgfgxl2c775ap20y5779vf8u40yqqq2dlf') {
        return {
          body: JSON.stringify({
            "ask_balance": {
              "atoms": "10000000000",
              "decimal": "0.1"
            },
            "ask_currency": {
              "type": "Coin"
            },
            "conclude_destination": "tmt1q9w0srpalrz5t3ep54tjq774cf09p6683sqtqsxl",
            "give_balance": {
              "atoms": "100000000",
              "decimal": "100"
            },
            "give_currency": {
              "token_id": "tmltk16yw5sdh3x3ryxu83w50jzs462ttp4au0j2tff6vztt0nyfve892q7ggcsg",
              "type": "Token"
            },
            "initially_asked": {
              "atoms": "10000000000",
              "decimal": "0.1"
            },
            "initially_given": {
              "atoms": "100000000",
              "decimal": "100"
            },
            "nonce": 0,
            "order_id": "tordr1fkrac7mpjc4sgseufyasm472fgfgxl2c775ap20y5779vf8u40yqqq2dlf"
          }),
        };
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

afterEach(() => {
  spy?.mockRestore();
});

test('create order - snapshot', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  await client.connect();

  await client.createOrder({
    ask_amount: 10,
    ask_token: 'Coin',
    give_amount: 100,
    give_token: 'tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq',
    conclude_destination: 'tmt1q9874wgx6enm2mzfu0yxhzleu84pp00l95l7er5z',
  });

  const result = await spy.mock.results[0]?.value;

  expect(result).toMatchSnapshot();
});

// replay similar tx: https://lovelace.explorer.mintlayer.org/tx/0b9844f148f6ce71f0ec3741b9ed40ba1a709f1bdf2dc3144ff31d7b49c9be07
test('fill order', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  await client.connect();

  await client.fillOrder({
    order_id: 'tordr1thu5ykcdl0uj30g97wqkam7kart50lgzaq60edh8nq6zrn366lmql50gnu',
    amount: 10,
    destination: 'tmt1q8kfn6vl835y4tj5yfsdvz7ay5cjnvhv952wftmt',
  });

  const result = await spy.mock.results[0]?.value;

  expect(result.JSONRepresentation).toStrictEqual({
    "fee": {
      "atoms": "40400000000",
      "decimal": "0.404",
    },
    "id": "ee22e819eba9b30b3b3ecd21322b566d41973d346a922eb9a685121554ad3be1",
    "inputs": [
      {
        "input": {
          "input_type": "AccountCommand",
          "command": "FillOrder",
          "order_id": "tordr1thu5ykcdl0uj30g97wqkam7kart50lgzaq60edh8nq6zrn366lmql50gnu",
          "fill_atoms": "1000000000000",
          "destination": "tmt1q8kfn6vl835y4tj5yfsdvz7ay5cjnvhv952wftmt",
          "nonce": "0"
        },
        "utxo": null
      },
      {
        "input": {
          "index": 1,
          "source_id": "af3b5fad20f6f97eb210934e942176f7f7d0f70423590659ee0e0217053a7cab",
          "source_type": "Transaction",
          "input_type": "UTXO"
        },
        "utxo": {
          "destination": "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6",
          "type": "Transfer",
          "value": {
            "amount": {
              "atoms": "1703205604300000",
              "decimal": "17032.056043"
            },
            "type": "Coin"
          }
        }
      }
    ],
    "outputs": [
      {
        "type": "Transfer",
        "value": {
          "type": "TokenV1",
          "token_id": "tmltk17jgtcm3gc8fne3su8s96gwj0yw8k2khx3fglfe8mz72jhygemgnqm57l7l",
          "amount": {
            "atoms": "10000000000000",
            "decimal": "100"
          }
        },
        "destination": "tmt1q8kfn6vl835y4tj5yfsdvz7ay5cjnvhv952wftmt"
      },
      {
        "type": "Transfer",
        "value": {
          "type": "Coin",
          "amount": {
            "atoms": "1702165204300000",
            "decimal": "17021.652043"
          }
        },
        "destination": "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6"
      }
    ]
  })
});

test('fill order that fail on call', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  await client.connect();

  await client.fillOrder({
    order_id: 'tordr1fkrac7mpjc4sgseufyasm472fgfgxl2c775ap20y5779vf8u40yqqq2dlf',
    amount: 0.01,
    destination: 'tmt1q9l0g4kd3s6x5rmesaznegz06pw9hxu6qvqu3pa7',
  });

  const result = await spy.mock.results[0]?.value;

  console.log(JSON.stringify(result, null, 2));

  expect(result.JSONRepresentation.fee.decimal).toBe('0.399');
});

// replay similar tx: https://lovelace.explorer.mintlayer.org/tx/a3a822f5e9099075e07234f435a2cda80cb6e88836331238b882da785973d7ac
test('conclude order - snapshot', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  fetchMock.mockResponseOnce(async req => {
    const url = req.url;

    if(url.includes('/order/')) {
      const orderId = req.url.split('/order/').pop();

      if (orderId === 'tordr1thu5ykcdl0uj30g97wqkam7kart50lgzaq60edh8nq6zrn366lmql50gnu') {
        return {
          body: JSON.stringify({
            "ask_balance": {
              "atoms": "100000000000",
              "decimal": "1"
            },
            "ask_currency": {
              "type": "Coin"
            },
            "conclude_destination": "tmt1qxf50ffxunjw557a9zf2et0vywkwjszyxyppa0py",
            "give_balance": {
              "atoms": "1000000000000",
              "decimal": "10"
            },
            "give_currency": {
              "token_id": "tmltk17jgtcm3gc8fne3su8s96gwj0yw8k2khx3fglfe8mz72jhygemgnqm57l7l",
              "type": "Token"
            },
            "initially_asked": {
              "atoms": "1000000000000",
              "decimal": "10"
            },
            "initially_given": {
              "atoms": "10000000000000",
              "decimal": "100"
            },
            "nonce": 1,
            "order_id": "tordr1thu5ykcdl0uj30g97wqkam7kart50lgzaq60edh8nq6zrn366lmql50gnu"
          }),
        };
      }
    }

    console.warn('No mock for:', url);
    return JSON.stringify({ error: 'No mock defined' });
  });

  await client.connect();

  await client.concludeOrder({
    order_id: 'tordr1thu5ykcdl0uj30g97wqkam7kart50lgzaq60edh8nq6zrn366lmql50gnu',
  });

  const result = await spy.mock.results[0]?.value;

  expect(result.JSONRepresentation).toStrictEqual({
    "fee": {
      "atoms": "40500000000",
      "decimal": "0.405",
    },
    "id": "a0e027bed40136528b3c5462b198a7e9781fad6659ab6c0d22b8c2a499148964",
    "inputs": [
      {
        "input": {
          "input_type": "AccountCommand",
          "command": "ConcludeOrder",
          "destination": "tmt1qxf50ffxunjw557a9zf2et0vywkwjszyxyppa0py",
          "order_id": "tordr1thu5ykcdl0uj30g97wqkam7kart50lgzaq60edh8nq6zrn366lmql50gnu",
          "nonce": 1
        },
        "utxo": null
      },
      {
        "input": {
          "index": 1,
          "source_id": "af3b5fad20f6f97eb210934e942176f7f7d0f70423590659ee0e0217053a7cab",
          "source_type": "Transaction",
          "input_type": "UTXO"
        },
        "utxo": {
          "destination": "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6",
          "type": "Transfer",
          "value": {
            "amount": {
              "atoms": "1703205604300000",
              "decimal": "17032.056043"
            },
            "type": "Coin"
          }
        }
      }
    ],
    "outputs": [
      {
        "type": "Transfer",
        "destination": "tmt1qxf50ffxunjw557a9zf2et0vywkwjszyxyppa0py",
        "value": {
          "type": "Coin",
          "amount": {
            "decimal": "9",
            "atoms": "900000000000"
          }
        }
      },
      {
        "type": "Transfer",
        "destination": "tmt1qxf50ffxunjw557a9zf2et0vywkwjszyxyppa0py",
        "value": {
          "type": "TokenV1",
          "token_id": "tmltk17jgtcm3gc8fne3su8s96gwj0yw8k2khx3fglfe8mz72jhygemgnqm57l7l",
          "amount": {
            "decimal": "10",
            "atoms": "1000000000000"
          }
        }
      },
      {
        "type": "Transfer",
        "value": {
          "type": "Coin",
          "amount": {
            "atoms": "1703165104300000",
            "decimal": "17031.651043"
          }
        },
        "destination": "tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6"
      }
    ]
  })

  // expect(result).toMatchSnapshot();
});

test('fill order subsequent', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });
  await client.connect();

  // first order fill
  await client.fillOrder({
    order_id: 'tordr1thu5ykcdl0uj30g97wqkam7kart50lgzaq60edh8nq6zrn366lmql50gnu',
    amount: 10,
    destination: 'tmt1q8kfn6vl835y4tj5yfsdvz7ay5cjnvhv952wftmt',
  });

})
