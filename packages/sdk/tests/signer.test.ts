import { AccountProvider, Client, Signer } from '../src/mintlayer-connect-sdk';

import { addresses, utxos, private_keys } from './__mocks__/accounts/account_signer'
import {
  MOCK_TOKEN,
  MOCK_TOKEN_11_DECIMALS,
  MOCK_TOKEN_11_DECIMALS_ID,
  MOCK_TOKEN_ID,
  setupApiMocks,
} from './helpers/api-mocks';

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
  setupApiMocks({
    utxos,
    tokens: {
      [MOCK_TOKEN_ID]: MOCK_TOKEN,
      [MOCK_TOKEN_11_DECIMALS_ID]: MOCK_TOKEN_11_DECIMALS,
    },
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
