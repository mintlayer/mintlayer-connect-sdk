import { Client } from '../src/mintlayer-connect-sdk'
import fetchMock from 'jest-fetch-mock';

beforeEach(() => {
  fetchMock.resetMocks();

  (window as any).mojito = {
    isExtension: true,
    connect: jest.fn().mockResolvedValue(
      {
        testnet: {
          receiving: ['taddr1receiving'],
          change: ['taddr1change']
        }
      }
    ),
    restore: jest.fn().mockResolvedValue({
      testnet: {
        receiving: ['taddr1receiving'],
        change: ['taddr1change']
      }
    }),
    disconnect: jest.fn().mockResolvedValue(undefined),
    request: jest.fn().mockResolvedValue('signed-transaction'),
  };
});

test('Client.getBalance() returns coin balance', async () => {
  fetchMock.mockIf(/^https:\/\/api-server-lovelace\.mintlayer\.org\/api\/v2\/address\/.*/, async () => {
    return {
      body: JSON.stringify({
        coin_balance: { atoms: '1000000000000', decimal: '10' },
        tokens: [],
      }),
    };
  });

  const client = await Client.create({ network: 'testnet', autoRestore: false });

  await client.connect();

  const balance = await client.getBalance();

  expect(balance).toBe(20); // two addresses with 10 each
});
