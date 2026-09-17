import { Client } from '../src/mintlayer-connect-sdk';
import {
  Amount,
  Network,
  SourceId,
  encode_input_for_utxo,
  encode_outpoint_source_id,
  encode_output_transfer,
  encode_transaction,
  estimate_transaction_size,
  fungible_token_issuance_fee,
  token_supply_change_fee,
} from '../src/mintlayer-connect-sdk';
import fetchMock from 'jest-fetch-mock';

import { addresses, utxos } from './__mocks__/accounts/account_01';

const receiving = addresses.addressesByChain.mintlayer.receiving;
const changeAddresses = addresses.addressesByChain.mintlayer.change;

const USER_ADDRESS = receiving[0]; // tmt1q9874wgx6enm2mzfu0yxhzleu84pp00l95l7er5z
const FEE_ADDRESS = receiving[1]; // tmt1q93ldqwvlpq5xc0n2nqnvgdzghqf6krjxsfryl0c
const TOKEN_AUTHORITY = 'tmt1qyjlh9w9t7qwx7cawlqz6rqwapflsvm3dulgmxyx';
const TOKEN_ID = 'tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq';

/** Largest coin UTXO of the mocked account (17032.056043 ML). */
const LARGEST_COIN_UTXO = {
  source_id: 'af3b5fad20f6f97eb210934e942176f7f7d0f70423590659ee0e0217053a7cab',
  index: 1,
  atoms: '1703205604300000',
};

type AnyTx = {
  JSONRepresentation: {
    inputs: any[];
    outputs: any[];
    fee: { atoms: string; decimal: string };
    id: string;
  };
  BINRepresentation: { inputs: Uint8Array[]; outputs: Uint8Array[]; transactionsize: number };
  HEXRepresentation_unsigned: string;
  transaction_id: string;
};

/** Sum of the coin value carried by UTXO inputs of a transaction. */
function coinInputSum(tx: AnyTx): bigint {
  return tx.JSONRepresentation.inputs
    .filter((i: any) => i.input.input_type === 'UTXO')
    .reduce((acc: bigint, i: any) => acc + BigInt(i.utxo.value.amount.atoms), 0n);
}

function coinTransferSum(tx: AnyTx): bigint {
  return tx.JSONRepresentation.outputs
    .filter((o: any) => o.type === 'Transfer' && o.value.type === 'Coin')
    .reduce((acc: bigint, o: any) => acc + BigInt(o.value.amount.atoms), 0n);
}

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

    if (url.includes('/token/')) {
      const tokenId = url.split('/token/').pop();
      if (tokenId === TOKEN_ID) {
        return JSON.stringify({
          authority: TOKEN_AUTHORITY,
          circulating_supply: {
            atoms: '209000000000',
            decimal: '2090',
          },
          frozen: false,
          is_locked: false,
          is_token_freezable: true,
          is_token_unfreezable: null,
          metadata_uri: {
            hex: '697066733a2f2f516d4578616d706c6548617368313233',
            string: 'ipfs://QmExampleHash123',
          },
          next_nonce: 7,
          number_of_decimals: 8,
          token_ticker: {
            hex: '58595a32',
            string: 'XYZ2',
          },
          total_supply: {
            Fixed: {
              atoms: '100000000000000',
            },
          },
        });
      }
      return JSON.stringify({ a: 'b' });
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

describe('buildRawTransaction', () => {
  test('issuance + transfers + fee output in one transaction', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();

    const FEE_ATOMS = '1000000000'; // 10 ML
    const USER_ATOMS = '50000000000'; // 500 ML

    const tx = (await client.buildRawTransaction({
      outputs: [
        {
          type: 'IssueFungibleToken',
          authority: TOKEN_AUTHORITY,
          is_freezable: false,
          metadata_uri: 'ipfs://QmExampleHash123',
          number_of_decimals: 11,
          token_ticker: 'XYZ2',
          total_supply: { type: 'Fixed', amount: { atoms: '1000000000000', decimal: '1000' } },
        },
        {
          type: 'Transfer',
          destination: FEE_ADDRESS,
          value: { type: 'Coin', amount: { atoms: FEE_ATOMS, decimal: '10' } },
        },
        {
          type: 'Transfer',
          destination: USER_ADDRESS,
          value: { type: 'Coin', amount: { atoms: USER_ATOMS, decimal: '500' } },
        },
      ],
    })) as AnyTx;

    const { JSONRepresentation } = tx;

    // 3 caller outputs + 1 change output
    expect(JSONRepresentation.outputs).toHaveLength(4);
    const change = JSONRepresentation.outputs[3];
    expect(change.type).toBe('Transfer');
    expect(change.destination).toBe(changeAddresses[0]);
    expect(change.value.type).toBe('Coin');

    // caller outputs preserved, order intact
    expect(JSONRepresentation.outputs[0].type).toBe('IssueFungibleToken');
    expect(JSONRepresentation.outputs[1].destination).toBe(FEE_ADDRESS);
    // fee output amount preserved exactly
    expect(JSONRepresentation.outputs[1].value.amount.atoms).toBe(FEE_ATOMS);
    expect(JSONRepresentation.outputs[1].value.amount.decimal).toBe('10');
    expect(JSONRepresentation.outputs[2].destination).toBe(USER_ADDRESS);
    expect(JSONRepresentation.outputs[2].value.amount.atoms).toBe(USER_ATOMS);

    // issuance fee enters the accounting
    const issuanceFee = BigInt(fungible_token_issuance_fee(200000n, Network.Testnet).atoms());
    expect(issuanceFee).toBeGreaterThan(0n);

    // coin conservation: inputs = caller coin outputs + change + tx fee + issuance fee
    const inputSum = coinInputSum(tx);
    const explicitSum = BigInt(FEE_ATOMS) + BigInt(USER_ATOMS);
    const fee = BigInt(JSONRepresentation.fee.atoms);
    expect(inputSum).toBe(explicitSum + BigInt(change.value.amount.atoms) + fee + issuanceFee);

    // issuance fee is charged on top of the plain outputs+fee accounting
    expect(inputSum).toBeGreaterThan(explicitSum + BigInt(change.value.amount.atoms));

    // transaction identity
    expect(tx.transaction_id).toMatch(/^[0-9a-f]{64}$/);
    expect(JSONRepresentation.id).toBe(tx.transaction_id);
    expect(tx.HEXRepresentation_unsigned).toMatch(/^[0-9a-f]+$/);
    expect(tx.BINRepresentation.inputs.length).toBeGreaterThan(0);
    expect(tx.BINRepresentation.outputs.length).toBe(JSONRepresentation.outputs.length);
  });

  test('multi transfer selects UTXOs automatically and returns change to the change address', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();

    const amounts = ['5000000000', '25000000000', '7000000000']; // 50 + 250 + 70 ML

    const tx = (await client.buildRawTransaction({
      outputs: amounts.map((atoms, i) => ({
        type: 'Transfer' as const,
        destination: receiving[i],
        value: { type: 'Coin' as const, amount: { atoms, decimal: (Number(atoms) / 1e11).toString() } },
      })),
    })) as AnyTx;

    const outs = tx.JSONRepresentation.outputs;
    expect(outs).toHaveLength(4);

    // caller outputs preserved in order
    expect(outs.slice(0, 3).map((o: any) => o.destination)).toEqual([receiving[0], receiving[1], receiving[2]]);
    expect(outs.slice(0, 3).map((o: any) => o.value.amount.atoms)).toEqual(amounts);

    // auto UTXO selection picked the largest coin UTXO of the mocked account
    const coinInputs = tx.JSONRepresentation.inputs.filter((i: any) => i.input.input_type === 'UTXO');
    expect(coinInputs.length).toBeGreaterThanOrEqual(1);
    expect(coinInputs[0].input.source_id).toBe(LARGEST_COIN_UTXO.source_id);
    expect(coinInputs[0].input.index).toBe(LARGEST_COIN_UTXO.index);

    // change goes to the first change address
    const change = outs[3];
    expect(change.type).toBe('Transfer');
    expect(change.destination).toBe(changeAddresses[0]);
    expect(change.value.type).toBe('Coin');

    // coin conservation: inputs = outputs + change + fee
    const inputSum = coinInputSum(tx);
    const outSum = amounts.reduce((acc, atoms) => acc + BigInt(atoms), 0n);
    const fee = BigInt(tx.JSONRepresentation.fee.atoms);
    expect(inputSum).toBe(outSum + BigInt(change.value.amount.atoms) + fee);
  });

  test('mint inputs without nonce get sequential auto nonces and inferred authority', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();

    const tx = (await client.buildRawTransaction({
      outputs: [
        {
          type: 'Transfer',
          destination: USER_ADDRESS,
          value: { type: 'Coin', amount: { atoms: '1000000000', decimal: '10' } },
        },
      ],
      inputs: [
        {
          input: {
            input_type: 'AccountCommand',
            command: 'MintTokens',
            token_id: TOKEN_ID,
            amount: { atoms: '100000000000', decimal: '1000' },
          },
        },
        {
          input: {
            input_type: 'AccountCommand',
            command: 'MintTokens',
            token_id: TOKEN_ID,
            amount: { atoms: '50000000000', decimal: '500' },
          },
        },
      ],
    })) as AnyTx;

    const mints = tx.JSONRepresentation.inputs.filter((i: any) => i.input.command === 'MintTokens');
    expect(mints).toHaveLength(2);

    // token mock exposes next_nonce 7 → auto nonces [7, 8] in input order
    expect(mints[0].input.nonce).toBe(7);
    expect(mints[1].input.nonce).toBe(8);
    expect(mints[0].input.token_id).toBe(TOKEN_ID);
    expect(mints[1].input.token_id).toBe(TOKEN_ID);

    // authority auto-inferred from token details
    expect(mints[0].input.authority).toBe(TOKEN_AUTHORITY);
    expect(mints[1].input.authority).toBe(TOKEN_AUTHORITY);

    // coin conservation including per-mint token supply change fee
    const supplyFee = BigInt(token_supply_change_fee(200000n, Network.Testnet).atoms());
    const inputSum = coinInputSum(tx);
    const fee = BigInt(tx.JSONRepresentation.fee.atoms);
    expect(inputSum).toBe(coinTransferSum(tx) + fee + 2n * supplyFee);
  });

  test('explicit nonce overrides the auto lookup', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();

    const tx = (await client.buildRawTransaction({
      outputs: [
        {
          type: 'Transfer',
          destination: USER_ADDRESS,
          value: { type: 'Coin', amount: { atoms: '1000000000', decimal: '10' } },
        },
      ],
      inputs: [
        {
          input: {
            input_type: 'AccountCommand',
            command: 'MintTokens',
            token_id: TOKEN_ID,
            nonce: 42,
            amount: { atoms: '100000000000', decimal: '1000' },
          },
        },
      ],
    })) as AnyTx;

    const mints = tx.JSONRepresentation.inputs.filter((i: any) => i.input.command === 'MintTokens');
    expect(mints).toHaveLength(1);
    expect(mints[0].input.nonce).toBe(42);
    // authority still auto-inferred when omitted
    expect(mints[0].input.authority).toBe(TOKEN_AUTHORITY);
  });
});

describe('buildRawTransaction rejections', () => {
  test('rejects empty outputs array without provider calls', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();
    const callsBefore = fetchMock.mock.calls.length;

    await expect(client.buildRawTransaction({ outputs: [] })).rejects.toThrow(
      'At least one output is required',
    );

    expect(fetchMock.mock.calls).toHaveLength(callsBefore);
  });

  test('rejects unknown output type without provider calls', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();
    const callsBefore = fetchMock.mock.calls.length;

    await expect(
      client.buildRawTransaction({
        outputs: [
          { type: 'NotAnOutput', destination: USER_ADDRESS } as any,
        ],
      }),
    ).rejects.toThrow('unknown output type');

    expect(fetchMock.mock.calls).toHaveLength(callsBefore);
  });

  test('rejects malformed atoms without provider calls', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();
    const callsBefore = fetchMock.mock.calls.length;

    for (const atoms of ['-100', '1.5', 'abc', '']) {
      await expect(
        client.buildRawTransaction({
          outputs: [
            {
              type: 'Transfer',
              destination: USER_ADDRESS,
              value: { type: 'Coin', amount: { atoms: atoms as any, decimal: '1' } },
            },
          ],
        }),
      ).rejects.toThrow('amount.atoms must be a non-negative integer');
    }

    expect(fetchMock.mock.calls).toHaveLength(callsBefore);
  });

  test('rejects UTXO-style input passed in inputs without provider calls', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();
    const callsBefore = fetchMock.mock.calls.length;

    await expect(
      client.buildRawTransaction({
        outputs: [
          {
            type: 'Transfer',
            destination: USER_ADDRESS,
            value: { type: 'Coin', amount: { atoms: '1000000000', decimal: '10' } },
          },
        ],
        inputs: [
          {
            input: {
              input_type: 'UTXO',
              index: 0,
              source_id: 'ab'.repeat(32),
              source_type: 'Transaction',
            },
          } as any,
        ],
      }),
    ).rejects.toThrow('unsupported input_type');

    expect(fetchMock.mock.calls).toHaveLength(callsBefore);
  });
});

describe('wasm re-exports', () => {
  test('encode_output_transfer / encode_transaction / estimate_transaction_size are usable', () => {
    expect(typeof encode_output_transfer).toBe('function');
    expect(typeof encode_transaction).toBe('function');
    expect(typeof estimate_transaction_size).toBe('function');

    const amount = Amount.from_atoms('1000000000');
    const output = encode_output_transfer(amount, USER_ADDRESS, Network.Testnet);
    expect(output).toBeInstanceOf(Uint8Array);
    expect(output.length).toBeGreaterThan(0);

    const outpoint = encode_outpoint_source_id(new Uint8Array(32), SourceId.Transaction);
    const input = encode_input_for_utxo(outpoint, 0);
    expect(input).toBeInstanceOf(Uint8Array);

    const transaction = encode_transaction(input, output, BigInt(0));
    expect(transaction).toBeInstanceOf(Uint8Array);
    expect(transaction.length).toBeGreaterThan(0);

    const size = estimate_transaction_size(input, [USER_ADDRESS], output, Network.Testnet);
    expect(typeof size).toBe('number');
    expect(size).toBeGreaterThan(0);
  });
});

describe('RawStringField normalization', () => {
  test('plain strings are auto-wrapped into hex/string pairs', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();

    const tx = (await client.buildRawTransaction({
      outputs: [
        {
          type: 'IssueFungibleToken',
          authority: TOKEN_AUTHORITY,
          is_freezable: false,
          metadata_uri: 'ipfs://x',
          number_of_decimals: 11,
          token_ticker: 'XYZ',
          total_supply: { type: 'Unlimited' },
        },
      ],
    })) as AnyTx;

    const issuance = tx.JSONRepresentation.outputs[0];
    expect(issuance.type).toBe('IssueFungibleToken');
    expect(issuance.metadata_uri).toEqual({ hex: '697066733a2f2f78', string: 'ipfs://x' });
    expect(issuance.token_ticker).toEqual({ hex: '58595a', string: 'XYZ' });
  });
});
