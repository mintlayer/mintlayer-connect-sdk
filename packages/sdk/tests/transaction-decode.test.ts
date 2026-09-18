// Pins the refactored decode/assemble split:
//
//  1. `Transaction.fromHEX` decodes ALL transaction input/output variants into
//     the explorer-style JSON shape (`inputs[]`, `outputs[]`, `id`).
//  2. `Transaction.assembleRaw` is the single assembly engine used by
//     `client.buildRawTransaction` — so re-encoding a decoded transaction
//     through `getTransactionBINrepresentation` + `encode_transaction` must
//     reproduce the exact unsigned bytes the assembler produced.
//
// Round-trip fixtures use UTXOs whose outpoint indexes align with their input
// positions (index 0 coin + index 1 token) — see the note on `decodedInput`
// index handling in the module report for why index-aligned fixtures are used.
import fetchMock from 'jest-fetch-mock';
import { encode_transaction } from '@mintlayer/wasm-lib';
import { BuiltTransaction } from '../src/mintlayer-connect-sdk';
import { FEE_BLOCK_HEIGHT, Transaction } from '../src/transaction';
import { atomsToDecimal, mergeUint8Arrays } from '../src/utils';
import { createConnectedClient, MOCK_TOKEN_AUTHORITY, MOCK_TOKEN_ID, setupApiMocks } from './helpers/api-mocks';

import { addresses, utxos as ACCOUNT_UTXOS } from './__mocks__/accounts/account_01';

const receiving = addresses.addressesByChain.mintlayer.receiving;
const changeAddresses = addresses.addressesByChain.mintlayer.change;

const USER_ADDRESS = receiving[0];
const FEE_ADDRESS = receiving[1];
const TOKEN_AUTHORITY = MOCK_TOKEN_AUTHORITY;
const TOKEN_ID = MOCK_TOKEN_ID;
/** Decimals of the mocked token fixture (8). */
const TOKEN_DECIMALS: number = 8;
const TOKEN_ATOMS = (tokens: bigint) => (tokens * BigInt(10 ** TOKEN_DECIMALS)).toString();

/**
 * Assertion view of the public build result (same shape as the
 * `raw-transaction.test.ts` helper): the `inputs`/`outputs`/`fee` unions are
 * loosened so the tests can index into discriminated fields directly.
 */
type LooseBuiltTransaction = Omit<BuiltTransaction, 'JSONRepresentation'> & {
  JSONRepresentation: Omit<BuiltTransaction['JSONRepresentation'], 'inputs' | 'outputs' | 'fee'> & {
    inputs: any[];
    outputs: any[];
    fee: { atoms: string; decimal: string };
  };
};

/**
 * UTXO fixtures for the round-trip tests: the coin UTXO carries outpoint
 * index 0 and the token UTXO outpoint index 1. The assembler orders inputs
 * [coin..., token...], so each decoded input's array position coincides with
 * its true outpoint index and decode → re-encode is byte-exact end to end.
 */
const ROUNDTRIP_UTXOS = [
  {
    outpoint: {
      index: 0,
      source_id: 'af3b5fad20f6f97eb210934e942176f7f7d0f70423590659ee0e0217053a7cab',
      source_type: 'Transaction',
    },
    utxo: {
      destination: USER_ADDRESS,
      type: 'Transfer',
      // same scale as the account_01 coin fixtures — large enough to cover
      // the data-deposit and issuance protocol fees at FEE_BLOCK_HEIGHT
      value: { type: 'Coin', amount: { atoms: '1703205604300000', decimal: '17032056.043043' } },
    },
  },
  {
    outpoint: {
      index: 1,
      source_id: 'cdcee4a44823978cc50245eff518a562c4461e74fee2ce2f46cade822f657e0d',
      source_type: 'Transaction',
    },
    utxo: {
      destination: changeAddresses[0],
      type: 'Transfer',
      value: {
        type: 'TokenV1',
        token_id: TOKEN_ID,
        amount: { atoms: '100000000000', decimal: '1000' },
      },
    },
  },
];

/**
 * Re-encodes a decoded transaction from its explorer-style JSON:
 * `getTransactionBINrepresentation` binarises the decoded inputs/outputs and
 * `encode_transaction` assembles the unsigned bytes. The result must equal
 * the assembler's `HEXRepresentation_unsigned` byte for byte.
 */
function reencodeHex(rt: Transaction): string {
  const json = rt.json() as any;
  // `getTransactionBINrepresentation` reads `input.utxo.destination` only for
  // its signed-size estimate — the encoded bytes never contain it, and the
  // decode shape intentionally drops the utxo payload (real consumers restore
  // it via `enrichUtxo`). A syntactically valid address keeps the size
  // estimator happy without influencing byte equality.
  const binInput = {
    ...json,
    inputs: json.inputs.map((entry: any) =>
      entry.input?.input_type === 'UTXO' ? { ...entry, utxo: { destination: USER_ADDRESS } } : entry,
    ),
  };
  const bin = rt.getTransactionBINrepresentation(binInput, 1, Number(FEE_BLOCK_HEIGHT));
  const bytes = encode_transaction(mergeUint8Arrays(bin.inputs), mergeUint8Arrays(bin.outputs), BigInt(0));
  return bytes.reduce((acc, b) => acc + b.toString(16).padStart(2, '0'), '');
}

/**
 * Builds a raw transaction through the public client API and decodes its
 * unsigned hex back into a `Transaction`. `options.utxos` swaps the served
 * UTXO fixtures before the client is created; `options.inputs` passes
 * explicit (account-command) inputs through to `buildRawTransaction`.
 */
async function buildAndDecode(
  outputs: any[],
  options: { utxos?: any[]; inputs?: any[] } = {},
): Promise<{ tx: LooseBuiltTransaction; rt: Transaction; json: any }> {
  if (options.utxos) {
    setupApiMocks({ utxos: options.utxos });
  }
  const client = await createConnectedClient();
  const tx = (await client.buildRawTransaction({
    outputs,
    inputs: options.inputs,
  })) as LooseBuiltTransaction;
  const rt = Transaction.fromHEX(tx.HEXRepresentation_unsigned, { network: 'testnet' });
  return { tx, rt, json: rt.json() as any };
}

beforeEach(() => {
  fetchMock.enableMocks();
  setupApiMocks();
});

afterEach(() => {
  fetchMock.disableMocks();
});

describe('Transaction.fromHEX decode + re-encode round-trip', () => {
  test('Transfer (Coin and TokenV1) round-trips byte-identically and keeps token_id', async () => {
    const { tx, rt, json } = await buildAndDecode(
      [
        {
          type: 'Transfer',
          destination: USER_ADDRESS,
          value: { type: 'Coin', amount: { atoms: '1000000', decimal: atomsToDecimal('1000000', 11) } },
        },
        {
          type: 'Transfer',
          destination: USER_ADDRESS,
          value: {
            type: 'TokenV1',
            token_id: TOKEN_ID,
            amount: { atoms: TOKEN_ATOMS(3n), decimal: atomsToDecimal(TOKEN_ATOMS(3n), TOKEN_DECIMALS) },
          },
        },
      ],
      { utxos: ROUNDTRIP_UTXOS },
    );

    // outputs[0]: the Coin transfer — decimal recomputed at the fixed 11
    // coin decimals, exactly as the assembler normalizes it
    expect(json.outputs[0].type).toBe('Transfer');
    expect(json.outputs[0].destination).toBe(USER_ADDRESS);
    expect(json.outputs[0].value).toEqual({
      type: 'Coin',
      amount: { atoms: '1000000', decimal: '0.00001' },
    });

    // outputs[1]: the TokenV1 transfer keeps its token_id; the token decimal
    // is a placeholder equal to the atoms string by design (token decimals
    // are not recoverable at decode time — consumers format via metadata)
    expect(json.outputs[1].value).toEqual({
      type: 'TokenV1',
      token_id: TOKEN_ID,
      amount: { atoms: TOKEN_ATOMS(3n), decimal: TOKEN_ATOMS(3n) },
    });

    // every input decodes as a canonical UTXO input
    expect(json.inputs.length).toBeGreaterThan(0);
    for (const entry of json.inputs) {
      expect(entry.input.input_type).toBe('UTXO');
      expect(entry.input.source_id).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.input.source_type).toBe('Transaction');
    }

    // transaction identity survives the decode
    expect(json.id).toBe(tx.transaction_id);
    expect(json.id).toMatch(/^[0-9a-f]{64}$/);

    // the decoded JSON re-encodes to the exact unsigned bytes
    expect(reencodeHex(rt)).toBe(tx.HEXRepresentation_unsigned);
  });

  test('LockThenTransfer round-trips with a canonical lock', async () => {
    const { tx, rt, json } = await buildAndDecode(
      [
        {
          type: 'LockThenTransfer',
          destination: USER_ADDRESS,
          value: { type: 'Coin', amount: { atoms: '1000000', decimal: atomsToDecimal('1000000', 11) } },
          lock: { type: 'ForBlockCount', content: 10 },
        },
      ],
      { utxos: ROUNDTRIP_UTXOS },
    );

    expect(json.outputs[0].type).toBe('LockThenTransfer');
    // the numeric lock content decodes canonically as a string (BigInt is
    // applied again at encoding time)
    expect(json.outputs[0].lock).toEqual({ type: 'ForBlockCount', content: '10' });
    expect(json.outputs[0].destination).toBe(USER_ADDRESS);

    expect(reencodeHex(rt)).toBe(tx.HEXRepresentation_unsigned);
  });

  test('DataDeposit, BurnToken, CreateDelegationId, DelegateStaking round-trip', async () => {
    const cases: any[] = [
      { type: 'DataDeposit', data: 'hello explorer' },
      {
        type: 'BurnToken',
        value: { type: 'Coin', amount: { atoms: '123', decimal: atomsToDecimal('123', 11) } },
      },
      {
        type: 'BurnToken',
        value: {
          type: 'TokenV1',
          token_id: TOKEN_ID,
          amount: { atoms: '7', decimal: atomsToDecimal('7', TOKEN_DECIMALS) },
        },
      },
      {
        type: 'CreateDelegationId',
        destination: USER_ADDRESS,
        pool_id: 'tpool1dwpe7zy0mhagnwl36ywt5q20xxvu5dwmph4z6q8sc0a3srz5h8jqr0r2yg',
      },
      {
        type: 'DelegateStaking',
        delegation_id: 'tdelg1d57nmkp24k0rh0fgsjnjy78wxql8wvgr420ncdsesvssvdgfcg6sx6262w',
        amount: { atoms: '2000', decimal: atomsToDecimal('2000', 11) },
      },
    ];

    for (const output of cases) {
      const { tx, rt, json } = await buildAndDecode([output], { utxos: ROUNDTRIP_UTXOS });

      expect(json.outputs[0].type).toBe(output.type);
      // the decoded JSON re-encodes to the exact unsigned bytes for every
      // one of these output variants
      expect(reencodeHex(rt)).toBe(tx.HEXRepresentation_unsigned);
    }
  });

  test('IssueFungibleToken decodes {hex,string} fields and supply type', async () => {
    const { tx, rt, json } = await buildAndDecode(
      [
        {
          type: 'IssueFungibleToken',
          authority: TOKEN_AUTHORITY,
          is_freezable: false,
          metadata_uri: 'ipfs://QmExampleHash123',
          number_of_decimals: 11,
          token_ticker: 'XYZ2',
          total_supply: { type: 'Fixed', amount: { atoms: '1000000000000', decimal: '10' } },
        },
      ],
      { utxos: ROUNDTRIP_UTXOS },
    );

    const issuance = json.outputs[0];
    expect(issuance.type).toBe('IssueFungibleToken');
    expect(issuance.authority).toBe(TOKEN_AUTHORITY);
    expect(issuance.is_freezable).toBe(false);
    expect(issuance.number_of_decimals).toBe(11);
    // byte fields decode as {hex, string} pairs
    expect(issuance.token_ticker).toEqual({ hex: '58595a32', string: 'XYZ2' });
    expect(issuance.metadata_uri.string).toBe('ipfs://QmExampleHash123');
    // a Fixed supply decodes back into the tagged {type, amount} shape
    expect(issuance.total_supply).toEqual({
      type: 'Fixed',
      amount: { atoms: '1000000000000', decimal: '10' },
    });

    expect(reencodeHex(rt)).toBe(tx.HEXRepresentation_unsigned);
  });

  test('Htlc and CreateOrder round-trip', async () => {
    // (a) Htlc with a Coin value
    const htlc = await buildAndDecode(
      [
        {
          type: 'Htlc',
          value: { type: 'Coin', amount: { atoms: '900', decimal: atomsToDecimal('900', 11) } },
          htlc: {
            spend_key: USER_ADDRESS,
            refund_key: USER_ADDRESS,
            secret_hash: '0000000000000000000000000000000000000000',
            refund_timelock: { type: 'ForBlockCount', content: 10 },
          },
        },
      ],
      { utxos: ROUNDTRIP_UTXOS },
    );

    const htlcOut = htlc.json.outputs[0];
    expect(htlcOut.type).toBe('Htlc');
    // the secret hash decodes as a hex field
    expect(htlcOut.htlc.secret_hash.hex).toBe('0000000000000000000000000000000000000000');
    expect(htlcOut.htlc.refund_timelock).toEqual({ type: 'ForBlockCount', content: '10' });
    expect(reencodeHex(htlc.rt)).toBe(htlc.tx.HEXRepresentation_unsigned);

    // (b) CreateOrder asking Coin, giving the token
    const order = await buildAndDecode(
      [
        {
          type: 'CreateOrder',
          ask_balance: { atoms: '1000', decimal: atomsToDecimal('1000', 11) },
          ask_currency: { type: 'Coin' },
          give_balance: { atoms: '2000', decimal: atomsToDecimal('2000', TOKEN_DECIMALS) },
          give_currency: { type: 'TokenV1', token_id: TOKEN_ID },
          initially_asked: { atoms: '1000', decimal: atomsToDecimal('1000', 11) },
          initially_given: { atoms: '2000', decimal: atomsToDecimal('2000', TOKEN_DECIMALS) },
          conclude_destination: USER_ADDRESS,
        },
      ],
      { utxos: ROUNDTRIP_UTXOS },
    );

    const orderOut = order.json.outputs[0];
    expect(orderOut.type).toBe('CreateOrder');
    expect(orderOut.ask_currency).toEqual({ type: 'Coin' });
    expect(orderOut.give_currency).toEqual({ type: 'TokenV1', token_id: TOKEN_ID });
    expect(orderOut.conclude_destination).toBe(USER_ADDRESS);
    expect(reencodeHex(order.rt)).toBe(order.tx.HEXRepresentation_unsigned);
  });

  test('AccountCommand inputs decode with command fields and round-trip', async () => {
    // default account_01 fixtures: the mocked token exposes next_nonce 7 and
    // the selected UTXO lands at input position 1 with outpoint index 1
    const { tx, rt, json } = await buildAndDecode(
      [
        {
          type: 'Transfer',
          destination: FEE_ADDRESS,
          value: { type: 'Coin', amount: { atoms: '1000', decimal: atomsToDecimal('1000', 11) } },
        },
      ],
      {
        inputs: [
          {
            input: {
              input_type: 'AccountCommand',
              command: 'MintTokens',
              token_id: TOKEN_ID,
              amount: { atoms: TOKEN_ATOMS(5n), decimal: atomsToDecimal(TOKEN_ATOMS(5n), TOKEN_DECIMALS) },
            },
          },
        ],
      },
    );

    const command = json.inputs.find((entry: any) => entry.input.input_type === 'AccountCommand');
    expect(command).toBeDefined();
    // casing regression guard: the command name decodes as the SDK's
    // canonical 'MintTokens', not the wasm tag or an uppercased variant
    expect(command.input.command).toBe('MintTokens');
    expect(command.input.token_id).toBe(TOKEN_ID);
    expect(command.input.amount.atoms).toBe(TOKEN_ATOMS(5n));
    // nonce auto-looked-up from the mocked token details (next_nonce 7)
    expect(command.input.nonce).toBe(7);

    expect(reencodeHex(rt)).toBe(tx.HEXRepresentation_unsigned);
  });

  test('IssueNft decode keeps data fields', async () => {
    const { json } = await buildAndDecode(
      [
        {
          type: 'IssueNft',
          destination: USER_ADDRESS,
          data: {
            name: 'NftName',
            ticker: 'NFT',
            description: 'desc',
            media_hash: 'deadbeef',
            media_uri: 'ipfs://media',
            icon_uri: 'ipfs://icon',
            additional_metadata_uri: 'ipfs://extra',
          },
        },
      ],
      { utxos: ROUNDTRIP_UTXOS },
    );

    const nft = json.outputs[0];
    expect(nft.type).toBe('IssueNft');
    // string metadata decodes as {hex, string} pairs
    expect(nft.data.name.string).toBe('NftName');
    expect(nft.data.ticker.string).toBe('NFT');
    // the media hash round-trips through its utf-8 bytes: the encoder stores
    // the ascii bytes of "deadbeef", so the decoded hex is that byte string
    expect(nft.data.media_hash.hex).toBe('6465616462656566');
    expect(nft.data.media_hash.string).toBe('deadbeef');
    expect(nft.data.media_uri.string).toBe('ipfs://media');
    // the token id derived from the inputs is backfilled before encoding and
    // survives the decode
    expect(nft.token_id).toBeTruthy();
    // NOTE: no round-trip assertion here — the decode intentionally drops the
    // IssueNft destination (the wasm decode shape lacks it), so the decoded
    // JSON cannot be re-encoded losslessly for this output type.
  });

  test('fee parity: fluent builder vs raw assembler', async () => {
    const client = await createConnectedClient();

    const rawTx = (await client.buildRawTransaction({
      outputs: [
        {
          type: 'Transfer',
          destination: FEE_ADDRESS,
          value: { type: 'Coin', amount: { atoms: '1000000', decimal: atomsToDecimal('1000000', 11) } },
        },
      ],
    })) as LooseBuiltTransaction;

    // the fluent class drives the same assembly engine with the same UTXO
    // set the mocked API serves, so the converged fee must be identical
    const fluent = new Transaction({ network: 'testnet' })
      .setChangeAddress(changeAddresses[0])
      .addOutput({
        type: 'Transfer',
        destination: FEE_ADDRESS,
        value: { type: 'Coin', amount: { atoms: '1000000', decimal: '0.001' } },
      } as any)
      .withUTXO(ACCOUNT_UTXOS)
      .build();

    expect(fluent.getFee().atoms).toBe(rawTx.JSONRepresentation.fee.atoms);
  });
});

describe('Review-round regression pins', () => {
  test('UnmintTokens decodes the bare token-id payload with auto nonce and round-trips', async () => {
    const { tx, rt, json } = await buildAndDecode(
      [
        {
          type: 'Transfer',
          destination: FEE_ADDRESS,
          value: { type: 'Coin', amount: { atoms: '1000', decimal: atomsToDecimal('1000', 11) } },
        },
      ],
      {
        inputs: [
          {
            input: {
              input_type: 'AccountCommand',
              command: 'UnmintTokens',
              token_id: TOKEN_ID,
              amount: { atoms: TOKEN_ATOMS(2n) },
            },
          },
        ],
      },
    );

    const command = json.inputs.find((entry: any) => entry.input?.input_type === 'AccountCommand');
    expect(command).toBeDefined();
    expect(command.input.command).toBe('UnmintTokens');
    // regression: the wasm decode payload for UnmintTokens is a BARE token-id
    // string (no [token_id, amount] pair) — the old `second.atoms` accessor
    // used to crash here
    expect(command.input.token_id).toBe(TOKEN_ID);
    // mock token next_nonce is 7 → auto nonce 7
    expect(command.input.nonce).toBe(7);
    // The amount never enters the bytes in either direction:
    // `encode_input_for_unmint_tokens` encodes only (token_id, nonce) and the
    // decode payload has no amount — so the round-trip stays byte-identical.
    expect(reencodeHex(rt)).toBe(tx.HEXRepresentation_unsigned);
  });

  test('assembleRaw guards: UTXOs and change address are required', () => {
    // no withUTXO at all → hard guard (previously crashed deep in selection)
    expect(() =>
      Transaction.assembleRaw(
        { outputs: [], inputs: [], requiredCoin: 0n, requiredToken: 0n, baseFee: 0n } as any,
        { network: 'testnet', changeAddress: changeAddresses[0] },
      ),
    ).toThrow('UTXOs are required');

    // same guard with an actual coin requirement (empty UTXO plan)
    expect(() =>
      Transaction.assembleRaw(
        {
          outputs: [
            { type: 'Transfer', destination: USER_ADDRESS, value: { type: 'Coin', amount: { atoms: '1' } } },
          ],
          inputs: [],
          requiredCoin: 1n,
          requiredToken: 0n,
          baseFee: 0n,
        } as any,
        { network: 'testnet', changeAddress: changeAddresses[0] },
      ),
    ).toThrow('UTXOs are required');

    // missing change address → guard fires before any assembly work
    expect(() =>
      Transaction.assembleRaw(
        {
          outputs: [],
          inputs: [],
          requiredCoin: 0n,
          requiredToken: 0n,
          baseFee: 0n,
          withUTXO: [],
        } as any,
        { network: 'testnet', changeAddress: '' },
      ),
    ).toThrow('change address');
  });

  test('forceSpendUtxo spends the given outpoint exactly once (no double spend vs auto-selection)', async () => {
    const client = await createConnectedClient();

    // the largest coin UTXO of the mocked account — auto-selection would pick
    // it for any transfer, so forcing it MUST evict it from auto-selection
    const forcedEntry = {
      outpoint: {
        index: 1,
        source_id: 'af3b5fad20f6f97eb210934e942176f7f7d0f70423590659ee0e0217053a7cab',
        source_type: 'Transaction',
      },
      utxo: {
        destination: 'tmt1qxrwc3gy2lgf4kvqwwfa388vn3cavgrqyyrgswe6',
        type: 'Transfer',
        value: { type: 'Coin', amount: { atoms: '1703205604300000', decimal: '17032.056043' } },
      },
    };

    const outputs = [
      {
        type: 'Transfer',
        destination: USER_ADDRESS,
        value: { type: 'Coin', amount: { atoms: '1000', decimal: atomsToDecimal('1000', 11) } },
      },
    ];

    // baseline: without force, auto-selection spends the outpoint once
    const plain = (await client.buildRawTransaction({ outputs: outputs as any })) as LooseBuiltTransaction;
    const plainSpent = plain.JSONRepresentation.inputs.filter(
      (i: any) => i.input?.input_type === 'UTXO' && i.input.source_id === forcedEntry.outpoint.source_id && i.input.index === 1,
    );
    expect(plainSpent).toHaveLength(1);

    // forced build must not crash …
    const forced = (await client.buildRawTransaction({
      outputs: outputs as any,
      opts: { forceSpendUtxo: [forcedEntry as any] },
    })) as LooseBuiltTransaction;

    const spent = forced.JSONRepresentation.inputs.filter(
      (i: any) =>
        i.input?.input_type === 'UTXO' && i.input.source_id === forcedEntry.outpoint.source_id && i.input.index === 1,
    );
    // … and the forced outpoint appears EXACTLY ONCE — a duplicate entry would
    // be a double spend inside one transaction plus double-counted change math
    expect(spent).toHaveLength(1);
    expect(spent[0].utxo.value.amount.atoms).toBe('1703205604300000');
  });

  test('forceSpendUtxo accepts an HTLC-shaped entry alongside a plain transfer', async () => {
    const client = await createConnectedClient();

    // HTLC UTXOs are never auto-selected; a forced HTLC entry must assemble
    // with just its outpoint (witness handling is the signer's job)
    const htlcOutpoint = {
      index: 0,
      source_id: '1111111111111111111111111111111111111111111111111111111111111111',
      source_type: 'Transaction',
    };
    const tx = (await client.buildRawTransaction({
      outputs: [
        {
          type: 'Transfer',
          destination: USER_ADDRESS,
          value: { type: 'Coin', amount: { atoms: '1000', decimal: atomsToDecimal('1000', 11) } },
        },
      ],
      opts: {
        forceSpendUtxo: [
          {
            outpoint: htlcOutpoint,
            utxo: {
              type: 'Htlc',
              value: { type: 'Coin', amount: { atoms: '1000000000000', decimal: '10' } },
              htlc: {
                secret_hash: '0000000000000000000000000000000000000000',
                spend_key: USER_ADDRESS,
                refund_key: USER_ADDRESS,
                refund_timelock: { type: 'ForBlockCount', content: 10 },
              },
            },
          } as any,
        ],
      },
    })) as LooseBuiltTransaction;

    const htlcInput = tx.JSONRepresentation.inputs.find(
      (i: any) => i.input?.input_type === 'UTXO' && i.input.source_id === htlcOutpoint.source_id && i.input.index === 0,
    );
    expect(htlcInput).toBeDefined();
    expect(htlcInput.utxo.type).toBe('Htlc');
  });

  test('DelegationWithdraw-style fee deduction does not compound across fee iterations', () => {
    const AMOUNT = '1099511627777'; // 2^40 + 1 — varint-boundary scale amount
    const assembled = Transaction.assembleRaw(
      {
        outputs: [
          {
            type: 'LockThenTransfer',
            destination: USER_ADDRESS,
            value: { type: 'Coin', amount: { atoms: AMOUNT, decimal: atomsToDecimal(AMOUNT, 11) } },
            lock: { type: 'ForBlockCount', content: 10 },
          },
        ],
        inputs: [],
        requiredCoin: 0n, // withdraw: funds come from the delegation input, not coin UTXOs
        requiredToken: 0n,
        baseFee: 0n,
        deductFeeFromFirstOutput: true,
        withUTXO: [],
      } as any,
      { network: 'testnet', changeAddress: changeAddresses[0] },
    );

    const j = assembled.JSONRepresentation as any;
    const outAtoms = BigInt(j.outputs[0].value.amount.atoms);
    const feeAtoms = BigInt(j.fee.atoms);
    // THE invariant: output + embedded fee === original amount (no compounding,
    // no silent burn) — the deduction must be relative to the ORIGINAL amount
    // in every fee iteration, never applied onto the previous iteration's
    // mutated output value
    expect(outAtoms + feeAtoms).toBe(BigInt(AMOUNT));
  });

  test('fee conservation across varint-boundary amounts on the normal path', async () => {
    const client = await createConnectedClient();
    // 2^32+1, 2^40+1, 2^48+1 — amount encodings flip varint length at these
    // scales, which is exactly where the fee loop can change its mind (the
    // mocked account holds ~3.8e15 coin atoms, so 2^48 is the largest sweep
    // entry that still fits)
    const boundaryAmounts = ['4294967297', '1099511627777', '281474976710657'];

    for (const AMOUNT of boundaryAmounts) {
      const tx = (await client.buildRawTransaction({
        outputs: [
          {
            type: 'Transfer',
            destination: USER_ADDRESS,
            value: { type: 'Coin', amount: { atoms: AMOUNT, decimal: atomsToDecimal(AMOUNT, 11) } },
          },
        ],
      })) as LooseBuiltTransaction;

      const inputAtoms = tx.JSONRepresentation.inputs
        .filter((i: any) => i.input?.input_type === 'UTXO')
        .reduce((acc: bigint, i: any) => acc + BigInt(i.utxo.value.amount.atoms), 0n);
      const outputAtoms = tx.JSONRepresentation.outputs.reduce(
        (acc: bigint, o: any) => acc + BigInt(o.value.amount.atoms),
        0n,
      );
      // inputs − outputs === fee: no atoms lost or invented
      expect(inputAtoms - outputAtoms).toBe(BigInt(tx.JSONRepresentation.fee.atoms));
    }
  });
});
