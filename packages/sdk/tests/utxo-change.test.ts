import { Client } from '../src/mintlayer-connect-sdk';
import fetchMock from 'jest-fetch-mock';

import { addresses, utxos } from './__mocks__/accounts/account_01'
import { makeLogger } from 'ts-loader/dist/logger';

beforeEach(() => {
  fetchMock.resetMocks();

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

  expect(spent.length).toBe(1);
  expect(spent[0].outpoint.source_id).toBe('af3b5fad20f6f97eb210934e942176f7f7d0f70423590659ee0e0217053a7cab');
  expect(spent[0].outpoint.index).toBe(1);
  expect(created.length).toBe(2);
  expect(created[0].outpoint.source_id).toBe('95d91b8b3c9cd5973e85a397a86a803ab2b8ba8b8ad1b875c85b5c8ae7e4fc7d');
  expect(created[0].outpoint.index).toBe(0);
  expect(created[0].utxo.destination).toBe('tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc');
  expect(created[0].utxo.value.amount.decimal).toBe('10');
  expect(created[1].utxo.destination).toBe('tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6');
  expect(created[1].outpoint.source_id).toBe('95d91b8b3c9cd5973e85a397a86a803ab2b8ba8b8ad1b875c85b5c8ae7e4fc7d');
  expect(created[1].outpoint.index).toBe(1);
  expect(created[1].utxo.type).toBe('Transfer');
  expect(created[1].utxo.value.type).toBe('Coin');
  expect(created[1].utxo.value.amount.atoms).toBe('1702185004300000');
});

test('decorate with utxo change', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });
  await client.connect();

  const { result, utxo } = await client.decorateWithUtxoFetch(
    () => client.transfer({
      to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
      amount: 10,
    })
  );

  console.log('result', result);
  console.log('utxo', utxo);
  expect(result).toBe('signed-transaction');
});
