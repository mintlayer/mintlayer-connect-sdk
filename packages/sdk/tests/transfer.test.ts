import { Client } from '../src/mintlayer-connect-sdk';
import fetchMock from 'jest-fetch-mock';

import {
  MOCK_TOKEN,
  MOCK_TOKEN_11_DECIMALS,
  MOCK_TOKEN_11_DECIMALS_ID,
  MOCK_TOKEN_ID,
  setupApiMocks,
} from './helpers/api-mocks';

let mocks: ReturnType<typeof setupApiMocks>;

beforeEach(() => {
  mocks = setupApiMocks({
    tokens: {
      [MOCK_TOKEN_ID]: MOCK_TOKEN,
      [MOCK_TOKEN_11_DECIMALS_ID]: MOCK_TOKEN_11_DECIMALS,
    },
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

test('fails transfer if not enough utxo', async () => {
  fetchMock.mockIf('https://mojito-api.mintlayer.org/mintlayer/testnet/batch', async () => {
    return {
      body: JSON.stringify({ results: [[]] }), // no utxos
    };
  });

  const client = await Client.create({ network: 'testnet', autoRestore: false });
  await client.connect();

  await expect(client.transfer({
    to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
    amount: 999999999,
  })).rejects.toThrow('Not enough coin UTXOs');
});

test('transfer ignores account entries without utxo', async () => {
  fetchMock.mockIf('https://mojito-api.mintlayer.org/mintlayer/testnet/batch', async () => {
    return {
      body: JSON.stringify({
        results: [[
          {
            input: {
              input_type: 'Account',
              account_type: 'DelegationBalance',
              amount: {
                atoms: '100000000000',
                decimal: '1',
              },
              delegation_id: 'tde1q9gndm5e2d6w33xtm26gppaj29qh52gnxwucnqlq',
              nonce: 1,
            },
          },
          ...mocks.utxos,
        ]],
      }),
    };
  });

  const client = await Client.create({ network: 'testnet', autoRestore: false });
  await client.connect();

  const result = await client.transfer({
    to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
    amount: 10,
  });

  expect(result).toBe('signed-transaction');
});

test('transfer transfer fee precise', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.transfer({
    to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
    amount: 10,
  });

  const result = await spy.mock.results[0]?.value;

  const { fee } = result.JSONRepresentation;

  expect(fee).toEqual({
    atoms: "20600000000",
    decimal: "0.206"
  });
});

test('buildTransaction for transfer, decimal test 1', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.transfer({
    to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
    amount: 0.009,
  });

  const result = await spy.mock.results[0]?.value;

  expect(result).toMatchSnapshot();
});

test('buildTransaction for transfer, decimal test 2', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.transfer({
    to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
    amount: 1.005,
  });

  const result = await spy.mock.results[0]?.value;
  expect(result).toMatchSnapshot();
});

test('buildTransaction for transfer, decimal test 3', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.transfer({
    to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
    amount: 0.00001,
  });

  const result = await spy.mock.results[0]?.value;

  expect(result).toMatchSnapshot();
});

test('buildTransaction for transfer, decimal test 4', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.transfer({
    to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
    amount: 0.1,
  });

  const result = await spy.mock.results[0]?.value;

  expect(result).toMatchSnapshot();
});

test('buildTransaction for transfer, decimal test 5', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.transfer({
    to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
    amount: 0.0000001,
  });

  const result = await spy.mock.results[0]?.value;

  expect(result).toMatchSnapshot();
});

test('buildTransaction for transfer, decimal test 6', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.transfer({
    to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
    amount: 0.00000000003,
  });

  const result = await spy.mock.results[0]?.value;

  console.log('result', JSON.stringify(result.JSONRepresentation.outputs[0], null, 2));

  expect(result).toMatchSnapshot();
});
