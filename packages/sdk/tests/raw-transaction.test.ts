import { Client } from '../src/mintlayer-connect-sdk';
import {
  Amount,
  Network,
  SourceId,
  data_deposit_fee,
  encode_input_for_utxo,
  encode_outpoint_source_id,
  encode_output_transfer,
  encode_transaction,
  estimate_transaction_size,
  fungible_token_issuance_fee,
  nft_issuance_fee,
  token_supply_change_fee,
} from '../src/mintlayer-connect-sdk';
import fetchMock from 'jest-fetch-mock';

import { MOCK_TOKEN, MOCK_TOKEN_AUTHORITY, MOCK_TOKEN_ID, setupApiMocks } from './helpers/api-mocks';

import { addresses } from './__mocks__/accounts/account_01';

const receiving = addresses.addressesByChain.mintlayer.receiving;
const changeAddresses = addresses.addressesByChain.mintlayer.change;

const USER_ADDRESS = receiving[0]; // tmt1q9874wgx6enm2mzfu0yxhzleu84pp00l95l7er5z
const FEE_ADDRESS = receiving[1]; // tmt1q93ldqwvlpq5xc0n2nqnvgdzghqf6krjxsfryl0c
const TOKEN_AUTHORITY = MOCK_TOKEN_AUTHORITY;
const TOKEN_ID = MOCK_TOKEN_ID;
/** Decimals of the mocked token fixture (8). */
const TOKEN_DECIMALS: number = MOCK_TOKEN.number_of_decimals;
const TOKEN_ATOMS = (tokens: bigint) => (tokens * BigInt(10 ** TOKEN_DECIMALS)).toString();

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

/** Sum of the Coin value carried by UTXO inputs of a transaction (token inputs excluded). */
function coinInputSum(tx: AnyTx): bigint {
  return tx.JSONRepresentation.inputs
    .filter((i: any) => i.input.input_type === 'UTXO' && i.utxo.value.type === 'Coin')
    .reduce((acc: bigint, i: any) => acc + BigInt(i.utxo.value.amount.atoms), 0n);
}

function coinTransferSum(tx: AnyTx): bigint {
  return tx.JSONRepresentation.outputs
    .filter((o: any) => o.type === 'Transfer' && o.value.type === 'Coin')
    .reduce((acc: bigint, o: any) => acc + BigInt(o.value.amount.atoms), 0n);
}

/** Sum of TokenV1 UTXO input values for a given token id. */
function tokenInputSum(tx: AnyTx, tokenId: string): bigint {
  return tx.JSONRepresentation.inputs
    .filter(
      (i: any) =>
        i.input.input_type === 'UTXO' &&
        i.utxo.value.type === 'TokenV1' &&
        i.utxo.value.token_id === tokenId,
    )
    .reduce((acc: bigint, i: any) => acc + BigInt(i.utxo.value.amount.atoms), 0n);
}

/** Sum of token amounts in outputs matching `match` for a given token id. */
function tokenOutputSum(tx: AnyTx, tokenId: string, match: (o: any) => boolean = () => true): bigint {
  return tx.JSONRepresentation.outputs
    .filter((o: any) => o.value?.type === 'TokenV1' && o.value.token_id === tokenId && match(o))
    .reduce((acc: bigint, o: any) => acc + BigInt(o.value.amount.atoms), 0n);
}

/** Shared minimal NFT metadata fixture (all fields within length caps). */
const NFT_DATA = {
  name: 'Name',
  ticker: 'PPP',
  description: 'Description',
  media_hash: '0100060009',
  media_uri: 'ipfs://media',
  icon_uri: 'ipfs://icon',
  additional_metadata_uri: 'ipfs://meta',
};

const DELEGATION_ID = 'tdelg1d57nmkp24k0rh0fgsjnjy78wxql8wvgr420ncdsesvssvdgfcg6sx6262w';

function coinTransferOutput(destination: string, atoms: string) {
  return {
    type: 'Transfer' as const,
    destination,
    value: { type: 'Coin' as const, amount: { atoms, decimal: (BigInt(atoms) / BigInt(1e11)).toString() } },
  };
}

let mocks: ReturnType<typeof setupApiMocks>;

beforeEach(() => {
  mocks = setupApiMocks();
});

describe('buildRawTransaction', () => {
  test('issuance + transfers + fee output in one transaction', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();

    const FEE_ATOMS = '1000000000000'; // 10 ML
    const USER_ATOMS = '50000000000000'; // 500 ML

    const tx = (await client.buildRawTransaction({
      outputs: [
        {
          type: 'IssueFungibleToken',
          authority: TOKEN_AUTHORITY,
          is_freezable: false,
          metadata_uri: 'ipfs://QmExampleHash123',
          number_of_decimals: 11,
          token_ticker: 'XYZ2',
          total_supply: { type: 'Fixed', amount: { atoms: '1000000000000', decimal: '10' } },
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
          value: { type: 'Coin', amount: { atoms: '1000000000000', decimal: '10' } },
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
          value: { type: 'Coin', amount: { atoms: '1000000000000', decimal: '10' } },
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
            value: { type: 'Coin', amount: { atoms: '1000000000000', decimal: '10' } },
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

describe('buildRawTransaction extended coverage', () => {
  test('TokenV1 transfer + burnToken select token UTXOs, return token change and respect decimals', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();

    // 10 tokens each at the fixture's 8 decimals
    const TRANSFER_ATOMS = TOKEN_ATOMS(10n);
    const BURN_ATOMS = TOKEN_ATOMS(10n);

    const tx = (await client.buildRawTransaction({
      outputs: [
        {
          type: 'Transfer',
          destination: USER_ADDRESS,
          value: { type: 'TokenV1', token_id: TOKEN_ID, amount: { atoms: TRANSFER_ATOMS, decimal: '10' } },
        },
        {
          type: 'BurnToken',
          value: { type: 'TokenV1', token_id: TOKEN_ID, amount: { atoms: BURN_ATOMS, decimal: '10' } },
        },
      ],
    })) as AnyTx;

    // exactly one token UTXO selected: the largest one (1000 tokens)
    const tokenInputs = tx.JSONRepresentation.inputs.filter(
      (i: any) => i.input.input_type === 'UTXO' && i.utxo.value.type === 'TokenV1',
    );
    expect(tokenInputs).toHaveLength(1);
    expect(tokenInputs[0].input.source_id).toBe('cdcee4a44823978cc50245eff518a562c4461e74fee2ce2f46cade822f657e0d');
    expect(tokenInputs[0].input.index).toBe(0);

    // caller outputs preserved with decimals recomputed at 8 (atoms / 1e8 = 10)
    const outs = tx.JSONRepresentation.outputs;
    const transfer = outs.find((o: any) => o.type === 'Transfer' && o.value.type === 'TokenV1' && o.destination === USER_ADDRESS);
    const burn = outs.find((o: any) => o.type === 'BurnToken');
    expect(transfer.value.amount).toEqual({ atoms: TRANSFER_ATOMS, decimal: '10' });
    expect(burn.value.amount).toEqual({ atoms: BURN_ATOMS, decimal: '10' });
    expect(burn.value.token_id).toBe(TOKEN_ID);

    // token change to the change address when overfunded: 1000 - 10 - 10 = 980
    const tokenChange = outs.find(
      (o: any) => o.type === 'Transfer' && o.value.type === 'TokenV1' && o.destination === changeAddresses[0],
    );
    expect(tokenChange).toBeDefined();
    expect(tokenChange.value.amount).toEqual({ atoms: TOKEN_ATOMS(980n), decimal: '980' });

    // token conservation: inputs = transfer + burn + change
    expect(tokenInputSum(tx, TOKEN_ID)).toBe(
      tokenOutputSum(tx, TOKEN_ID),
    );

    // coin side: no coin outputs → coin inputs only cover the tx fee (+ coin change)
    expect(coinInputSum(tx)).toBe(coinTransferSum(tx) + BigInt(tx.JSONRepresentation.fee.atoms));
  });

  test('IssueFungibleToken + IssueNft in one tx pre-encodes the IssueNft token id and backfills the JSON', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();

    const tx = (await client.buildRawTransaction({
      outputs: [
        {
          type: 'IssueFungibleToken',
          authority: TOKEN_AUTHORITY,
          is_freezable: false,
          metadata_uri: 'ipfs://QmExampleHash123',
          number_of_decimals: 11,
          token_ticker: 'XYZ2',
          total_supply: { type: 'Unlimited' },
        },
        {
          type: 'IssueNft',
          destination: USER_ADDRESS,
          data: NFT_DATA,
        },
      ],
    })) as AnyTx;

    const nft = tx.JSONRepresentation.outputs.find((o: any) => o.type === 'IssueNft');
    expect(nft).toBeDefined();

    // token id derived from the inputs and backfilled into the JSON before encoding
    expect(nft.token_id).not.toBe('');
    expect(nft.token_id).toMatch(/^[a-z0-9]{10,100}$/);

    // the wasm encoder accepted the pre-encoded id: transaction fully built
    expect(tx.HEXRepresentation_unsigned).toMatch(/^[0-9a-f]+$/);
    expect(tx.transaction_id).toMatch(/^[0-9a-f]{64}$/);
    expect(tx.BINRepresentation.outputs).toHaveLength(tx.JSONRepresentation.outputs.length);

    // both issuance protocol fees enter the accounting
    const nftFee = BigInt(nft_issuance_fee(200000n, Network.Testnet).atoms());
    const ftaFee = BigInt(fungible_token_issuance_fee(200000n, Network.Testnet).atoms());
    expect(coinInputSum(tx)).toBe(
      coinTransferSum(tx) + BigInt(tx.JSONRepresentation.fee.atoms) + nftFee + ftaFee,
    );
  });

  test('two IssueNft outputs in one tx are rejected with a clear message', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();

    await expect(
      client.buildRawTransaction({
        outputs: [
          { type: 'IssueNft', destination: USER_ADDRESS, data: NFT_DATA },
          { type: 'IssueNft', destination: FEE_ADDRESS, data: NFT_DATA },
        ],
      }),
    ).rejects.toThrow('Only one IssueNft output per transaction is supported');
  });

  test('DataDeposit includes data_deposit_fee in the coin requirement', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();

    const tx = (await client.buildRawTransaction({
      outputs: [{ type: 'DataDeposit', data: 'hello-raw' }],
    })) as AnyTx;

    // output preserved
    expect(tx.JSONRepresentation.outputs[0]).toMatchObject({ type: 'DataDeposit', data: 'hello-raw' });

    const depositFee = BigInt(data_deposit_fee(200000n, Network.Testnet).atoms());
    expect(depositFee).toBeGreaterThan(0n);

    // coin conservation: inputs = change + tx fee + data deposit fee
    expect(coinInputSum(tx)).toBe(
      coinTransferSum(tx) + BigInt(tx.JSONRepresentation.fee.atoms) + depositFee,
    );
  });

  test('DelegateStaking counts the stake amount in the coin requirement', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();

    const STAKE_ATOMS = '10000000000000'; // 100 ML

    const tx = (await client.buildRawTransaction({
      outputs: [
        { type: 'DelegateStaking', delegation_id: DELEGATION_ID, amount: { atoms: STAKE_ATOMS, decimal: '100' } },
      ],
    })) as AnyTx;

    const stake = tx.JSONRepresentation.outputs.find((o: any) => o.type === 'DelegateStaking');
    expect(stake).toMatchObject({ delegation_id: DELEGATION_ID, amount: { atoms: STAKE_ATOMS, decimal: '100' } });

    // coin conservation: inputs = stake + change + tx fee (no protocol fee for staking)
    expect(coinInputSum(tx)).toBe(
      BigInt(STAKE_ATOMS) + coinTransferSum(tx) + BigInt(tx.JSONRepresentation.fee.atoms),
    );
  });

  test('CreateOrder counts the give side in the coin and token requirements', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();

    // (a) coin give side → coin requirement
    const GIVE_ATOMS = '100000000000000'; // 1000 ML
    const ASK_ATOMS = TOKEN_ATOMS(5n); // 5 tokens

    const txCoinGive = (await client.buildRawTransaction({
      outputs: [
        {
          type: 'CreateOrder',
          conclude_destination: receiving[2],
          ask_currency: { type: 'TokenV1', token_id: TOKEN_ID },
          ask_balance: { atoms: ASK_ATOMS, decimal: '5' },
          give_currency: { type: 'Coin' },
          give_balance: { atoms: GIVE_ATOMS, decimal: '1000' },
          initially_asked: { atoms: ASK_ATOMS, decimal: '5' },
          initially_given: { atoms: GIVE_ATOMS, decimal: '1000' },
        },
      ],
    })) as AnyTx;

    const order = txCoinGive.JSONRepresentation.outputs.find((o: any) => o.type === 'CreateOrder');
    expect(order.ask_currency).toEqual({ type: 'TokenV1', token_id: TOKEN_ID });
    expect(order.give_currency).toEqual({ type: 'Coin' });
    expect(order.give_balance).toEqual({ atoms: GIVE_ATOMS, decimal: '1000' });

    // give side counted: inputs = give + change + fee; ask side needs no token inputs
    expect(coinInputSum(txCoinGive)).toBe(
      BigInt(GIVE_ATOMS) + coinTransferSum(txCoinGive) + BigInt(txCoinGive.JSONRepresentation.fee.atoms),
    );
    const tokenInputs = txCoinGive.JSONRepresentation.inputs.filter(
      (i: any) => i.input.input_type === 'UTXO' && i.utxo.value.type === 'TokenV1',
    );
    expect(tokenInputs).toHaveLength(0);

    // (b) token give side → token requirement
    const GIVE_TOKEN_ATOMS = TOKEN_ATOMS(10n);

    const txTokenGive = (await client.buildRawTransaction({
      outputs: [
        {
          type: 'CreateOrder',
          conclude_destination: receiving[2],
          ask_currency: { type: 'Coin' },
          ask_balance: { atoms: GIVE_ATOMS, decimal: '1000' },
          give_currency: { type: 'TokenV1', token_id: TOKEN_ID },
          give_balance: { atoms: GIVE_TOKEN_ATOMS, decimal: '10' },
          initially_asked: { atoms: GIVE_ATOMS, decimal: '1000' },
          initially_given: { atoms: GIVE_TOKEN_ATOMS, decimal: '10' },
        },
      ],
    })) as AnyTx;

    // token UTXOs selected for the give side; token conservation holds
    // (inputs = give_balance + token change; CreateOrder carries amounts outside `value`)
    expect(tokenInputSum(txTokenGive, TOKEN_ID)).toBeGreaterThan(0n);
    expect(tokenInputSum(txTokenGive, TOKEN_ID)).toBe(
      BigInt(GIVE_TOKEN_ATOMS) + tokenOutputSum(txTokenGive, TOKEN_ID),
    );

    // coin side only carries the tx fee
    expect(coinInputSum(txTokenGive)).toBe(
      coinTransferSum(txTokenGive) + BigInt(txTokenGive.JSONRepresentation.fee.atoms),
    );
  });

  test('forgeTransaction signs the built transaction via the wallet request', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();

    const args = {
      outputs: [coinTransferOutput(USER_ADDRESS, '1000000000000')],
    };

    const signed = await client.forgeTransaction(args);
    expect(signed).toBe('signed-transaction');

    expect(mocks.mojito.request).toHaveBeenCalledTimes(1);
    const [method, params] = mocks.mojito.request.mock.calls[0];
    expect(method).toBe('signTransaction');

    // the tx handed to the wallet is exactly the one buildRawTransaction produces
    const built = (await client.buildRawTransaction(args)) as AnyTx;
    expect(params.txData.JSONRepresentation).toEqual(built.JSONRepresentation);
    expect(params.txData.transaction_id).toBe(built.transaction_id);
    expect(params.txData.HEXRepresentation_unsigned).toBe(built.HEXRepresentation_unsigned);
  });
});

describe('buildRawTransaction normalization rejections', () => {
  test('rejects decimal spoofing: decimal must equal atoms / 1e11 for Coin', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();

    await expect(
      client.buildRawTransaction({
        outputs: [
          {
            type: 'Transfer',
            destination: USER_ADDRESS,
            value: { type: 'Coin', amount: { atoms: '50000000000000', decimal: '0.005' } },
          },
        ],
      }),
    ).rejects.toThrow('amount.decimal "0.005" does not match 50000000000000 atoms at 11 decimals ("500")');
  });

  test('rejects hex/string mismatch on metadata_uri', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();

    await expect(
      client.buildRawTransaction({
        outputs: [
          {
            type: 'IssueFungibleToken',
            authority: TOKEN_AUTHORITY,
            is_freezable: false,
            metadata_uri: { hex: 'aabb', string: 'x' },
            number_of_decimals: 11,
            token_ticker: 'XYZ2',
            total_supply: { type: 'Unlimited' },
          },
        ],
      }),
    ).rejects.toThrow('metadata_uri.hex does not match metadata_uri.string');
  });

  test('rejects oversized ticker and DataDeposit data with length-cap messages', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();

    await expect(
      client.buildRawTransaction({
        outputs: [
          {
            type: 'IssueFungibleToken',
            authority: TOKEN_AUTHORITY,
            is_freezable: false,
            metadata_uri: 'ipfs://x',
            number_of_decimals: 11,
            token_ticker: 'X'.repeat(33), // cap is 32
            total_supply: { type: 'Unlimited' },
          },
        ],
      }),
    ).rejects.toThrow('token_ticker must be at most 32 characters');

    await expect(
      client.buildRawTransaction({
        outputs: [{ type: 'DataDeposit', data: 'a'.repeat(4097) }], // cap is 4096
      }),
    ).rejects.toThrow('data must be at most 4096 characters');
  });
});

describe('mint netting and nonce sequencing', () => {
  test('mints are netted against same-token outputs: only the surplus comes from token UTXOs', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();

    const MINT_ATOMS = TOKEN_ATOMS(100n); // mint 100
    const OUT_ATOMS = TOKEN_ATOMS(150n); // transfer 150

    const tx = (await client.buildRawTransaction({
      outputs: [
        {
          type: 'Transfer',
          destination: USER_ADDRESS,
          value: { type: 'TokenV1', token_id: TOKEN_ID, amount: { atoms: OUT_ATOMS, decimal: '150' } },
        },
      ],
      inputs: [
        {
          input: {
            input_type: 'AccountCommand',
            command: 'MintTokens',
            token_id: TOKEN_ID,
            amount: { atoms: MINT_ATOMS, decimal: '100' },
          },
        },
      ],
    })) as AnyTx;

    // mint input preserved with auto nonce from token details
    const mint = tx.JSONRepresentation.inputs.find((i: any) => i.input.command === 'MintTokens');
    expect(mint.input.nonce).toBe(7);
    expect(mint.input.amount).toEqual({ atoms: MINT_ATOMS, decimal: '100' });

    // token UTXOs cover only the net 150 - 100 = 50 tokens (conservation asserted)
    const netFromUtxos = tokenInputSum(tx, TOKEN_ID) - tokenOutputSum(tx, TOKEN_ID, o => o.destination === changeAddresses[0]);
    expect(netFromUtxos).toBe(BigInt(OUT_ATOMS) - BigInt(MINT_ATOMS));

    // full token conservation including the mint: UTXO inputs + minted = outputs
    expect(tokenInputSum(tx, TOKEN_ID) + BigInt(MINT_ATOMS)).toBe(tokenOutputSum(tx, TOKEN_ID));

    // coin side: mint supply-change fee enters the coin requirement
    const supplyFee = BigInt(token_supply_change_fee(200000n, Network.Testnet).atoms());
    expect(coinInputSum(tx)).toBe(coinTransferSum(tx) + BigInt(tx.JSONRepresentation.fee.atoms) + supplyFee);
  });

  test('explicit nonce below next_nonce throws and explicit nonces advance the per-token counter', async () => {
    const client = await Client.create({ network: 'testnet', autoRestore: false });
    await client.connect();

    // next_nonce of the mocked token is 7 → nonce 3 is stale
    await expect(
      client.buildRawTransaction({
        outputs: [coinTransferOutput(USER_ADDRESS, '1000000000000')],
        inputs: [
          {
            input: {
              input_type: 'AccountCommand',
              command: 'MintTokens',
              token_id: TOKEN_ID,
              nonce: 3,
              amount: { atoms: TOKEN_ATOMS(100n), decimal: '100' },
            },
          },
        ],
      }),
    ).rejects.toThrow('is below the next expected nonce 7');

    // explicit nonce wins and advances the counter: the following auto input continues from it
    const tx = (await client.buildRawTransaction({
      outputs: [coinTransferOutput(USER_ADDRESS, '1000000000000')],
      inputs: [
        {
          input: {
            input_type: 'AccountCommand',
            command: 'MintTokens',
            token_id: TOKEN_ID,
            nonce: 42,
            amount: { atoms: TOKEN_ATOMS(100n), decimal: '100' },
          },
        },
        {
          input: {
            input_type: 'AccountCommand',
            command: 'MintTokens',
            token_id: TOKEN_ID,
            amount: { atoms: TOKEN_ATOMS(50n), decimal: '50' },
          },
        },
      ],
    })) as AnyTx;

    const mints = tx.JSONRepresentation.inputs.filter((i: any) => i.input.command === 'MintTokens');
    expect(mints).toHaveLength(2);
    expect(mints[0].input.nonce).toBe(42);
    expect(mints[1].input.nonce).toBe(43); // explicit 42 advanced the counter past next_nonce 7
  });
});
