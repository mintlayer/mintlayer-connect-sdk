import { Client } from '../src/mintlayer-connect-sdk';
import fetchMock from 'jest-fetch-mock';

import { addresses, utxos } from './__mocks__/accounts/account_01';

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

  // API /account
  fetchMock.mockIf('https://api.mintini.app/account', async () => {
    return {
      body: JSON.stringify({ utxos }),
    };
  });

  fetchMock.mockIf(/^https:\/\/api-server-lovelace\.mintlayer\.org\/api\/v2\/token\//, async () => {
    return {
      body: JSON.stringify({
        token_id: 'tmltk1abc...',
        number_of_decimals: 2,
        authority: 'taddr1auth...',
      }),
    };
  });
});

test('buildTransaction for transfer - snapshot', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });
  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.transfer({
    to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
    amount: 10,
  });

  const result = await spy.mock.results[0]?.value;
  expect(result).toMatchSnapshot();
});

test('transfer returns signed tx', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });
  await client.connect();

  const result = await client.transfer({
    to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
    amount: 10,
  });

  expect(result).toBe('signed-transaction');
});

test('buildTransaction called with correct params', async () => {
  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  await client.connect();

  await client.transfer({
    to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
    amount: 5,
  });

  expect(spy).toHaveBeenCalledWith({
    type: 'Transfer',
    params: expect.objectContaining({
      to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
      amount: 5,
    }),
  });
});

test('token transfer builds correct transaction', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });
  await client.connect();

  const result = await client.transfer({
    to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
    amount: 50,
    token_id: 'tmltk1wvfgu57geuqrjzxmnk48jmnp5salnd0ggmcymxl6u3h6wk7smnjqjrr0u6', // triggers token fetch
  });

  expect(result).toBe('signed-transaction');
});

test('fails transfer if not enough utxo', async () => {
  fetchMock.mockIf('https://api.mintini.app/account', async () => {
    return {
      body: JSON.stringify({ utxos: [] }), // no utxos
    };
  });

  const client = await Client.create({ network: 'testnet', autoRestore: false });
  await client.connect();

  await expect(await client.transfer({
    to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
    amount: 999999999,
  })).rejects.toThrow(/Not enough token UTXOs|Failed to fetch utxos|API error/);
});
