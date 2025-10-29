import { Client } from '../src/mintlayer-connect-sdk'
import fetchMock from 'jest-fetch-mock';
import { addresses } from './__mocks__/accounts/account_01';

beforeEach(() => {
  fetchMock.resetMocks();

  (window as any).mojito = {
    isExtension: true,
    connect: jest.fn().mockResolvedValue({
      addressesByChain: {
        mintlayer: {
          receiving: ['taddr1receiving'],
          change: ['taddr1change'],
        },
      },
    }),
    restore: jest.fn().mockResolvedValue({
      addressesByChain: {
        mintlayer: {
          receiving: ['taddr1receiving'],
          change: ['taddr1change'],
        },
      },
    }),
    disconnect: jest.fn().mockResolvedValue(undefined),
    request: jest.fn().mockResolvedValue('signed-transaction'),
  };

  fetchMock.doMock();

  fetchMock.mockResponse(async req => {
    const url = req.url;

    if (url.endsWith('/chain/tip')) {
      return JSON.stringify({ height: 200000 });
    }

    if (url.includes('/address/')) {
      return JSON.stringify({
        coin_balance: { atoms: '1000000000000', decimal: '10' },
        tokens: [],
      });
    }

    console.warn('No mock for:', url);
    return JSON.stringify({ error: 'No mock defined' });
  });
});

test('Client.getBalance() returns coin balance', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  await client.connect();

  const balance = await client.getBalance();

  expect(balance).toBe(20); // two addresses with 10 each
});
