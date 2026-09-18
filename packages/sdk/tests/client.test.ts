import { Client } from '../src/mintlayer-connect-sdk'
import fetchMock from 'jest-fetch-mock';
import { setupApiMocks } from './helpers/api-mocks';

let mocks: ReturnType<typeof setupApiMocks>;

beforeEach(() => {
  mocks = setupApiMocks();

  // this suite uses a minimal wallet: one receiving / one change address
  const walletAddresses = {
    addressesByChain: {
      mintlayer: {
        receiving: ['taddr1receiving'],
        change: ['taddr1change'],
      },
    },
  };
  (window as any).mojito.connect = jest.fn().mockResolvedValue(walletAddresses);
  (window as any).mojito.restore = jest.fn().mockResolvedValue(walletAddresses);

  fetchMock.mockResponse(async req => {
    if (req.url.includes('/address/')) {
      return JSON.stringify({
        coin_balance: { atoms: '1000000000000', decimal: '10' },
        tokens: [],
      });
    }

    return mocks.defaultRouter(req);
  });
});

test('Client.getBalance() returns coin balance', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  await client.connect();

  const balance = await client.getBalance();

  expect(balance).toBe(20); // two addresses with 10 each
});
