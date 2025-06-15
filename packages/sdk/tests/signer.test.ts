import { AccountProvider, Client, Signer } from '../src/mintlayer-connect-sdk';
import fetchMock from 'jest-fetch-mock';

import { addresses, utxos, private_keys } from './__mocks__/accounts/account_signer'

class TestAccountProvider implements AccountProvider {
  async connect() {
    return addresses;
  }

  async restore() {
    return addresses;
  }

  async disconnect() {
    return Promise.resolve()
  }

  async request(method: any, params: any) {
    if( method === 'signTransaction') {
      const signer = new Signer(private_keys);
      const transaction_signed = signer.sign(params.txData);

      return Promise.resolve(transaction_signed);
    }

    return Promise.resolve('signed-transaction-custom-signer');
  }
}

beforeEach(() => {
  fetchMock.resetMocks();

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

test('buildTransaction and sign it', async () => {
  const client = await Client.create({
    network: 'testnet',
    autoRestore: false,
    accountProvider: new TestAccountProvider()
  });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  const tx = await client.transfer({
    to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
    amount: 10,
  });

  const expectedTx = '01000400009d214cf61b322cfb257e3c145cba5085763e7b82cc5a20e5e54821549778ee1a00000000080000070010a5d4e801769479bae7d535d097defdff0f4e7101669d4a1900000b008b5c222a030186ec450457d09ad9807393d89cec9c71d62060210401018d010003e499331885d47bf31b8c8706b69d5a0e839599f8247c008226a151f50365e749002c958e556919e75f467064a4f51ce27093de52d271512e6d064c524c49ac81086ddc4cf9a6766f8f28e699123e678f54496da7bfe34e30f08229ca96861881a4';

  // compare first 280 characters of the transaction. TODO: use a more robust way to compare transactions
  expect(tx.slice(0, 280)).toBe(expectedTx.slice(0, 280));
});
