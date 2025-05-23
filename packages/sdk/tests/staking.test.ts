import { Client } from '../src/mintlayer-connect-sdk';
import fetchMock from 'jest-fetch-mock';

import { addresses, utxos } from './__mocks__/accounts/account_01'
import { pool_01 } from './__mocks__/pools/pool_01';

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
      body: JSON.stringify({
        utxos: utxos,
      }),
    };
  });
});

test('create delegation - snapshot', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.delegationCreate({
    pool_id: 'tpool1dwpe7zy0mhagnwl36ywt5q20xxvu5dwmph4z6q8sc0a3srz5h8jqr0r2yg',
    destination: 'tmt1qyrjfd5e3nref7zga24jcthffahjwyg3csxu3xgc',
  });

  const result = await spy.mock.results[0]?.value;

  expect(result).toMatchSnapshot();
});

test('delegate staking - snaphsot', async () => {
  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.delegationStake({
    delegation_id: 'tdelg1d57nmkp24k0rh0fgsjnjy78wxql8wvgr420ncdsesvssvdgfcg6sx6262w',
    amount: 10,
  });

  const result = await spy.mock.results[0]?.value;

  expect(result).toMatchSnapshot();
})

test('delegate staking providing only pool_id - snaphsot', async () => {
  fetchMock.mockIf('https://api-server-lovelace.mintlayer.org/api/v2/pool/tpool1tl784md209n53kuuwqxu68zav5lu5pdg8ca7kuhs6jg5lw24827q6qgxkc/delegations', async () => {
    return {
      body: JSON.stringify(pool_01),
    };
  });

  const client = await Client.create({ network: 'testnet', autoRestore: false });

  const spy = jest.spyOn(Client.prototype as any, 'buildTransaction');

  await client.connect();

  await client.delegationStake({
    pool_id: 'tpool1tl784md209n53kuuwqxu68zav5lu5pdg8ca7kuhs6jg5lw24827q6qgxkc',
    amount: 10,
  });

  const result = await spy.mock.results[0]?.value;

  expect(result).toMatchSnapshot();
})
