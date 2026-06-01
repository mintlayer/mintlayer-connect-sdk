import { Client } from '../src/mintlayer-connect-sdk';
import fetchMock from 'jest-fetch-mock';

import { addresses, utxos } from './__mocks__/accounts/account_03_single_utxo';

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

  fetchMock.mockResponse(async (req) => {
    const url = req.url;

    if (url.endsWith('/chain/tip')) {
      return JSON.stringify({ height: 200000 });
    }

    if (url.endsWith('/batch')) {
      return {
        body: JSON.stringify({
          results: [utxos],
        }),
      };
    }

    console.warn('No mock for:', url);
    return JSON.stringify({ error: 'No mock defined' });
  });
});

test('create delegation uses a single coin UTXO to calculate the fee', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  await client.connect();

  const tx: any = await client.buildDelegationCreate({
    pool_id: 'tpool1dwpe7zy0mhagnwl36ywt5q20xxvu5dwmph4z6q8sc0a3srz5h8jqr0r2yg',
    destination: 'tmt1q9874wgx6enm2mzfu0yxhzleu84pp00l95l7er5z',
  });

  expect(tx.JSONRepresentation.inputs).toHaveLength(1);
  expect(tx.JSONRepresentation.inputs[0]).toMatchObject({
    input: {
      input_type: 'UTXO',
    },
  });
  expect(tx.JSONRepresentation.outputs).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: 'CreateDelegationId',
      }),
    ]),
  );
});
