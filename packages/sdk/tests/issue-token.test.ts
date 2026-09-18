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

test('issue token - snapshot', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.issueToken({
    authority: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
    token_ticker: 'XYZ2',
    number_of_decimals: 8,
    metadata_uri: 'ipfs://QmExampleHash123',
    supply_type: 'Fixed',
    supply_amount: 100000000000,
    is_freezable: false,
  });

  const result = (await spy.mock.results[0]?.value);

  expect(result).toMatchSnapshot();
});
