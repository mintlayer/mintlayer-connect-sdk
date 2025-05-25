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

  // API /chain/tip
  fetchMock.mockIf('https://api-server-lovelace.mintlayer.org/api/v2/chain/tip', async () => {
    return {
      body: JSON.stringify({ height: 200000 }),
    };
  });

  // API /token/tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq
  fetchMock.mockIf('https://api-server-lovelace.mintlayer.org/api/v2/token/tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq', async () => {
    return {
      body: JSON.stringify({
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
      }),
    };
  });

  // API /account
  fetchMock.mockIf('https://api.mintini.app/account', async () => {
    return {
      body: JSON.stringify({
        utxos: utxos,
      }),
    };
  });
});

test('create order - snapshot', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

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
