import { Client } from '../src/mintlayer-connect-sdk';
import fetchMock from 'jest-fetch-mock';

import { addresses, utxos } from './__mocks__/accounts/account_01'

beforeEach(() => {
  fetchMock.resetMocks();

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

  // API /account
  fetchMock.mockIf('https://api.mintini.app/account', async () => {
    return {
      body: JSON.stringify({
        utxos: utxos,
      }),
    };
  });
});

test('preview utxo after transfer', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  await client.connect();

  const transaction = await client.buildTransaction({
    type: 'Transfer',
    params: {
      to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
      amount: 10,
    }
  });

  const { spent, created } = client.previewUtxoChange(transaction);

  expect(spent.length).toBe(2);
  expect(spent[0].outpoint.source_id).toBe('af3b5fad20f6f97eb210934e942176f7f7d0f70423590659ee0e0217053a7cab');
  expect(spent[0].outpoint.index).toBe(1);
  expect(created.length).toBe(2);
  expect(created[0].outpoint.source_id).toBe('05d9ec811338b736816f64965f17844cdbf45711f0892534f3f7408344052bcc');
  expect(created[0].outpoint.index).toBe(0);
  expect(created[1].utxo.destination).toBe('tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc');
  expect(created[1].utxo.value.amount.decimal).toBe('10');
  expect(created[1].outpoint.source_id).toBe('05d9ec811338b736816f64965f17844cdbf45711f0892534f3f7408344052bcc');
  expect(created[1].outpoint.index).toBe(1);
  expect(created[1].utxo.type).toBe('Transfer');
  expect(created[1].utxo.value.type).toBe('Coin');
  expect(created[1].utxo.value.amount.atoms).toBe('1701805604300000');
});
