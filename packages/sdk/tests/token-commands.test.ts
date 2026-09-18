import { Client } from '../src/mintlayer-connect-sdk';

import {
  MOCK_TOKEN,
  MOCK_TOKEN_11_DECIMALS,
  MOCK_TOKEN_11_DECIMALS_ID,
  MOCK_TOKEN_ID,
  setupApiMocks,
} from './helpers/api-mocks';

beforeEach(() => {
  setupApiMocks({
    tokens: {
      [MOCK_TOKEN_ID]: MOCK_TOKEN,
      [MOCK_TOKEN_11_DECIMALS_ID]: MOCK_TOKEN_11_DECIMALS,
    },
  });
});

test('token mint - snapshot', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.mintToken({
    token_id: 'tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq',
    amount: 100000000000,
    destination: 'tmt1qyjlh9w9t7qwx7cawlqz6rqwapflsvm3dulgmxyx',
  });

  const result = (await spy.mock.results[0]?.value);

  expect(result).toMatchSnapshot();
});
