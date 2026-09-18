import {
  Amount,
  encode_create_order_output,
  encode_input_for_change_token_authority,
  encode_input_for_change_token_metadata_uri,
  encode_input_for_conclude_order,
  encode_input_for_fill_order,
  encode_input_for_freeze_token,
  encode_input_for_lock_token_supply,
  encode_input_for_mint_tokens,
  encode_input_for_unfreeze_token,
  encode_input_for_unmint_tokens,
  encode_input_for_utxo,
  encode_input_for_withdraw_from_delegation,
  encode_lock_for_block_count,
  encode_lock_until_time,
  encode_outpoint_source_id,
  encode_output_coin_burn,
  encode_output_create_delegation,
  encode_output_data_deposit,
  encode_output_delegate_staking,
  encode_output_htlc,
  encode_output_issue_fungible_token,
  encode_output_issue_nft,
  encode_output_lock_then_transfer,
  encode_output_token_burn,
  encode_output_token_lock_then_transfer,
  encode_output_token_transfer,
  encode_output_transfer,
  encode_transaction,
  estimate_transaction_size,
  FreezableToken,
  get_token_id,
  get_transaction_id,
  SourceId,
  Network,
  TokenUnfreezable,
  TotalSupply,
} from '@mintlayer/wasm-lib';

import * as wasmLib from '@mintlayer/wasm-lib';

import { mergeUint8Arrays, atomsToDecimal, stringToUint8Array, uint8ArrayToHex } from './utils';
import { UtxoEntry, UtxoInput } from './types/transaction';
import type { LockThenTransferOutput, IssueNftOutput, Input, Output } from './types/transaction';

// Internal working state: `id`/`fee` are attached progressively during
// build/fromHEX, so the class works with the loose shape internally.
type TransactionJSON = any;

type Utxo = any;

/**
 * The single fee-rate constant used by every build path. There is no live
 * feerate source yet — see the TODO in the assembler — so both the fluent
 * builder and the raw assembler MUST use this same value to stay in sync.
 */
export const FEE_AMOUNT_PER_KB = BigInt('100000000000');

/**
 * Block height used for height-dependent protocol fees and issuance
 * encodings when the caller has not set one. The chain rejects stale fee
 * heights below the current tip, so this is kept comfortably ahead; the
 * raw assembler has always used it, and it is the default for the fluent
 * builder when no block height was passed to the constructor.
 */
export const FEE_BLOCK_HEIGHT = 200000n;

/**
 * Everything the assembler needs that does not belong to the transaction
 * itself: which network we are on and where change outputs go.
 */
export interface AssembleEnvironment {
  network: 'mainnet' | 'testnet';
  changeAddress: string;
  currentBlockHeight?: number | string | bigint;
}

/**
 * A fully normalized transaction plan — canonical inputs/outputs plus the
 * computed coin/token requirements — ready for UTXO selection, the fee
 * loop and encoding. Produced by the Client's raw-argument preparation or
 * by the fluent builder's declared outputs.
 */
export interface PreparedTransaction {
  outputs: Output[];
  inputs: Input[];
  requiredCoin: bigint;
  requiredToken: bigint;
  sendToken?: { token_id: string; number_of_decimals: number };
  baseFee: bigint;
  deductFeeFromFirstOutput?: boolean;
  withUTXO?: Utxo[];
  forceSpendUtxo?: Utxo[];
}

export interface AssembledTransactionData {
  JSONRepresentation: TransactionJSON;
  BINRepresentation: { inputs: Uint8Array[]; outputs: Uint8Array[]; transactionsize: number };
  HEXRepresentation_unsigned: string;
  transaction_id: string;
}

const MAX_FEE_ATTEMPTS = 10;

// ── Shared assembly core ──────────────────────────────────────────────────────
// One implementation of UTXO selection, input encoding, fee convergence and
// transaction encoding — used by both the fluent builder (build()) and the
// raw assembler (Transaction.assembleRaw). Previously these existed twice
// (class + Client) and had already drifted apart.

/**
 * Hardened UTXO selection: NFT UTXOs are treated as spendable 1-unit token
 * outputs, HTLC UTXOs must be spent manually and are filtered out, and an
 * extra UTXO is appended when the selection exactly matches the target so
 * the fee can still grow during convergence.
 */
function selectUTXOsFor(utxos: UtxoEntry[], amount: bigint, token_id: string | null): UtxoInput[] {
  // HTLC outputs are excluded: spending them requires the preimage (secret),
  // so they must be claimed explicitly via forceSpendUtxo, never auto-selected.
  const transferableUtxoTypes = ['Transfer', 'LockThenTransfer', 'IssueNft'];
  const filteredUtxos: any[] = utxos
    .map((utxo) => {
      if (utxo.utxo.type === 'IssueNft') {
        return {
          ...utxo,
          utxo: {
            ...utxo.utxo,
            value: {
              amount: { atoms: 1, decimal: 1 },
              type: 'TokenV1',
              token_id: utxo.utxo.token_id,
            },
          },
        };
      }
      return utxo;
    })
    .filter((utxo) => transferableUtxoTypes.includes(utxo.utxo.type))
    .filter((utxo) => {
      if (utxo.utxo.type === 'IssueNft') {
        return utxo.utxo.token_id === token_id;
      }
      if (token_id === null) {
        return utxo.utxo.value.type === 'Coin';
      }
      if (utxo.utxo.value.type === 'TokenV1') {
        return utxo.utxo.value.token_id === token_id;
      }
      return false;
    });

  let balance = BigInt(0);
  const utxosToSpend: UtxoEntry[] = [];
  let lastIndex = 0;

  filteredUtxos.sort((a, b) => Number(BigInt(b.utxo.value.amount.atoms) - BigInt(a.utxo.value.amount.atoms)));

  for (let i = 0; i < filteredUtxos.length; i++) {
    lastIndex = i;
    const utxoBalance = BigInt(filteredUtxos[i].utxo.value.amount.atoms);
    if (balance < amount) {
      balance += utxoBalance;
      utxosToSpend.push(filteredUtxos[i]);
    } else {
      break;
    }
  }

  if (balance === amount && filteredUtxos[lastIndex + 1]) {
    utxosToSpend.push(filteredUtxos[lastIndex + 1]);
  }

  return utxosToSpend.map((item: UtxoEntry) => ({
    input: { ...item.outpoint, input_type: 'UTXO' },
    utxo: item.utxo,
  }));
}

/**
 * Encodes the transaction inputs (account commands first, then UTXO inputs).
 * Input bytes do not depend on the outputs, so this can be used standalone —
 * e.g. to derive the token id of an IssueNft output before encoding it.
 */
function getTransactionInputsBytesFor(
  transactionJSONrepresentation: TransactionJSON,
  network: Network,
  blockHeight: bigint,
): Uint8Array[] {
  const inputs = transactionJSONrepresentation.inputs;

  const inputsIds = (inputs as UtxoInput[])
    .filter(({ input }) => input.input_type === 'UTXO')
    .map(({ input }) => {
      const bytes = Uint8Array.from(input.source_id.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
      return encode_input_for_utxo(encode_outpoint_source_id(bytes, SourceId.Transaction), input.index);
    });

  const inputCommands = (inputs as any[])
    .filter(({ input }) => input.input_type === 'AccountCommand' || input.input_type === 'Account')
    .map(({ input }) => {
      if (input.command === 'ConcludeOrder') {
        return encode_input_for_conclude_order(input.order_id, BigInt(input.nonce), blockHeight, network);
      }
      if (input.command === 'FillOrder') {
        return encode_input_for_fill_order(
          input.order_id,
          Amount.from_atoms(input.fill_atoms),
          input.destination,
          BigInt(input.nonce),
          blockHeight,
          network,
        );
      }
      if (input.command === 'MintTokens') {
        return encode_input_for_mint_tokens(
          input.token_id,
          Amount.from_atoms(input.amount.atoms),
          BigInt(input.nonce),
          network,
        );
      }
      if (input.command === 'UnmintTokens') {
        return encode_input_for_unmint_tokens(input.token_id, BigInt(input.nonce), network);
      }
      if (input.command === 'LockTokenSupply') {
        return encode_input_for_lock_token_supply(input.token_id, BigInt(input.nonce), network);
      }
      if (input.command === 'ChangeTokenAuthority') {
        return encode_input_for_change_token_authority(
          input.token_id,
          input.new_authority,
          BigInt(input.nonce),
          network,
        );
      }
      if (input.command === 'ChangeMetadataUri') {
        return encode_input_for_change_token_metadata_uri(
          input.token_id,
          input.new_metadata_uri,
          BigInt(input.nonce),
          network,
        );
      }
      if (input.command === 'FreezeToken') {
        return encode_input_for_freeze_token(
          input.token_id,
          input.is_unfreezable ? TokenUnfreezable.Yes : TokenUnfreezable.No,
          BigInt(input.nonce),
          network,
        );
      }
      if (input.command === 'UnfreezeToken') {
        return encode_input_for_unfreeze_token(input.token_id, BigInt(input.nonce), network);
      }
      if (input.account_type === 'DelegationBalance') {
        return encode_input_for_withdraw_from_delegation(
          input.delegation_id,
          Amount.from_atoms(input.amount.atoms),
          BigInt(input.nonce),
          network,
        );
      }
      return undefined;
    })
    .filter((x): x is Uint8Array => x !== undefined);

  return [...inputCommands, ...inputsIds];
}

/**
 * Shared fee-convergence tail: encode the candidate transaction at
 * `preciseFee`, estimate its size and derive the next fee. Returns the
 * encoded transaction once the fee stops moving.
 */
function convergeFeeAndEncode(
  BINRepresentation: { inputs: Uint8Array[]; outputs: Uint8Array[]; transactionsize: number },
  previousFee: bigint,
  preciseFee: bigint,
): { converged: boolean; transaction?: Uint8Array; transaction_id?: string; nextPreciseFee: bigint } {
  const tx_size = BigInt(Math.ceil(BINRepresentation.transactionsize));
  // TODO: fetch live feerate
  const nextPreciseFee = (FEE_AMOUNT_PER_KB * tx_size + 999n) / 1000n;

  if (nextPreciseFee === preciseFee || nextPreciseFee === previousFee) {
    const transaction = encode_transaction(
      mergeUint8Arrays(BINRepresentation.inputs),
      mergeUint8Arrays(BINRepresentation.outputs),
      BigInt(0),
    );
    return { converged: true, transaction, transaction_id: get_transaction_id(transaction, true), nextPreciseFee };
  }
  return { converged: false, nextPreciseFee };
}

export class Transaction {
  private outputs: Output[];
  private fee: bigint;
  private utxos: Utxo[];
  private transactionId: string;
  private hexRepresentation: string;
  private binRepresentation: { inputs: Uint8Array[]; outputs: Uint8Array[]; transactionsize: number } | null;
  private jsonRepresentation: TransactionJSON;
  private currentBlockHeight: number;
  private network: 'mainnet' | 'testnet';
  private changeAddress: string;

  constructor({
    network,
    currentBlockHeight,
  }: {
    network?: 'mainnet' | 'testnet';
    currentBlockHeight?: number | string | bigint;
  } = {}) {
    this.outputs = [];
    this.utxos = [];
    this.transactionId = '';
    this.hexRepresentation = '';
    this.binRepresentation = null;
    this.currentBlockHeight = currentBlockHeight !== undefined ? Number(currentBlockHeight) : 0;
    this.jsonRepresentation = {};
    this.network = network ?? 'testnet';
    this.fee = BigInt(0);
    this.changeAddress = '';
  }

  setChangeAddress(address: string) {
    this.changeAddress = address;
    return this;
  }

  enrichUtxo(knownUtxo: any): this {
    const input = this.jsonRepresentation.inputs.find(
      ({ input }: any) =>
        input.index === knownUtxo.outpoint.index &&
        input.input_type === knownUtxo.outpoint.input_type &&
        input.source_id === knownUtxo.outpoint.source_id &&
        input.source_type === knownUtxo.outpoint.source_type,
    );

    if (!input) {
      throw new Error(`UTXO input not found: ${knownUtxo.outpoint.source_id}:${knownUtxo.outpoint.index}`);
    }

    input.utxo = knownUtxo.utxo;

    this.updateFee();

    return this;
  }

  private updateFee(): void {
    const inputAtoms = this.jsonRepresentation.inputs.reduce((total: any, item: any) => {
      const atoms = item.utxo?.value?.amount?.atoms;

      return atoms === undefined ? total : total + BigInt(atoms);
    }, 0n);

    const outputAtoms = this.jsonRepresentation.outputs.reduce((total: any, output: any) => {
      return total + BigInt(output.value.amount.atoms);
    }, 0n);

    const feeAtoms = inputAtoms - outputAtoms;

    if (feeAtoms < 0n) {
      throw new Error('Transaction fee cannot be negative');
    }

    this.fee = BigInt(feeAtoms);
  }

  setNetwork(network: 'mainnet' | 'testnet') {
    this.network = network;
    return this;
  }

  addOutput(output: Output) {
    this.outputs.push(output);
    return this;
  }

  withUTXO(utxos: Utxo | Utxo[]) {
    this.utxos = Array.isArray(utxos) ? utxos : [utxos];
    return this;
  }

  fromHEX(hex: string) {
    if (typeof hex !== 'string') {
      throw new Error('Transaction hex must be a string');
    }

    if (!hex.length) {
      throw new Error('Transaction hex cannot be empty');
    }

    if (!/^[0-9a-fA-F]+$/.test(hex)) {
      throw new Error('Transaction hex contains invalid characters');
    }

    if (hex.length % 2 !== 0) {
      throw new Error('Transaction hex must have an even number of characters');
    }

    const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));

    const network = this.network === 'mainnet' ? 0 : 1;

    const decoded = wasmLib.decode_transaction_to_js(bytes, network);

    this.hexRepresentation = hex;
    this.jsonRepresentation = decoded_to_json_representation(decoded);
    this.jsonRepresentation.id = get_transaction_id(bytes, false);
    this.transactionId = get_transaction_id(bytes, false);

    return this;
  }

  static fromHEX(
    hex: string,
    options: {
      network?: 'mainnet' | 'testnet';
    } = {},
  ) {
    const transaction = new Transaction(options);

    return transaction.fromHEX(hex);
  }

  // Signer-compatibility getters (match the shape used by Signer.sign())
  get JSONRepresentation(): TransactionJSON {
    return this.jsonRepresentation;
  }
  get BINRepresentation() {
    return this.binRepresentation;
  }
  get HEXRepresentation_unsigned(): string {
    return this.hexRepresentation;
  }
  get transaction_id(): string {
    return this.transactionId;
  }

  /**
   * Fluent builder: assembles from previously added outputs and UTXOs and
   * returns `this` for in-process fluent use. For transport-safe plain data
   * (wallet bridge / JSON), use the static {@link assembleRaw} instead.
   */
  build() {
    if (!this.utxos.length) {
      throw new Error('UTXOs are required to build transaction');
    }
    if (!this.changeAddress) {
      throw new Error('A change address is required to build transaction');
    }

    const declaredOutputs: Output[] = [...this.outputs];

    // Sum coin and per-token requirements from user-declared outputs.
    let input_amount_coin_req = 0n;
    const token_reqs = new Map<string, bigint>();
    for (const out of declaredOutputs) {
      const val = (out as any)?.value;
      if (!val) continue;
      if (val.type === 'Coin') {
        input_amount_coin_req += BigInt(val.amount.atoms);
      } else if (val.type === 'TokenV1') {
        token_reqs.set(val.token_id, (token_reqs.get(val.token_id) ?? 0n) + BigInt(val.amount.atoms));
      }
    }

    const networkId = this.network === 'mainnet' ? 0 : 1;

    let preciseFee = 0n;
    let previousFee = -1n;

    for (let attempt = 0; attempt < MAX_FEE_ATTEMPTS; attempt++) {
      const totalFee = preciseFee;
      const coin_req_w_fee = input_amount_coin_req + totalFee;

      const coinInputs = selectUTXOsFor(this.utxos as UtxoEntry[], coin_req_w_fee, null);
      const totalCoinIn = coinInputs.reduce((acc, item) => acc + BigInt(item.utxo!.value.amount.atoms), 0n);
      if (totalCoinIn < coin_req_w_fee) {
        throw new Error('Not enough coin UTXOs');
      }

      const tokenInputsAll: UtxoInput[] = [];
      const tokenChanges: Array<{ token_id: string; amount: bigint }> = [];
      for (const [token_id, req] of token_reqs.entries()) {
        const tInputs = selectUTXOsFor(this.utxos as UtxoEntry[], req, token_id);
        const totalIn = tInputs.reduce((acc, item) => acc + BigInt(item.utxo!.value.amount.atoms), 0n);
        if (totalIn < req) {
          throw new Error(`Not enough token UTXOs for ${token_id}`);
        }
        tokenInputsAll.push(...tInputs);
        if (totalIn > req) {
          tokenChanges.push({ token_id, amount: totalIn - req });
        }
      }

      const finalOutputs: Output[] = [...declaredOutputs];
      const changeCoin = totalCoinIn - coin_req_w_fee;
      if (changeCoin > 0n) {
        finalOutputs.push({
          type: 'Transfer',
          value: {
            type: 'Coin',
            amount: {
              atoms: changeCoin.toString(),
              decimal: atomsToDecimal(changeCoin.toString(), 11).toString(),
            },
          },
          destination: this.changeAddress,
        });
      }
      for (const c of tokenChanges) {
        finalOutputs.push({
          type: 'Transfer',
          value: {
            type: 'TokenV1',
            token_id: c.token_id,
            amount: {
              atoms: c.amount.toString(),
              decimal: c.amount.toString(),
            },
          },
          destination: this.changeAddress,
        });
      }

      const finalInputs: Input[] = [...coinInputs, ...tokenInputsAll];

      const JSONRepresentation: TransactionJSON = {
        inputs: finalInputs,
        outputs: finalOutputs,
        fee: {
          atoms: totalFee.toString(),
          decimal: atomsToDecimal(totalFee.toString(), 11).toString(),
        },
        id: 'to_be_filled_in',
      };

      const BINRepresentation = this.getTransactionBINrepresentation(
        JSONRepresentation,
        networkId,
        Number(this.currentBlockHeight || FEE_BLOCK_HEIGHT),
      );

      const { converged, transaction, transaction_id, nextPreciseFee } = convergeFeeAndEncode(
        BINRepresentation,
        previousFee,
        preciseFee,
      );

      if (converged && transaction && transaction_id) {
        this.fee = totalFee;
        this.transactionId = transaction_id;
        this.binRepresentation = BINRepresentation;
        this.hexRepresentation = transaction.reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
        this.jsonRepresentation = { ...JSONRepresentation, id: transaction_id };
        return this;
      }

      previousFee = preciseFee;
      preciseFee = nextPreciseFee;
    }

    throw new Error(
      `Fee did not converge after ${MAX_FEE_ATTEMPTS} attempts (last fee ${preciseFee} atoms, previous ${previousFee})`,
    );
  }

  hex() {
    return this.hexRepresentation;
  }

  /**
   * Assembles a transaction from a fully prepared plan (canonical inputs and
   * outputs plus computed coin/token requirements). This is the ONE
   * assembly engine: the Client's `buildRawTransaction`/`buildTransaction`
   * normalize their arguments into a `PreparedTransaction` and delegate
   * here; the fluent `build()` shares the same fee-convergence and encoding
   * core.
   *
   * Returns plain assembled data (`AssembledTransactionData`) rather than a
   * class instance so the result survives structured-clone/JSON transport
   * (the wallet bridge receives it as `txData`).
   */
  static assembleRaw(prepared: PreparedTransaction, env: AssembleEnvironment): AssembledTransactionData {
    const {
      outputs,
      inputs = [],
      requiredCoin,
      requiredToken,
      sendToken,
      baseFee,
      deductFeeFromFirstOutput = false,
      withUTXO,
      forceSpendUtxo,
    } = prepared;

    if (!env.changeAddress) {
      throw new Error('A change address is required to assemble a transaction');
    }

    const networkId = env.network === 'mainnet' ? 0 : 1;
    // `||` on purpose: an explicit 0 is as unusable as unset (the chain
    // rejects stale fee heights), matching the fluent builder's fallback.
    const blockHeight = BigInt(env.currentBlockHeight || FEE_BLOCK_HEIGHT);

    let data_utxos: UtxoEntry[];
    if (withUTXO) {
      data_utxos = withUTXO as UtxoEntry[];
    } else {
      throw new Error('UTXOs are required: provide them via withUTXO');
    }

    const utxos: UtxoEntry[] = data_utxos.filter((item: UtxoEntry) => {
      if (!item.utxo) {
        return false;
      }
      // HTLC UTXOs have to be added manually
      if (item.utxo.type === 'Htlc') {
        return false;
      }
      return true;
    });

    // Forced entries in the SAME shape the selector emits ({input, utxo}) —
    // mixing shapes here used to crash input encoding downstream.
    const forcedUtxos: UtxoInput[] = (forceSpendUtxo ?? []).map((item: UtxoEntry) => ({
      input: { ...item.outpoint, input_type: 'UTXO' },
      utxo: item.utxo,
    }));
    // An outpoint listed as forced must not also be auto-selected (double
    // spend inside one transaction + double-counted change math).
    const forcedOutpointKeys = new Set(forcedUtxos.map(({ input }) => `${input.source_id}:${input.index}`));
    const isForced = (entry: UtxoInput) => forcedOutpointKeys.has(`${entry.input.source_id}:${entry.input.index}`);
    // A caller-supplied duplicate inside forceSpendUtxo itself is dropped too.
    const seenForced = new Set<string>();
    const dedupedForcedUtxos = forcedUtxos.filter(({ input }) => {
      const key = `${input.source_id}:${input.index}`;
      if (seenForced.has(key)) return false;
      seenForced.add(key);
      return true;
    });

    let preciseFee = BigInt(0);
    let previousFee = BigInt(-1);

    // Snapshot the pre-loop amount of the fee-deducted output: the deduction
    // must be relative to the original value in every fee iteration, not
    // compounded onto the value mutated by the previous iteration. (Amount
    // encoding is variable-length, so the fee CAN change between iterations.)
    const firstOutputOriginalAtoms = deductFeeFromFirstOutput
      ? BigInt((outputs[0] as LockThenTransferOutput).value.amount.atoms)
      : 0n;

    for (let attempt = 0; attempt < MAX_FEE_ATTEMPTS; attempt++) {
      const totalFee = baseFee + preciseFee;
      const input_amount_coin_req_w_fee = requiredCoin + totalFee;

      const inputObjCoin = deductFeeFromFirstOutput
        ? []
        : selectUTXOsFor(utxos, input_amount_coin_req_w_fee, null).filter((entry) => !isForced(entry));
      const inputObjToken = sendToken?.token_id
        ? selectUTXOsFor(utxos, requiredToken, sendToken.token_id).filter((entry) => !isForced(entry))
        : [];

      if (dedupedForcedUtxos.length > 0) {
        const forceCoinUtxos = dedupedForcedUtxos.filter((utxo) => utxo.utxo.value.type === 'Coin');
        const forceTokenUtxos = dedupedForcedUtxos.filter(
          (utxo) => utxo.utxo.value.type === 'TokenV1' && utxo.utxo.value.token_id === sendToken?.token_id,
        );
        if (forceCoinUtxos.length > 0) {
          inputObjCoin.unshift(...forceCoinUtxos);
        }
        if (forceTokenUtxos.length > 0) {
          inputObjToken.unshift(...forceTokenUtxos);
        }
      }

      const totalInputValueCoin = inputObjCoin.reduce((acc, item) => acc + BigInt(item.utxo!.value.amount.atoms), 0n);
      const totalInputValueToken = inputObjToken.reduce((acc, item) => acc + BigInt(item.utxo!.value.amount.atoms), 0n);

      if (!deductFeeFromFirstOutput && totalInputValueCoin < input_amount_coin_req_w_fee) {
        throw new Error(
          `Not enough coin UTXOs: required ${input_amount_coin_req_w_fee} atoms (outputs + fee), selected ${totalInputValueCoin}`,
        );
      }
      if (totalInputValueToken < requiredToken) {
        throw new Error(
          `Not enough token UTXOs for ${sendToken?.token_id}: required ${requiredToken} atoms, selected ${totalInputValueToken}`,
        );
      }

      // When the fee is deducted from the first output it must NOT also be
      // subtracted from the coin change — forced coin inputs would otherwise
      // be double-charged (inputs - outputs != fee).
      const changeAmountCoin = deductFeeFromFirstOutput
        ? totalInputValueCoin - requiredCoin
        : totalInputValueCoin - input_amount_coin_req_w_fee;
      const changeAmountToken = totalInputValueToken - requiredToken;

      // Fresh objects — never mutate the caller's prepared outputs (the
      // fee-deducted output is cloned deeply: value/amount are written below).
      const finalOutputs: Output[] = outputs.map((output, outputIndex) =>
        deductFeeFromFirstOutput && outputIndex === 0
          ? {
              ...output,
              value: {
                ...(output as LockThenTransferOutput).value,
                amount: { ...(output as LockThenTransferOutput).value.amount },
              },
            }
          : { ...output },
      );
      if (deductFeeFromFirstOutput) {
        const out = finalOutputs[0] as LockThenTransferOutput;
        const netAtoms = firstOutputOriginalAtoms - totalFee;
        if (netAtoms < 0n) {
          throw new Error('DelegationWithdraw amount is smaller than the transaction fee');
        }
        out.value.amount = {
          atoms: netAtoms.toString(),
          decimal: atomsToDecimal(netAtoms.toString(), 11),
        };
      }

      if (changeAmountCoin > 0n) {
        finalOutputs.push({
          type: 'Transfer',
          value: {
            type: 'Coin',
            amount: {
              atoms: changeAmountCoin.toString(),
              decimal: atomsToDecimal(changeAmountCoin.toString(), 11).toString(),
            },
          },
          destination: env.changeAddress,
        });
      }

      if (changeAmountToken > 0n && sendToken) {
        finalOutputs.push({
          type: 'Transfer',
          value: {
            type: 'TokenV1',
            token_id: sendToken.token_id,
            amount: {
              atoms: changeAmountToken.toString(),
              decimal: atomsToDecimal(changeAmountToken.toString(), sendToken.number_of_decimals).toString(),
            },
          },
          destination: env.changeAddress,
        });
      }

      const finalInputs: Input[] = [...inputs, ...inputObjCoin, ...inputObjToken];

      const JSONRepresentation: TransactionJSON = {
        inputs: finalInputs,
        outputs: finalOutputs,
        fee: {
          atoms: totalFee.toString(),
          decimal: atomsToDecimal(totalFee.toString(), 11).toString(),
        },
        id: 'to_be_filled_in',
      };

      // IssueNft outputs need their token id before encoding (the wasm encoder
      // rejects a placeholder id). The id is derived from the encoded inputs,
      // which do not depend on the outputs, so it can be computed up front.
      const issueNftIndexes = finalOutputs.reduce<number[]>(
        (acc, output, index) => (output.type === 'IssueNft' ? [...acc, index] : acc),
        [],
      );
      if (issueNftIndexes.length > 1) {
        throw new Error(
          'Only one IssueNft output per transaction is supported: the token id is derived from the transaction inputs, so multiple issuances need separate transactions',
        );
      }
      if (issueNftIndexes.length === 1) {
        const token_id = get_token_id(
          mergeUint8Arrays(getTransactionInputsBytesFor(JSONRepresentation, networkId, blockHeight)),
          blockHeight,
          env.network === 'mainnet' ? Network.Mainnet : Network.Testnet,
        );
        const index = issueNftIndexes[0];
        const output = finalOutputs[index] as IssueNftOutput;
        if (output.token_id && output.token_id !== token_id) {
          throw new Error(
            `IssueNft token_id mismatch: the transaction inputs derive ${token_id}, but the caller supplied ${output.token_id}`,
          );
        }
        finalOutputs[index] = {
          ...output,
          token_id,
        };
      }

      const BINRepresentation = new Transaction({ network: env.network }).getTransactionBINrepresentation(
        JSONRepresentation,
        networkId,
        Number(blockHeight),
      );

      const { converged, transaction, transaction_id, nextPreciseFee } = convergeFeeAndEncode(
        BINRepresentation,
        previousFee,
        preciseFee,
      );

      if (converged && transaction && transaction_id) {
        return {
          JSONRepresentation: {
            ...JSONRepresentation,
            id: transaction_id,
          },
          BINRepresentation,
          HEXRepresentation_unsigned: transaction.reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), ''),
          transaction_id,
        };
      }

      previousFee = preciseFee;
      preciseFee = nextPreciseFee;
    }

    throw new Error('Failed to build transaction after maximum attempts');
  }

  json(): TransactionJSON {
    return this.jsonRepresentation;
  }

  getFee() {
    return {
      atoms: this.fee.toString(),
      decimal: atomsToDecimal(this.fee.toString(), 11).toString(),
    };
  }

  /**
   * Returns the transaction binary representation (encoded inputs/outputs
   * plus the size estimate used for fee computation).
   * @param transactionJSONrepresentation - explorer-style JSON
   * @param _network - wasm Network enum value (0 mainnet / 1 testnet)
   * @param blockHeight - height for height-dependent encodings; defaults to
   *   the instance value or FEE_BLOCK_HEIGHT when unset
   */
  getTransactionBINrepresentation(
    transactionJSONrepresentation: TransactionJSON,
    _network: Network,
    blockHeight: number = this.currentBlockHeight || Number(FEE_BLOCK_HEIGHT),
  ): {
    inputs: Uint8Array[];
    outputs: Uint8Array[];
    transactionsize: number;
  } {
    const network = _network;
    // Binarisation: account commands first, then UTXO inputs (shared core).
    const inputsArray = getTransactionInputsBytesFor(transactionJSONrepresentation, network, BigInt(blockHeight));

    const outputsArrayItems = transactionJSONrepresentation.outputs.map((output: any) => {
      if (output.type === 'Transfer') {
        if (output.value.type === 'TokenV1') {
          return encode_output_token_transfer(
            Amount.from_atoms(output.value.amount.atoms),
            output.destination,
            output.value.token_id,
            network,
          );
        } else {
          return encode_output_transfer(Amount.from_atoms(output.value.amount.atoms), output.destination, network);
        }
      }
      if (output.type === 'LockThenTransfer') {
        let lockEncoded: Uint8Array = new Uint8Array();
        if (output.lock.type === 'UntilTime') {
          // @ts-ignore
          lockEncoded = encode_lock_until_time(BigInt(output.lock.content.timestamp)); // TODO: check if timestamp is correct
        }
        if (output.lock.type === 'ForBlockCount') {
          lockEncoded = encode_lock_for_block_count(BigInt(output.lock.content));
        }
        if (output.value.type === 'TokenV1') {
          return encode_output_token_lock_then_transfer(
            Amount.from_atoms(output.value.amount.atoms),
            output.destination,
            output.value.token_id,
            lockEncoded,
            network,
          );
        } else {
          return encode_output_lock_then_transfer(
            Amount.from_atoms(output.value.amount.atoms),
            output.destination,
            lockEncoded,
            network,
          );
        }
      }
      if (output.type === 'CreateOrder') {
        return encode_create_order_output(
          Amount.from_atoms(output.ask_balance.atoms.toString()), //ask_amount
          output.ask_currency.type === 'TokenV1' ? output.ask_currency.token_id : null, // ask_token_id
          Amount.from_atoms(output.give_balance.atoms.toString()), //give_amount
          output.give_currency.type === 'TokenV1' ? output.give_currency.token_id : null, //give_token_id
          output.conclude_destination, // conclude_address
          network, // network
        );
      }
      if (output.type === 'BurnToken') {
        if (output.value.type === 'TokenV1') {
          return encode_output_token_burn(
            Amount.from_atoms(output.value.amount.atoms.toString()), // amount
            output.value.token_id, // token_id
            network, // network
          );
        }
        if (output.value.type === 'Coin') {
          return encode_output_coin_burn(
            Amount.from_atoms(output.value.amount.atoms.toString()), // amount
          );
        }
      }
      if (output.type === 'IssueNft') {
        const { name, ticker, description, media_hash, creator, media_uri, icon_uri, additional_metadata_uri } =
          output.data;

        const { destination: address, token_id } = output;

        const chainTip = BigInt(blockHeight);

        return encode_output_issue_nft(
          token_id as string,
          address,
          name.string,
          ticker.string,
          description.string,
          stringToUint8Array(media_hash.string),
          null, // TODO: check for public key, key hash is not working
          media_uri.string,
          icon_uri.string,
          additional_metadata_uri.string,
          BigInt(chainTip),
          network,
        );
      }
      if (output.type === 'IssueFungibleToken') {
        const { authority, is_freezable, metadata_uri, number_of_decimals, token_ticker, total_supply } = output;

        const chainTip = BigInt(blockHeight);

        const is_token_freezable = is_freezable ? FreezableToken.Yes : FreezableToken.No;

        const supply_amount =
          total_supply.type === 'Fixed' ? Amount.from_atoms(total_supply.amount.atoms.toString()) : null;

        const total_supply_type =
          total_supply.type === 'Fixed'
            ? TotalSupply.Fixed
            : total_supply.type === 'Lockable'
              ? TotalSupply.Lockable
              : TotalSupply.Unlimited;

        // const encoder = new TextEncoder()

        return encode_output_issue_fungible_token(
          authority, // ok
          token_ticker.string, // ok
          metadata_uri.string, // ok
          number_of_decimals, // ok
          total_supply_type, // ok
          supply_amount, // ok
          is_token_freezable, // ok
          BigInt(chainTip), // ok
          network,
        );
      }

      if (output.type === 'DataDeposit') {
        return encode_output_data_deposit(new TextEncoder().encode(output.data));
      }

      if (output.type === 'CreateDelegationId') {
        return encode_output_create_delegation(output.pool_id, output.destination, network);
      }

      if (output.type === 'DelegateStaking') {
        return encode_output_delegate_staking(Amount.from_atoms(output.amount.atoms), output.delegation_id, network);
      }

      if (output.type === 'Htlc') {
        let refund_timelock: Uint8Array = new Uint8Array();

        if (output.htlc.refund_timelock.type === 'UntilTime') {
          refund_timelock = encode_lock_until_time(BigInt(output.htlc.refund_timelock.content.timestamp)); // TODO: check if timestamp is correct
        }
        if (output.htlc.refund_timelock.type === 'ForBlockCount') {
          refund_timelock = encode_lock_for_block_count(BigInt(output.htlc.refund_timelock.content));
        }

        return encode_output_htlc(
          Amount.from_atoms(output.value.amount.atoms),
          output.value.token_id,
          output.htlc.secret_hash.hex,
          output.htlc.spend_key,
          output.htlc.refund_key,
          refund_timelock,
          network,
        );
      }
    });
    const outputsArray = outputsArrayItems.filter((x: any): x is NonNullable<typeof x> => x !== undefined);

    const inputAddresses: string[] = (transactionJSONrepresentation.inputs as any[])
      .filter(({ input, utxo }) => input.input_type === 'UTXO' || utxo?.htlc)
      .map((entry: any) => {
        // decoded transactions carry no utxo payload — size estimation then
        // falls back to the account-command destinations below
        if ((entry as any).utxo?.destination) {
          return (entry as any).utxo.destination;
        }
        if ((entry as any)?.utxo?.htlc) {
          return [(entry as any).utxo.htlc.spend_key, (entry as any).utxo.htlc.refund_key]; // TODO: need to handle spend too
        }
        return undefined;
      })
      .filter((x): x is string => typeof x === 'string')
      .flat();

    const firstInput = transactionJSONrepresentation.inputs[0]?.input as any;

    if (firstInput?.account_type === 'DelegationBalance') {
      inputAddresses.push(transactionJSONrepresentation.outputs[0].destination);
    }

    if (firstInput?.input_type === 'AccountCommand') {
      if (firstInput.destination) {
        inputAddresses.push(firstInput.destination);
      }

      if (firstInput.authority) {
        inputAddresses.push(firstInput.authority);
      }
    }

    if (firstInput?.input_type === 'Account') {
      if (firstInput.destination) {
        inputAddresses.push(firstInput.destination);
      }

      if (firstInput.authority) {
        inputAddresses.push(firstInput.authority);
      }
    }

    const transactionsize = estimate_transaction_size(
      mergeUint8Arrays(inputsArray),
      inputAddresses,
      mergeUint8Arrays(outputsArray),
      network,
    );

    return {
      inputs: inputsArray,
      outputs: outputsArray,
      transactionsize,
    };
  }

  // outputs
  transfer(destination: string, amount: string): Output {
    return {
      type: 'Transfer',
      destination: destination,
      value: {
        type: 'Coin',
        amount: {
          atoms: amount,
          decimal: atomsToDecimal(amount, 11),
        },
      },
    };
  }

  transferToken(destination: string, amount: string, token_id: string): Output {
    return {
      type: 'Transfer',
      destination,
      value: {
        type: 'TokenV1',
        token_id,
        amount: {
          atoms: amount,
          decimal: amount,
        },
      },
    };
  }

  transferNft(destination: string, token_id: string): Output {
    return this.transferToken(destination, '1', token_id);
  }
}

// ── wasm decode → explorer-style JSON ─────────────────────────────────────────
//
// decode_transaction_to_js returns canonical chain types as tagged unions with
// untyped payloads (its TS declaration is `any`), so this mapper is pinned by
// fixtures generated from the real wasm output — see tests/transaction-decode
// .test.ts (byte-identical round-trips per type). Shapes were captured with
// encode_* → decode_transaction_to_js probes against @mintlayer/wasm-lib 1.4.0.

const decodedBytesToHex = (bytes: number[] | Uint8Array): string => uint8ArrayToHex(new Uint8Array(bytes));

/**
 * Amounts decode as `{atoms}`; the explorer-style shape wants
 * `{atoms, decimal}`. Coin decimals are fixed at 11 so the decimal is
 * recomputed exactly. Token decimals are NOT recoverable at decode time, so
 * token amounts carry the atoms string as the decimal placeholder (same
 * convention as `transferToken`/`build()` token change) — consumers format
 * via token metadata.
 */
const decodedCoinAmount = (atoms: string): { atoms: string; decimal: string } => ({
  atoms,
  decimal: atomsToDecimal(atoms, 11),
});

const decodedTokenAmount = (atoms: string): { atoms: string; decimal: string } => ({
  atoms,
  decimal: atoms,
});

/** `{Coin:{atoms}} | {TokenV1:[token_id,{atoms}]}` → explorer-style Value. */
const decodedValue = (value: any): any => {
  if (!value || typeof value !== 'object') {
    throw new Error('Decode: missing value');
  }
  if (value.Coin) {
    return { type: 'Coin', amount: decodedCoinAmount(value.Coin.atoms) };
  }
  if (value.TokenV1) {
    const [token_id, amount] = value.TokenV1;
    return { type: 'TokenV1', token_id, amount: decodedTokenAmount(amount.atoms) };
  }
  throw new Error(`Decode: unsupported value type ${Object.keys(value)[0]}`);
};

const decodedBytesField = (bytes: number[] | Uint8Array): { hex: string; string: string } => {
  const string_ = new TextDecoder().decode(new Uint8Array(bytes));
  return { hex: decodedBytesToHex(bytes), string: string_ };
};

const decodedInput = (input: any, index: number): any => {
  if (input.Utxo) {
    return {
      input: {
        // the OUTPOINT index from the decode — NOT the input's array position
        index: input.Utxo.index,
        input_type: 'UTXO',
        source_id: input.Utxo.id.Transaction,
        source_type: 'Transaction',
      },
    };
  }

  if (input.AccountCommand) {
    const [nonce, command] = input.AccountCommand;
    const tag = Object.keys(command)[0];
    const payload = command[tag];
    // The payload layout is command-specific; extract with tolerant accessors
    // so unknown extra fields can never crash a display path.
    const first = Array.isArray(payload) ? payload[0] : payload;
    const second = Array.isArray(payload) ? payload[1] : undefined;

    const base: any = {
      input_type: 'AccountCommand',
      command: tag === 'ChangeTokenMetadataUri' ? 'ChangeMetadataUri' : tag,
      nonce: Number(nonce),
    };

    switch (tag) {
      case 'MintTokens':
        base.token_id = first;
        base.amount = decodedTokenAmount(second.atoms);
        break;
      case 'UnmintTokens':
        // decodes as a bare token-id string (no amount payload)
        base.token_id = payload;
        break;
      case 'LockTokenSupply':
      case 'UnfreezeToken':
        base.token_id = payload;
        break;
      case 'FreezeToken':
        base.token_id = first;
        base.is_unfreezable = second === 'Yes';
        break;
      case 'ChangeTokenAuthority':
        base.token_id = first;
        base.new_authority = second;
        break;
      case 'ChangeTokenMetadataUri':
        base.token_id = first;
        base.new_metadata_uri = new TextDecoder().decode(new Uint8Array(second));
        break;
      case 'FillOrder':
        base.order_id = first;
        base.fill_atoms = second.atoms;
        base.destination = payload[2];
        break;
      case 'ConcludeOrder':
        base.order_id = first;
        base.destination = second;
        break;
      default:
        return {
          input: { ...base, command: tag, decoded_payload: payload },
          unsupported: true,
        };
    }
    return { input: base };
  }

  if (input.Account) {
    const { nonce, account } = input.Account;
    if (account.DelegationBalance) {
      const [delegation_id, amount] = account.DelegationBalance;
      return {
        input: {
          input_type: 'Account',
          account_type: 'DelegationBalance',
          delegation_id,
          amount: decodedCoinAmount(amount.atoms),
          nonce: Number(nonce),
        },
      };
    }
    return { input: { input_type: 'Account', decoded_account: account }, unsupported: true };
  }

  return { input: { index, decoded: input }, unsupported: true };
};

const decodedOutput = (output: any): any => {
  const tag = Object.keys(output)[0];

  switch (tag) {
    case 'Transfer': {
      const [value, destination] = output.Transfer;
      return { type: 'Transfer', destination, value: decodedValue(value) };
    }
    case 'LockThenTransfer': {
      const [value, destination, lock] = output.LockThenTransfer;
      return {
        type: 'LockThenTransfer',
        destination,
        value: decodedValue(value),
        lock: {
          type: lock.type,
          content: lock.type === 'UntilTime' ? { timestamp: String(lock.content.timestamp) } : String(lock.content),
        },
      };
    }
    case 'Burn': {
      return { type: 'BurnToken', value: decodedValue(output.Burn) };
    }
    case 'DataDeposit': {
      return { type: 'DataDeposit', data: new TextDecoder().decode(new Uint8Array(output.DataDeposit)) };
    }
    case 'IssueFungibleToken': {
      const v1 = output.IssueFungibleToken.V1;
      let total_supply: any;
      if (typeof v1.total_supply === 'string') {
        total_supply = { type: v1.total_supply };
      } else if (v1.total_supply && typeof v1.total_supply === 'object') {
        const [supplyType, supplyData] = Object.entries(v1.total_supply)[0] as [string, any];
        total_supply =
          supplyType === 'Fixed'
            ? {
                type: 'Fixed',
                amount: { atoms: supplyData.atoms, decimal: atomsToDecimal(supplyData.atoms, v1.number_of_decimals) },
              }
            : { type: supplyType };
      }
      return {
        type: 'IssueFungibleToken',
        authority: v1.authority,
        is_freezable: v1.is_freezable === 'Yes',
        metadata_uri: decodedBytesField(v1.metadata_uri),
        number_of_decimals: v1.number_of_decimals,
        token_ticker: decodedBytesField(v1.token_ticker),
        total_supply,
      };
    }
    case 'IssueNft': {
      const [token_id, v0wrapper] = output.IssueNft;
      const metadata = v0wrapper.V0.metadata;
      return {
        type: 'IssueNft',
        token_id,
        destination: null,
        data: {
          creator: metadata.creator ?? null,
          name: decodedBytesField(metadata.name),
          ticker: decodedBytesField(metadata.ticker),
          description: decodedBytesField(metadata.description),
          media_hash: decodedBytesField(metadata.media_hash),
          media_uri: decodedBytesField(metadata.media_uri),
          icon_uri: decodedBytesField(metadata.icon_uri),
          additional_metadata_uri: decodedBytesField(metadata.additional_metadata_uri),
        },
      };
    }
    case 'CreateDelegationId': {
      const [destination, pool_id] = output.CreateDelegationId;
      return { type: 'CreateDelegationId', destination, pool_id };
    }
    case 'DelegateStaking': {
      const [amount, delegation_id] = output.DelegateStaking;
      return { type: 'DelegateStaking', delegation_id, amount: decodedCoinAmount(amount.atoms) };
    }
    case 'Htlc': {
      const [value, htlc] = output.Htlc;
      return {
        type: 'Htlc',
        value: decodedValue(value),
        htlc: {
          spend_key: htlc.spend_key,
          refund_key: htlc.refund_key,
          secret_hash: { hex: htlc.secret_hash, string: null },
          refund_timelock: {
            type: htlc.refund_timelock.type,
            content:
              htlc.refund_timelock.type === 'UntilTime'
                ? { timestamp: String(htlc.refund_timelock.content.timestamp) }
                : String(htlc.refund_timelock.content),
          },
        },
      };
    }
    case 'CreateOrder': {
      const { conclude_key, ask, give } = output.CreateOrder;
      return {
        type: 'CreateOrder',
        conclude_destination: conclude_key,
        ask_currency: ask.Coin ? { type: 'Coin' } : { type: 'TokenV1', token_id: ask.TokenV1[0] },
        ask_balance: ask.Coin ? decodedCoinAmount(ask.Coin.atoms) : decodedTokenAmount(ask.TokenV1[1].atoms),
        give_currency: give.Coin ? { type: 'Coin' } : { type: 'TokenV1', token_id: give.TokenV1[0] },
        give_balance: give.Coin ? decodedCoinAmount(give.Coin.atoms) : decodedTokenAmount(give.TokenV1[1].atoms),
      };
    }
    default:
      // Lossless passthrough instead of throwing: an unknown/unsupported
      // output must not crash a display path (wallet sign-transaction screen).
      return { type: 'Unsupported', wasm_tag: tag, decoded: output };
  }
};

const decoded_to_json_representation = (decoded: any) => {
  const tx = decoded.V1;

  return {
    inputs: tx.inputs.map((input: any, index: number) => decodedInput(input, index)),
    outputs: tx.outputs.map((output: any) => decodedOutput(output)),
  };
};
