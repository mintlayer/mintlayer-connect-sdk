import { Client } from '../src/mintlayer-connect-sdk';

import { utxos } from './__mocks__/accounts/account_03_single_utxo';
import { setupApiMocks } from './helpers/api-mocks';

beforeEach(() => {
  setupApiMocks({ utxos });
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
