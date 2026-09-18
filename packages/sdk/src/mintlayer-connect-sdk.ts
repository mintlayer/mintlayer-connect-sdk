import initWasm, {
  nft_issuance_fee,
  token_supply_change_fee,
  fungible_token_issuance_fee,
  Network,
  token_freeze_fee,
  token_change_authority_fee,
  encode_outpoint_source_id,
  SourceId,
  encode_output_transfer,
  encode_output_token_transfer,
  Amount,
  encode_lock_until_time,
  encode_lock_for_block_count,
  encode_output_token_lock_then_transfer,
  encode_output_lock_then_transfer,
  data_deposit_fee,
  encode_signed_transaction,
  encode_witness,
  SignatureHashType,
  extract_htlc_secret,
  verify_challenge,
  make_default_account_privkey,
  make_receiving_address,
  make_change_address,
  public_key_from_private_key,
  pubkey_to_pubkeyhash_address,
  sign_challenge,
} from '@mintlayer/wasm-lib';
import { Transaction, FEE_BLOCK_HEIGHT } from './transaction';
import {
  mergeUint8Arrays,
  stringToUint8Array,
  hexToUint8Array,
  uint8ArrayToHex,
  BASE58_ALPHABET,
  atomsToDecimal,
  decimalsToAtoms,
  decimals,
} from './utils';

// Public numeric-format helpers — single-sourced in ./utils.
export { atomsToDecimal, decimalsToAtoms, decimals } from './utils';
import type { AssembledTransactionData, PreparedTransaction } from './transaction';
import type {
  AmountFields,
  Value,
  UtxoInput,
  UtxoEntry,
  Input,
  Output,
  Timelock,
  TotalSupplyValue,
  TransactionJSONRepresentation,
} from './types/transaction';

/**
 * SDK-level sanity caps for developer-forged raw transactions (generous bounds,
 * well above consensus limits, to fail fast on obviously invalid input).
 */
const MAX_RAW_OUTPUTS = 100;
const MAX_RAW_TICKER_LENGTH = 32;
const MAX_RAW_URI_LENGTH = 512;
const MAX_RAW_NFT_NAME_LENGTH = 128;
const MAX_RAW_NFT_DESCRIPTION_LENGTH = 1024;
const MAX_RAW_HASH_LENGTH = 128;
const MAX_RAW_DATA_DEPOSIT_LENGTH = 4096;
const MAX_RAW_CREATOR_LENGTH = 128;

/**
 * C0/C1 control characters and Unicode bidi marks, stripped from display
 * strings so they cannot hide direction/layout tricks in wallets and explorers.
 */
const DISPLAY_STRING_SANITIZE_RE = /[\u0000-\u001F\u007F-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

/**
 * Block height used for fee estimation, token id derivation, order input
 * encoding and witness signing, shared by the Client and the Signer.
 * TODO: Get the current block height from the API provider.
 */
export { FEE_BLOCK_HEIGHT } from './transaction';

type Address = {
  addressesByChain: {
    [chain: string]: {
      receiving: string[];
      change: string[];
      publicKeys?: string[];
    };
  };
};

type MojitoRequest = any; // TODO expand

export interface ApiProvider {
  getChainTip(): Promise<any>;
  getAddress(addr: string): Promise<any>;
  getAddressDelegations(addr: string): Promise<any>;
  getAddressTokenAuthority(addr: string): Promise<any>;
  getToken(token_id: string): Promise<any>;
  getNft(token_id: string): Promise<any>;
  getOrder(order_id: string): Promise<any>;
  getOrders(): Promise<any>;
  getPoolDelegations(pool_id: string): Promise<any>;
  getDelegation(delegation_id: string): Promise<any>;
  getTransaction(transaction_id: string): Promise<any>;
  broadcastTransaction(tx: string | { hex: string; json: any }): Promise<any>;
  getAccountUtxos(addresses: string[], network: number): Promise<any>;
}

export class MintlayerApiProvider implements ApiProvider {
  private readonly baseUrl: string;
  private readonly batchUrl: string;

  constructor(baseUrl: string, batchUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.batchUrl = batchUrl.replace(/\/$/, '');
  }

  private async get(path: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}${path}`);
    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${path}`);
    }
    return response.json();
  }

  async getChainTip(): Promise<any> {
    return this.get('/chain/tip');
  }

  async getAddress(addr: string): Promise<any> {
    return this.get(`/address/${addr}`);
  }

  async getAddressDelegations(addr: string): Promise<any> {
    return this.get(`/address/${addr}/delegations`);
  }

  async getAddressTokenAuthority(addr: string): Promise<any> {
    return this.get(`/address/${addr}/token-authority`);
  }

  async getToken(token_id: string): Promise<any> {
    return this.get(`/token/${token_id}`);
  }

  async getNft(token_id: string): Promise<any> {
    return this.get(`/nft/${token_id}`);
  }

  async getOrder(order_id: string): Promise<any> {
    return this.get(`/order/${order_id}`);
  }

  async getOrders(): Promise<any> {
    return this.get('/order');
  }

  async getPoolDelegations(pool_id: string): Promise<any> {
    return this.get(`/pool/${pool_id}/delegations`);
  }

  async getDelegation(delegation_id: string): Promise<any> {
    return this.get(`/delegation/${delegation_id}`);
  }

  async getTransaction(transaction_id: string): Promise<any> {
    return this.get(`/transaction/${transaction_id}`);
  }

  async broadcastTransaction(tx: string | { hex: string; json: any }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/transaction`, {
      method: 'POST',
      headers: typeof tx === 'string' ? { 'Content-Type': 'text/plain' } : { 'Content-Type': 'application/json' },
      body: typeof tx === 'string' ? tx : JSON.stringify({ transaction: tx.hex, json: tx.json }),
    });
    if (!response.ok) {
      throw new Error(`Broadcast error ${response.status}`);
    }
    return response.json();
  }

  async getAccountUtxos(addresses: string[], network: number): Promise<any> {
    const response = await fetch(this.batchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: addresses,
        type: '/address/:address/spendable-utxos',
        network,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch utxos: ${response.status}`);
    }
    const data = await response.json();
    return (data.results ?? []).flat();
  }
}

export interface AccountProvider {
  connect(): Promise<Address>;
  restore(): Promise<Address>;
  disconnect(): Promise<void>;
  request(method: any, params: any): Promise<any>;
}

export class MojitoAccountProvider implements AccountProvider {
  /**
   * Connects to the Mojito wallet extension.
   * @returns Promise that resolves to the connected addresses
   */
  async connect() {
    if (typeof window !== 'undefined' && window.mojito?.connect) {
      return window.mojito.connect();
    } else {
      throw new Error('Mojito extension not available');
    }
  }

  /**
   * Restores the session from the Mojito wallet extension.
   * @returns Promise that resolves to the restored addresses
   */
  async restore() {
    if (typeof window !== 'undefined' && window.mojito?.restore) {
      return window.mojito.restore();
    } else {
      throw new Error('Mojito extension not available');
    }
  }

  /**
   * Disconnects from the Mojito wallet extension.
   * @returns Promise that resolves when disconnection is complete
   */
  async disconnect() {
    if (typeof window !== 'undefined' && window.mojito?.disconnect) {
      return window.mojito.disconnect();
    } else {
      throw new Error('Mojito extension not available');
    }
  }

  /**
   * Makes a request to the Mojito wallet extension.
   * @param method - The method to call
   * @param params - The parameters for the method
   * @returns Promise that resolves to the response from the wallet
   */
  async request(method: any, params: any) {
    if (typeof window !== 'undefined' && window.mojito?.request) {
      return window.mojito.request(method, params);
    } else {
      throw new Error('Mojito extension not available');
    }
  }
}

/**
 * A standalone account provider backed by explicit addresses and private keys.
 *
 * Suitable for Node.js scripts, tests, and faucets where the wallet extension
 * is not available. Signing is performed locally using the {@link Signer} class.
 *
 * @example
 * ```typescript
 * const provider = new PrivateKeyAccountProvider(
 *   {
 *     receiving: ['tmt1q...'],
 *     change:    ['tmt1q...'],
 *   },
 *   {
 *     'tmt1q...': new Uint8Array([...]),
 *   },
 *   'testnet',
 * );
 *
 * const client = await Client.create({ network: 'testnet', accountProvider: provider });
 * ```
 */
class PrivateKeyAccountProvider implements AccountProvider {
  private readonly addresses: Address;
  private readonly privateKeys: Record<string, Uint8Array>;
  private readonly network: Network;

  constructor(
    addresses: { receiving: string[]; change: string[] },
    privateKeys: Record<string, Uint8Array>,
    network: 'mainnet' | 'testnet' = 'testnet',
  ) {
    this.addresses = {
      addressesByChain: {
        mintlayer: addresses,
      },
    };
    this.privateKeys = privateKeys;
    this.network = network === 'mainnet' ? Network.Mainnet : Network.Testnet;
  }

  async connect(): Promise<Address> {
    return this.addresses;
  }

  async restore(): Promise<Address> {
    return this.addresses;
  }

  async disconnect(): Promise<void> {}

  async request(method: string, params: any): Promise<any> {
    if (method === 'signTransaction') {
      const signer = new Signer(this.privateKeys, this.network);
      return signer.sign(params.txData);
    }

    if (method === 'signChallenge') {
      const { message, address } = params;
      const privateKey = this.privateKeys[address];
      if (!privateKey) {
        throw new Error(`Private key not found for address: ${address}`);
      }
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = sign_challenge(privateKey, messageBytes);
      const signature = Array.from(signatureBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return { message, address, signature };
    }

    throw new Error(`Method not supported: ${method}`);
  }
}

/**
 * Options for {@link MnemonicAccountProvider}.
 */
interface MnemonicAccountProviderOptions {
  /** Number of receiving addresses to derive (default: 1). */
  receivingAddressCount?: number;
  /** Number of change addresses to derive (default: 1). */
  changeAddressCount?: number;
}

/**
 * A standalone account provider that derives addresses and private keys from a
 * BIP39 mnemonic seed phrase.
 *
 * Derivation path: `44'/mintlayer_coin_type'/0'/0/<index>` for receiving and
 * `44'/mintlayer_coin_type'/0'/1/<index>` for change addresses.
 *
 * Suitable for Node.js scripts, tests, and faucets where the wallet extension
 * is not available.
 *
 * @example
 * ```typescript
 * const provider = new MnemonicAccountProvider(
 *   'word1 word2 ... word12',
 *   'testnet',
 *   { receivingAddressCount: 5, changeAddressCount: 2 },
 * );
 *
 * const client = await Client.create({ network: 'testnet', accountProvider: provider });
 * ```
 */
class MnemonicAccountProvider implements AccountProvider {
  private readonly addresses: Address;
  private readonly privateKeys: Record<string, Uint8Array>;
  private readonly network: Network;

  constructor(
    mnemonic: string,
    network: 'mainnet' | 'testnet' = 'testnet',
    options: MnemonicAccountProviderOptions = {},
  ) {
    const { receivingAddressCount = 1, changeAddressCount = 1 } = options;
    this.network = network === 'mainnet' ? Network.Mainnet : Network.Testnet;

    const accountPrivKey = make_default_account_privkey(mnemonic, this.network);

    const receiving: string[] = [];
    const change: string[] = [];
    this.privateKeys = {};

    for (let i = 0; i < receivingAddressCount; i++) {
      const privKey = make_receiving_address(accountPrivKey, i);
      const pubKey = public_key_from_private_key(privKey);
      const address = pubkey_to_pubkeyhash_address(pubKey, this.network);
      receiving.push(address);
      this.privateKeys[address] = privKey;
    }

    for (let i = 0; i < changeAddressCount; i++) {
      const privKey = make_change_address(accountPrivKey, i);
      const pubKey = public_key_from_private_key(privKey);
      const address = pubkey_to_pubkeyhash_address(pubKey, this.network);
      change.push(address);
      this.privateKeys[address] = privKey;
    }

    this.addresses = {
      addressesByChain: {
        mintlayer: { receiving, change },
      },
    };
  }

  async connect(): Promise<Address> {
    return this.addresses;
  }

  async restore(): Promise<Address> {
    return this.addresses;
  }

  async disconnect(): Promise<void> {}

  async request(method: string, params: any): Promise<any> {
    if (method === 'signTransaction') {
      const signer = new Signer(this.privateKeys, this.network);
      return signer.sign(params.txData);
    }

    if (method === 'signChallenge') {
      const { message, address } = params;
      const privateKey = this.privateKeys[address];
      if (!privateKey) {
        throw new Error(`Private key not found for address: ${address}`);
      }
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = sign_challenge(privateKey, messageBytes);
      const signature = Array.from(signatureBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return { message, address, signature };
    }

    throw new Error(`Method not supported: ${method}`);
  }
}

type CreateHtlcArgs = {
  amount: number;
  token_id?: string;
  secret_hash: {
    hex: string;
    string: string | null;
  };
  spend_address: string;
  spend_pubkey: string;
  refund_address: string;
  refund_timelock: Timelock;
};

type SignedTransaction = string;

type SignedIntentTransaction = {
  transactionHex: string;
  intentEncode: string;
};

/**
 * Developer-facing amount. `atoms` must be a non-negative integer (string or
 * number) expressed in atoms; `decimal` is the human-readable representation.
 */
export type RawAmount = { atoms: string | number; decimal: string | number };

/**
 * Developer-facing value. Tokens carry their `token_id`.
 */
export type RawValue = { type: 'Coin'; amount: RawAmount } | { type: 'TokenV1'; token_id: string; amount: RawAmount };

/**
 * Strings are accepted wherever the canonical format requires a `{hex, string}`
 * pair (e.g. `metadata_uri`, `token_ticker`, NFT metadata fields). Plain strings
 * are hex-encoded automatically.
 */
export type RawStringField = string | { hex: string; string: string };

/**
 * Developer-facing output for {@link Client.buildRawTransaction}. Mirrors the
 * canonical output union but accepts plain strings for `{hex, string}` fields
 * and plain numbers for lock contents.
 */
export type RawOutput =
  | {
      type: 'Transfer';
      destination: string;
      value: RawValue;
    }
  | {
      type: 'LockThenTransfer';
      destination: string;
      value: RawValue;
      lock:
        | { type: 'ForBlockCount'; content: string | number }
        | { type: 'UntilTime'; content: string | number | { timestamp: string | number } };
    }
  | {
      type: 'BurnToken';
      value: RawValue;
    }
  | {
      type: 'DataDeposit';
      data: string;
    }
  | {
      type: 'IssueFungibleToken';
      authority: string;
      is_freezable: boolean;
      metadata_uri: RawStringField;
      number_of_decimals: number;
      token_ticker: RawStringField;
      total_supply: { type: 'Unlimited' | 'Lockable' } | { type: 'Fixed'; amount: RawAmount };
    }
  | {
      type: 'IssueNft';
      destination: string;
      token_id?: string;
      creator?: string | null;
      data: {
        name: RawStringField;
        ticker: RawStringField;
        description: RawStringField;
        media_hash: RawStringField;
        media_uri: RawStringField;
        icon_uri: RawStringField;
        additional_metadata_uri: RawStringField;
      };
    }
  | {
      type: 'CreateOrder';
      ask_balance: RawAmount;
      ask_currency: { type: 'Coin' } | { type: 'TokenV1'; token_id: string };
      give_balance: RawAmount;
      give_currency: { type: 'Coin' } | { type: 'TokenV1'; token_id: string };
      initially_asked: RawAmount;
      initially_given: RawAmount;
      conclude_destination: string;
    }
  | {
      type: 'CreateDelegationId';
      destination: string;
      pool_id: string;
    }
  | {
      type: 'DelegateStaking';
      delegation_id: string;
      amount: RawAmount;
    }
  | {
      type: 'Htlc';
      value: RawValue;
      htlc: {
        refund_key: string;
        secret_hash: string | { hex: string; string: string | null };
        spend_key: string;
        /**
         * UntilTime content accepts either the wrapped `{ timestamp }` object
         * or a bare scalar timestamp; both normalize to the identical
         * canonical `{ timestamp: string }` shape (accepted since the
         * round-3 lock/timelock consolidation).
         */
        refund_timelock:
          | { type: 'UntilTime'; content: { timestamp: string | number } }
          | { type: 'ForBlockCount'; content: string | number };
      };
    };

/**
 * Developer-facing nonce-based account input for {@link Client.buildRawTransaction}.
 *
 * `nonce` is optional: when omitted it is looked up from the token/order/delegation
 * details (`next_nonce`) and incremented sequentially for repeated inputs on the
 * same token. Token-command inputs infer `authority` from token details when omitted.
 * UTXO inputs are not accepted here — coin/token UTXOs are always selected
 * automatically to cover amounts and fees.
 */
export type RawInput =
  | {
      input: {
        input_type: 'AccountCommand';
        command: 'MintTokens';
        token_id: string;
        authority?: string;
        amount: RawAmount;
        nonce?: number;
      };
    }
  | {
      input: {
        input_type: 'AccountCommand';
        command: 'UnmintTokens';
        token_id: string;
        authority?: string;
        amount: RawAmount;
        nonce?: number;
      };
    }
  | {
      input: {
        input_type: 'AccountCommand';
        command: 'LockTokenSupply';
        token_id: string;
        authority?: string;
        nonce?: number;
      };
    }
  | {
      input: {
        input_type: 'AccountCommand';
        command: 'FreezeToken';
        token_id: string;
        authority?: string;
        is_unfreezable: boolean;
        nonce?: number;
      };
    }
  | {
      input: {
        input_type: 'AccountCommand';
        command: 'UnfreezeToken';
        token_id: string;
        authority?: string;
        nonce?: number;
      };
    }
  | {
      input: {
        input_type: 'AccountCommand';
        command: 'ChangeTokenAuthority';
        token_id: string;
        authority?: string;
        new_authority: string;
        nonce?: number;
      };
    }
  | {
      input: {
        input_type: 'AccountCommand';
        command: 'ChangeMetadataUri';
        token_id: string;
        authority?: string;
        new_metadata_uri: string;
        nonce?: number;
      };
    }
  | {
      input: {
        input_type: 'AccountCommand';
        command: 'FillOrder';
        order_id: string;
        fill_atoms: string | number;
        destination: string;
        nonce?: number;
      };
    }
  | {
      input: {
        input_type: 'AccountCommand';
        command: 'ConcludeOrder';
        order_id: string;
        destination: string;
        nonce?: number;
      };
    }
  | {
      input: {
        input_type: 'Account';
        account_type: 'DelegationBalance';
        delegation_id: string;
        amount: RawAmount;
        nonce?: number;
      };
    };

/**
 * Arguments for {@link Client.buildRawTransaction} / {@link Client.forgeTransaction}.
 */
export type RawTransactionArgs = {
  outputs: RawOutput[];
  inputs?: RawInput[];
  opts?: TransactionOpts;
};

export type { TransactionJSONRepresentation } from './types/transaction';

/**
 * Plain assembled-transaction data — exactly what the wallet bridge receives
 * as `txData` and what the Signer consumes. `Transaction.assembleRaw`
 * returns this shape directly; `intent`/`htlc` are attached by intent flows.
 */
type AssembledTransaction = AssembledTransactionData & {
  intent?: string;
  htlc?: { spend_pubkey: string };
};

/**
 * Public type alias for the result of the build* methods (buildTransaction,
 * buildRawTransaction, buildTransfer, …). Exported under a distinct name
 * because `Transaction` refers to the TransactionBuilder class re-exported
 * from './transaction'.
 */
export type BuiltTransaction = AssembledTransaction;

interface TokenDetails {
  token_id: string;
  number_of_decimals: number;
  authority: string;
  next_nonce?: number;
}

interface DelegationDetails {
  balance: AmountFields;
  creation_block_height: number;
  delegation_id: string;
  next_nonce: number;
  spend_destination: string;
}

type TransferParams =
  | {
      amount: number;
      to: string;
      token_id: string;
      token_details: TokenDetails;
    }
  | {
      amount: number;
      to: string;
      token_id?: undefined;
      token_details?: undefined;
    };

type TransactionOpts = {
  withUTXO?: UtxoEntry[];
  forceSpendUtxo?: UtxoEntry[];
};

type BuildTransactionParams =
  | {
      type: 'Transfer';
      params: TransferParams;
      opts?: TransactionOpts;
    }
  | {
      type: 'BurnToken';
      params: {
        amount: number;
        token_id: string;
        token_details?: TokenDetails;
      };
      opts?: TransactionOpts;
    }
  | {
      type: 'IssueFungibleToken';
      params: {
        authority: string;
        is_freezable: boolean;
        metadata_uri: string;
        number_of_decimals: number;
        token_ticker: string;
        supply_type: 'Unlimited' | 'Lockable' | 'Fixed';
        supply_amount?: number;
      };
      opts?: TransactionOpts;
    }
  | {
      type: 'IssueNft';
      params: {
        destination: string;
        creator?: string;
        additional_metadata_uri: string;
        description: string;
        icon_uri: string;
        media_hash: string;
        media_uri: string;
        name: string;
        ticker: string;
      };
      opts?: TransactionOpts;
    }
  | {
      type: 'MintToken';
      params: {
        amount: number;
        destination: string;
        token_id: string;
        token_details: TokenDetails;
      };
      opts?: TransactionOpts;
    }
  | {
      type: 'UnmintToken';
      params: {
        amount: number;
        token_id: string;
        token_details: TokenDetails;
      };
      opts?: TransactionOpts;
    }
  | {
      type: 'FreezeToken';
      params: {
        token_id: string;
        token_details: TokenDetails;
        is_unfreezable: boolean;
      };
      opts?: TransactionOpts;
    }
  | {
      type: 'LockTokenSupply';
      params: {
        token_id: string;
        token_details: TokenDetails;
        is_unfreezable?: boolean;
      };
      opts?: TransactionOpts;
    }
  | {
      type: 'UnfreezeToken';
      params: {
        token_id: string;
        token_details: TokenDetails;
      };
      opts?: TransactionOpts;
    }
  | {
      type: 'ChangeMetadataUri';
      params: {
        token_id: string;
        token_details: TokenDetails;
        new_metadata_uri: string;
      };
      opts?: TransactionOpts;
    }
  | {
      type: 'ChangeTokenAuthority';
      params: {
        token_id: string;
        token_details: TokenDetails;
        new_authority: string;
      };
      opts?: TransactionOpts;
    }
  | {
      type: 'DataDeposit';
      params: {
        data: string;
      };
      opts?: TransactionOpts;
    }
  | {
      type: 'CreateDelegationId';
      params: {
        destination: string;
        pool_id: string;
      };
      opts?: TransactionOpts;
    }
  | {
      type: 'DelegateStaking';
      params: {
        delegation_id: string;
        amount: number;
      };
      opts?: TransactionOpts;
    }
  | {
      type: 'DelegationWithdraw';
      params: {
        delegation_id: string;
        amount: number;
        delegation_details: DelegationDetails;
      };
      opts?: TransactionOpts;
    }
  | {
      type: 'CreateOrder';
      params: {
        ask_amount: number;
        ask_token: string;
        give_amount: number;
        give_token: string;
        conclude_destination: string;
        ask_token_details?: TokenDetails;
        give_token_details?: TokenDetails;
      };
      opts?: TransactionOpts;
    }
  | {
      type: 'ConcludeOrder';
      params: {
        order: OrderData;
      };
      opts?: TransactionOpts;
    }
  | {
      type: 'FillOrder';
      params: {
        order_id: string;
        amount: number;
        destination: string;
        order_details: OrderData;
        ask_token_details: TokenDetails;
        give_token_details: TokenDetails;
      };
      opts?: TransactionOpts;
    }
  | {
      type: 'Htlc';
      params: {
        amount: number;
        token_id: string;
        secret_hash: {
          hex: string;
          string: string | null;
        };
        spend_address: string;
        refund_address: string;
        refund_timelock: Timelock;
      };
      opts?: TransactionOpts;
    };

interface OrderData {
  order_id: string;
  ask_balance: AmountFields;
  nonce: number;
  conclude_destination: string;
  initially_asked: AmountFields;
  initially_given: AmountFields;
  ask_currency: { type: 'Coin' } | { type: 'Token'; token_id: string };
  give_balance: AmountFields;
  give_currency: { type: 'Coin' } | { type: 'Token'; token_id: string };
}

interface ClientOptions {
  network?: 'testnet' | 'mainnet';
  autoRestore?: boolean;
  accountProvider?: AccountProvider;
  apiProvider?: ApiProvider;
}

/**
 * Arguments for the `transfer()` method.
 *
 * If `token_id` is provided, the corresponding token will be sent.
 */
export type TransferArgs =
  { to: string; amount: number; token_id: string } | { to: string; amount: number; token_id?: undefined };

export type TransferNftArgs = {
  to: string;
  token_id: string;
};

export type BurnArgs = {
  token_id: string;
  amount: number;
};

export type IssueNftArgs = {
  destination: string;
  creator?: string;
  additional_metadata_uri: string;
  description: string;
  icon_uri: string;
  media_hash: string;
  media_uri: string;
  name: string;
  ticker: string;
};

export type IssueTokenArgs = {
  authority: string;
  is_freezable: boolean;
  metadata_uri: string;
  number_of_decimals: number;
  token_ticker: string;
  supply_type: 'Unlimited' | 'Lockable' | 'Fixed';
  supply_amount?: number;
};

export type MintTokenArgs = {
  destination: string;
  amount: number;
  token_id: string;
};

export type UnmintTokenArgs = {
  amount: number;
  token_id: string;
};

export type LockTokenSupplyArgs = {
  token_id: string;
};

export type ChangeTokenAuthorityArgs = {
  token_id: string;
  new_authority: string;
};

export type ChangeMetadataUriArgs = {
  token_id: string;
  new_metadata_uri: string;
};

export type FreezeTokenArgs = {
  token_id: string;
  is_unfreezable: boolean;
};

export type UnfreezeTokenArgs = {
  token_id: string;
};

export type DataDepositArgs = {
  data: string;
};

export type DelegationCreateArgs = {
  pool_id: string;
  destination: string;
};

export type DelegationWithdrawArgs =
  | { pool_id: string; amount: number; delegation_id?: undefined }
  | { delegation_id: string; amount: number; pool_id?: undefined };

export type DelegationStakeArgs =
  | { pool_id: string; amount: number; delegation_id?: undefined }
  | { delegation_id: string; amount: number; pool_id?: undefined };

export type CreateOrderArgs = {
  conclude_destination: string;
  ask_token: string;
  ask_amount: number;
  give_token: string;
  give_amount: number;
};

export type FillOrderArgs = {
  order_id: string;
  amount: number;
  destination: string;
};

export type ConcludeOrderArgs = {
  order_id: string;
};

export type BridgeRequestArgs = {
  destination: string;
  amount: number;
  token_id: string;
  intent: string;
};

export type SignChallengeArgs = {
  message: string;
  address?: string;
};

export type SignChallengeResponse = {
  message: string;
  address: string;
  signature: string;
};

export type VerifyChallengeArgs = {
  message: string;
  address: string;
  signature: string;
};

class Client {
  /** Placeholder HTLC creation fee in atoms, shared by legacy and raw builders. */
  private static readonly HTLC_FEE_ATOMS = BigInt(1 * Math.pow(10, 11)); // TODO: 0n

  private network: 'mainnet' | 'testnet';
  private connectedAddresses: {
    receiving: string[];
    change: string[];
  };
  private publicKeys: {
    receiving: string[];
    change: string[];
  };
  private isInitialized: boolean;
  private accountProvider: AccountProvider;
  private apiProvider: ApiProvider;

  /**
   * Creates a new Client instance.
   * @param options
   */
  constructor(options: ClientOptions = {}) {
    this.network = options.network || 'mainnet';
    this.connectedAddresses = { receiving: [], change: [] };
    this.publicKeys = { receiving: [], change: [] };
    this.isInitialized = false;
    this.accountProvider = options.accountProvider || new MojitoAccountProvider();
    this.apiProvider =
      options.apiProvider || new MintlayerApiProvider(this.getDefaultApiServer(), this.getDefaultBatchServer());
  }

  /**
   * Returns the wasm-applicable network type for the current client instance.
   * @private
   */
  private getMLNetwork(): Network {
    return this.network === 'mainnet' ? Network.Mainnet : Network.Testnet;
  }

  /**
   * Creates a new Client instance and initializes it.
   *
   * example custom accountProvider:
   *
   * ```typescript
   * export class InMemoryAccountProvider implements AccountProvider {
   *   constructor(private addresses: Address[]) {}
   *
   *   async connect() {
   *     return this.addresses;
   *   }
   *
   *   async restore() {
   *     return this.addresses;
   *   }
   *
   *   async disconnect() {
   *     return;
   *   }
   *
   *   async request(params: MojitoRequest) {
   *     throw new Error('Signing not supported in InMemoryAccountProvider');
   *   }
   * }
   * ```
   *
   * to use:
   * ```typescript
   * const client = await Client.create({
   *   network: 'testnet',
   *   autoRestore: true,
   *   accountProvider: new InMemoryAccountProvider({
   *     receiving: ['tmt1receiving'], change: ['tmt1change'],
   *   })
   * });
   * ```
   *
   * @param options
   */
  static async create(options: ClientOptions = { autoRestore: true }): Promise<Client> {
    console.log('Create client');
    const client = new Client(options);
    await client.init();

    client.accountProvider = options.accountProvider ?? new MojitoAccountProvider();

    if (options.autoRestore !== false) {
      const restored = await client.restore();
      console.log('[Mojito SDK] Session restore', restored ? 'successful' : 'skipped');
    }

    return client;
  }

  /**
   * Converts a string to a base58 encoded string.
   * @param str
   * @private
   */
  private stringToBase58(str: string): string {
    const bytes = new TextEncoder().encode(str);

    let num = BigInt(
      '0x' +
        Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(''),
    );

    let encoded = '';
    const base = BigInt(58);
    while (num > 0) {
      const remainder = num % base;
      num = num / base;
      encoded = BASE58_ALPHABET[Number(remainder)] + encoded;
    }

    for (let byte of bytes) {
      if (byte === 0) {
        encoded = '1' + encoded;
      } else {
        break;
      }
    }

    return encoded;
  }

  /**
   * Returns the default API server URL based on the network.
   * @private
   */
  private getDefaultApiServer(): string {
    return this.network === 'testnet'
      ? 'https://api-server-lovelace.mintlayer.org/api/v2'
      : 'https://api-server.mintlayer.org/api/v2';
  }

  /**
   * Returns the default batch server URL based on the network.
   * @private
   */
  private getDefaultBatchServer(): string {
    return this.network === 'testnet'
      ? 'https://mojito-api.mintlayer.org/mintlayer/testnet/batch'
      : 'https://mojito-api.mintlayer.org/mintlayer/mainnet/batch';
  }

  /**
   * Initializes the SDK.
   * @private
   */
  private async init(): Promise<void> {
    if (this.isInitialized) {
      console.log('[Mintlayer Connect SDK] Already initialized');
      return;
    }

    try {
      await initWasm();
      console.log('[Mintlayer Connect SDK] Wasm initialized');

      if (this.network !== 'testnet' && this.network !== 'mainnet') {
        throw new Error('Invalid network. Use "testnet" or "mainnet".');
      }
      console.log(`[Mintlayer Connect SDK] Network set to: ${this.network}`);

      await this.apiProvider.getChainTip();
      console.log('[Mintlayer Connect SDK] API server is reachable');

      this.isInitialized = true;
      console.log('[Mintlayer Connect SDK] Initialized successfully');
    } catch (error) {
      console.error('[Mintlayer Connect SDK] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Ensures that the SDK is initialized.
   * @private
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('SDK not initialized. Use Client.create() to initialize the SDK.');
    }
  }

  /**
   * Converts a string to a hex string (UTF-8, zero-padded bytes).
   * @param str
   * @private
   */
  private stringToHex(str: string): string {
    if (!str) {
      return '';
    }

    return Array.from(new TextEncoder().encode(str))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Returns the transaction ID.
   */
  readonly isMintlayer: boolean = true;

  /**
   * Sets the network for the client.
   * @param net
   */
  setNetwork(net: 'mainnet' | 'testnet'): void {
    if (net !== 'testnet' && net !== 'mainnet') {
      throw new Error('Invalid network. Use "testnet" or "mainnet".');
    }
    this.network = net;
    console.log(`[Mintlayer Connect SDK] Network set to: ${this.network}`);
  }

  /**
   * Returns the current network.
   * @returns {string} The current network.
   */
  getNetwork(): 'mainnet' | 'testnet' {
    return this.network;
  }

  /**
   * Checks if the client is connected to the wallet.
   * @returns {boolean} True if connected, false otherwise.
   */
  isConnected() {
    this.ensureInitialized();
    return this.connectedAddresses?.receiving?.length > 0;
  }

  /**
   * Connects to the wallet and retrieves the connected addresses.
   */
  async connect(): Promise<Address> {
    this.ensureInitialized();
    const addresses: any = await this.accountProvider.connect();
    this.connectedAddresses = addresses.addressesByChain.mintlayer;
    this.publicKeys = addresses.addressesByChain.mintlayer.publicKeys;
    return addresses;
  }

  /**
   * Disconnects from the wallet and clears the connected addresses.
   */
  async disconnect(): Promise<void> {
    this.ensureInitialized();
    await this.accountProvider.disconnect();
  }

  /**
   * Restores the session from the wallet.
   */
  async restore(): Promise<boolean> {
    this.ensureInitialized();

    try {
      const addressData = await this.accountProvider.restore();

      if (addressData?.addressesByChain?.mintlayer?.receiving?.length) {
        this.connectedAddresses = addressData.addressesByChain.mintlayer;
        this.publicKeys = { receiving: [], change: [] };
        console.log('[Mintlayer SDK] Session restored');
        return true;
      }

      console.log('[Mintlayer SDK] No session data found for restore');
      return false;
    } catch (err) {
      console.error('[Mintlayer SDK] Failed to restore session:', err);
      return false;
    }
  }

  /**
   * Requests a method from the wallet.
   * @param method
   * @param params
   */
  async request({ method, params }: { method: string; params?: Record<string, any> }): Promise<any> {
    this.ensureInitialized();

    if (typeof this.accountProvider.request !== 'undefined') {
      return await this.accountProvider.request(method, params);
    } else {
      throw new Error('request method not implemented in the account provider');
    }
  }

  /**
   * Returns the connected addresses.
   */
  getAddresses(): { receiving: string[]; change: string[] } {
    this.ensureInitialized();
    if (this.connectedAddresses.receiving.length > 0) {
      return this.connectedAddresses;
    }
    return { receiving: [], change: [] };
  }

  /**
   * Returns the connected address for the current network.
   * @returns {number} Balance.
   */
  async getBalance(): Promise<number> {
    this.ensureInitialized();
    const address = this.connectedAddresses;
    const currentAddress = address;

    if (this.connectedAddresses.receiving.length === 0) {
      throw new Error('No addresses connected. Call connect first.');
    }
    try {
      const addressList = [...currentAddress.receiving, ...currentAddress.change];

      const balancePromises = addressList.map(async (addr: string) => {
        try {
          const data = await this.apiProvider.getAddress(addr);
          return data.coin_balance.decimal;
        } catch (e: any) {
          if (e.message?.includes('404')) {
            console.warn(`Address ${addr} not found`);
            return 0;
          }
          throw e;
        }
      });
      const balances = await Promise.all(balancePromises);
      const totalBalance = balances.reduce((acc: number, balance: string) => {
        return acc + parseFloat(balance);
      }, 0);

      return totalBalance;
    } catch (error) {
      throw new Error(`API error: ${(error as Error).message}`);
    }
  }

  /**
   * Returns the balances for coin and all tokens of the connected addresses.
   */
  async getBalances(): Promise<{
    coin: number;
    token: Record<string, number>;
  }> {
    this.ensureInitialized();
    const address = this.connectedAddresses;
    const currentAddress = address;

    if (this.connectedAddresses.receiving.length === 0) {
      throw new Error('No addresses connected. Call connect first.');
    }

    try {
      const addressList = [...currentAddress.receiving, ...currentAddress.change];

      const balancePromises = addressList.map(async (addr: string) => {
        try {
          return await this.apiProvider.getAddress(addr);
        } catch (e: any) {
          if (e.message?.includes('404')) {
            console.warn(`Address ${addr} not found`);
            return null;
          }
          throw e;
        }
      });

      const results = await Promise.all(balancePromises);

      let totalBalance = 0;
      const tokenMap: Record<string, number> = {};

      for (const result of results) {
        if (!result) continue;

        // Add coin balance
        totalBalance += parseFloat(result.coin_balance.decimal);

        // Add token balances
        if (Array.isArray(result.tokens)) {
          for (const token of result.tokens) {
            const tokenId = token.token_id;
            const tokenDecimal = parseFloat(token.amount.decimal);
            if (!tokenMap[tokenId]) {
              tokenMap[tokenId] = 0;
            }
            tokenMap[tokenId] += tokenDecimal;
          }
        }
      }

      return {
        coin: totalBalance,
        token: tokenMap,
      };
    } catch (error) {
      throw new Error(`API error: ${(error as Error).message}`);
    }
  }

  /**
   * Returns the delegations for the connected addresses.
   */
  async getDelegations(): Promise<DelegationDetails[]> {
    this.ensureInitialized();
    if (this.connectedAddresses.receiving.length === 0) {
      throw new Error('No addresses connected. Call connect first.');
    }
    const address = this.connectedAddresses;
    const currentAddress = address;
    try {
      const addressList = [...currentAddress.receiving, ...currentAddress.change];

      const delegationPromises = addressList.map(async (addr: string) => {
        try {
          return await this.apiProvider.getAddressDelegations(addr);
        } catch (e: any) {
          if (e.message?.includes('404')) {
            console.warn(`Address ${addr} not found`);
            return {};
          }
          throw e;
        }
      });
      const delegations: DelegationDetails[] = await Promise.all(delegationPromises);
      const totalDelegations = delegations.reduce((acc: DelegationDetails[], item: DelegationDetails) => {
        return acc.concat(item);
      }, []);

      return totalDelegations;
    } catch (error) {
      throw new Error(`API error: ${(error as Error).message}`);
    }
  }

  /**
   * Returns the tokens owned by the connected addresses.
   */
  async getTokensOwned(): Promise<string[]> {
    this.ensureInitialized();
    if (this.connectedAddresses.receiving.length === 0) {
      throw new Error('No addresses connected. Call connect first.');
    }
    const address = this.connectedAddresses;
    const currentAddress = address;
    try {
      const addressList = [...currentAddress.receiving, ...currentAddress.change];

      const authorityPromises = addressList.map(async (addr: string) => {
        try {
          return await this.apiProvider.getAddressTokenAuthority(addr);
        } catch (e: any) {
          if (e.message?.includes('404')) {
            console.warn(`Address ${addr} not found`);
            return {};
          }
          throw e;
        }
      });
      const authority = await Promise.all(authorityPromises);
      const totalAuthority = authority.reduce((acc: string[], item: string) => {
        return acc.concat(item);
      }, []);

      return totalAuthority;
    } catch (error) {
      throw new Error(`API error: ${(error as Error).message}`);
    }
  }

  /**
   * Returns the total amount of delegations for the connected addresses.
   */
  async getDelegationsTotal(): Promise<number> {
    this.ensureInitialized();
    const delegations = await this.getDelegations();
    const totalDelegation = delegations.reduce((acc: number, del: DelegationDetails) => {
      return acc + parseFloat(del.balance.decimal);
    }, 0);
    return totalDelegation;
  }

  /**
   * Single source of truth for account-command protocol fees, consumed by both
   * the legacy type-based lookup and the raw builder (which use different
   * vocabularies: 'MintToken' vs 'MintTokens').
   * @private
   */
  private getFeeForCommand(
    command:
      | 'MintTokens'
      | 'UnmintTokens'
      | 'LockTokenSupply'
      | 'FreezeToken'
      | 'UnfreezeToken'
      | 'ChangeTokenAuthority'
      | 'ChangeMetadataUri',
  ): bigint {
    switch (command) {
      case 'MintTokens':
      case 'UnmintTokens':
      case 'LockTokenSupply':
        return this.protocolFee(token_supply_change_fee);
      case 'FreezeToken':
        return this.protocolFee(token_freeze_fee);
      case 'ChangeTokenAuthority':
        return this.protocolFee(token_change_authority_fee);
      case 'ChangeMetadataUri':
      case 'UnfreezeToken':
        return decimalsToAtoms(50, 11);
    }
  }

  /**
   * Returns the fee for a specific transaction type.
   * @param {string} type
   * @returns {bigint} Fee in atoms.
   */
  getFeeForType(type: string): bigint {
    this.ensureInitialized();

    const typeToCommand: Partial<
      Record<
        string,
        | 'MintTokens'
        | 'UnmintTokens'
        | 'LockTokenSupply'
        | 'FreezeToken'
        | 'UnfreezeToken'
        | 'ChangeTokenAuthority'
        | 'ChangeMetadataUri'
      >
    > = {
      MintToken: 'MintTokens',
      UnmintToken: 'UnmintTokens',
      LockTokenSupply: 'LockTokenSupply',
      FreezeToken: 'FreezeToken',
      UnfreezeToken: 'UnfreezeToken',
      ChangeTokenAuthority: 'ChangeTokenAuthority',
      ChangeMetadataUri: 'ChangeMetadataUri',
    };
    const command = typeToCommand[type];
    if (command) {
      return this.getFeeForCommand(command);
    }

    switch (type) {
      case 'Transfer':
        return 0n;
      case 'BurnToken':
        return 0n;
      case 'IssueNft':
        return this.protocolFee(nft_issuance_fee);
      case 'IssueFungibleToken':
        return this.protocolFee(fungible_token_issuance_fee);
      case 'DataDeposit':
        return this.protocolFee(data_deposit_fee);
      case 'CreateDelegationId':
        return 0n;
      case 'DelegateStaking':
        return 0n;
      case 'DelegationStake':
        return 0n;
      case 'DelegationWithdraw':
        return 0n;
      case 'CreateOrder':
        return 0n;
      case 'FillOrder':
        return 0n;
      case 'ConcludeOrder':
        return 0n;
      case 'Htlc':
        return Client.HTLC_FEE_ATOMS;
      default:
        throw new Error(`Unknown transaction type: ${type}`);
    }
  }

  /**
   * Computes a protocol fee (in atoms) via a wasm fee function at the block
   * height used for fee estimation across the SDK.
   * @private
   */
  private protocolFee(fee: (block_height: bigint, network: Network) => Amount): bigint {
    const block_height = FEE_BLOCK_HEIGHT;
    return BigInt(fee(block_height, this.getMLNetwork()).atoms());
  }

  private getRequiredInputsOutputs(args: BuildTransactionParams) {
    const { type, params } = args;
    let send_token: { token_id: string; number_of_decimals: number } | undefined;

    let input_amount_coin_req = 0n;
    let input_amount_token_req = 0n;

    const inputs: Input[] = [];
    const outputs: Output[] = [];
    if (type === 'Transfer') {
      const { token_id, token_details } = params;

      if (token_details) {
        input_amount_token_req += decimalsToAtoms(params.amount!, token_details.number_of_decimals);
        send_token = {
          token_id,
          number_of_decimals: token_details.number_of_decimals,
        };
      } else {
        input_amount_coin_req += decimalsToAtoms(params.amount!, 11);
      }

      outputs.push({
        type: 'Transfer',
        destination: params.to,
        value: {
          ...(token_details
            ? { type: 'TokenV1', token_id }
            : {
                type: 'Coin',
              }),
          ...(token_details
            ? {
                amount: {
                  decimal: decimals(params.amount, token_details.number_of_decimals).toString(),
                  atoms: decimalsToAtoms(params.amount!, token_details.number_of_decimals).toString(),
                },
              }
            : {
                amount: {
                  decimal: decimals(params.amount, 11).toString(),
                  atoms: decimalsToAtoms(params.amount!, 11).toString(),
                },
              }),
        },
      });
    }

    if (type === 'BurnToken') {
      const { token_id, token_details } = params;

      if (token_details) {
        input_amount_token_req += decimalsToAtoms(params.amount!, token_details.number_of_decimals);
        send_token = {
          token_id,
          number_of_decimals: token_details.number_of_decimals,
        };
      } else {
        input_amount_coin_req += decimalsToAtoms(params.amount!, 11);
      }

      outputs.push({
        type: 'BurnToken',
        value: {
          ...(token_id === 'Coin'
            ? { type: 'Coin' }
            : {
                type: 'TokenV1',
                token_id,
              }),
          amount: {
            decimal: decimals(params.amount, 11).toString(),
            atoms: decimalsToAtoms(params.amount!, 11).toString(),
          },
        },
      });
    }

    if (type === 'IssueFungibleToken') {
      let total_supply: { type: 'Unlimited' | 'Lockable' } | { type: 'Fixed'; amount: AmountFields };

      if (params.supply_type === 'Unlimited') {
        total_supply = { type: 'Unlimited' };
      } else if (params.supply_type === 'Lockable') {
        total_supply = { type: 'Lockable' };
      } else if (params.supply_type === 'Fixed') {
        total_supply = {
          type: 'Fixed',
          amount: {
            atoms: decimalsToAtoms(params.supply_amount!, params.number_of_decimals!).toString(),
            decimal: decimals(params.supply_amount!, params.number_of_decimals!).toString(),
          },
        };
      } else {
        throw new Error('Invalid supply_type');
      }

      outputs.push({
        authority: params.authority,
        is_freezable: params.is_freezable,
        metadata_uri: this.normalizeRawStringField(params.metadata_uri!, 'params', 'metadata_uri', MAX_RAW_URI_LENGTH),
        number_of_decimals: params.number_of_decimals,
        token_ticker: this.normalizeRawStringField(
          params.token_ticker!,
          'params',
          'token_ticker',
          MAX_RAW_TICKER_LENGTH,
        ),
        total_supply,
        type: 'IssueFungibleToken',
      });
    }

    if (type === 'IssueNft') {
      outputs.push({
        type: 'IssueNft',
        destination: params.destination,
        token_id: '',
        data: {
          creator: params.creator || '', // Todo: Get the creator address
          additional_metadata_uri: this.normalizeRawStringField(
            params.additional_metadata_uri!,
            'params',
            'additional_metadata_uri',
            MAX_RAW_URI_LENGTH,
          ),
          description: this.normalizeRawStringField(
            params.description!,
            'params',
            'description',
            MAX_RAW_NFT_DESCRIPTION_LENGTH,
          ),
          icon_uri: this.normalizeRawStringField(params.icon_uri!, 'params', 'icon_uri', MAX_RAW_URI_LENGTH),
          media_hash: this.normalizeRawStringField(params.media_hash!, 'params', 'media_hash', MAX_RAW_HASH_LENGTH),
          media_uri: this.normalizeRawStringField(params.media_uri!, 'params', 'media_uri', MAX_RAW_URI_LENGTH),
          name: this.normalizeRawStringField(params.name!, 'params', 'name', MAX_RAW_NFT_NAME_LENGTH),
          ticker: this.normalizeRawStringField(params.ticker!, 'params', 'ticker', MAX_RAW_TICKER_LENGTH),
        },
      });
    }

    if (type === 'MintToken') {
      const amount = {
        atoms: decimalsToAtoms(params.amount!, params.token_details!.number_of_decimals).toString(),
        decimal: decimals(params.amount!, params.token_details!.number_of_decimals).toString(),
      };

      inputs.push({
        input: {
          amount,
          command: 'MintTokens',
          input_type: 'AccountCommand',
          nonce: params.token_details!.next_nonce || 0,
          token_id: params.token_id,
          authority: params.token_details!.authority,
        },
        utxo: null,
      });
      outputs.push({
        destination: params.destination,
        type: 'Transfer',
        value: {
          type: 'TokenV1',
          token_id: params.token_id,
          amount,
        },
      });
    }

    if (type === 'UnmintToken') {
      const amount = {
        atoms: '10000000000000',
        decimal: '100',
      };

      const token_id = params.token_id;
      const token_details = params.token_details;

      input_amount_token_req += decimalsToAtoms(params.amount!, token_details!.number_of_decimals);
      send_token = {
        token_id,
        number_of_decimals: token_details!.number_of_decimals,
      };

      inputs.push({
        input: {
          amount,
          command: 'UnmintTokens',
          input_type: 'AccountCommand',
          nonce: token_details!.next_nonce || 0,
          token_id: params.token_id,
          authority: token_details!.authority,
        },
        utxo: null,
      });
    }

    if (type === 'LockTokenSupply') {
      const token_id = params.token_id;
      const token_details = params.token_details;

      inputs.push({
        input: {
          command: 'LockTokenSupply',
          input_type: 'AccountCommand',
          nonce: token_details!.next_nonce || 0,
          token_id: token_id,
          authority: token_details!.authority,
        },
        utxo: null,
      });
    }

    if (type === 'ChangeTokenAuthority') {
      const token_id = params.token_id;
      const token_details = params.token_details;

      inputs.push({
        input: {
          command: 'ChangeTokenAuthority',
          input_type: 'AccountCommand',
          new_authority: params.new_authority,
          nonce: token_details.next_nonce || 0,
          token_id: token_id,
          authority: token_details.authority,
        },
        utxo: null,
      });
    }

    if (type === 'ChangeMetadataUri') {
      const token_id = params.token_id;
      const token_details = params.token_details;

      inputs.push({
        input: {
          command: 'ChangeMetadataUri',
          input_type: 'AccountCommand',
          new_metadata_uri: params.new_metadata_uri,
          nonce: token_details!.next_nonce || 0,
          token_id: token_id,
          authority: token_details!.authority,
        },
        utxo: null,
      });
    }

    if (type === 'FreezeToken') {
      const token_id = params.token_id;
      const token_details = params.token_details;

      inputs.push({
        input: {
          command: 'FreezeToken',
          input_type: 'AccountCommand',
          is_unfreezable: params.is_unfreezable,
          nonce: token_details!.next_nonce || 0,
          token_id: token_id,
          authority: token_details!.authority,
        },
        utxo: null,
      });
    }

    if (type === 'UnfreezeToken') {
      const token_id = params.token_id;
      const token_details = params.token_details;

      inputs.push({
        input: {
          command: 'UnfreezeToken',
          input_type: 'AccountCommand',
          nonce: token_details!.next_nonce || 0,
          token_id: token_id,
          authority: token_details!.authority,
        },
        utxo: null,
      });
    }

    if (type === 'DataDeposit') {
      outputs.push({
        type: 'DataDeposit',
        data: params.data,
      });
    }

    if (type === 'CreateDelegationId') {
      outputs.push({
        type: 'CreateDelegationId',
        destination: params.destination,
        pool_id: params.pool_id,
      });
    }

    if (type === 'DelegateStaking') {
      const { delegation_id, amount } = params;

      const amount_atoms = decimalsToAtoms(amount!, 11);
      input_amount_coin_req += decimalsToAtoms(amount!, 11);

      outputs.push({
        type: 'DelegateStaking',
        delegation_id,
        amount: {
          atoms: amount_atoms.toString(),
          decimal: amount!.toString(),
        },
      });
    }

    if (type === 'DelegationWithdraw') {
      const { delegation_id, amount, delegation_details } = params;

      const amount_atoms = decimalsToAtoms(amount!, 11);

      inputs.push({
        input: {
          input_type: 'Account',
          account_type: 'DelegationBalance',
          amount: {
            atoms: amount_atoms.toString(),
            decimal: amount.toString(),
          },
          delegation_id,
          nonce: this.validateNextNonce(delegation_details.next_nonce, 'delegation'),
        },
      });

      outputs.push({
        type: 'LockThenTransfer',
        lock: {
          type: 'ForBlockCount',
          content: '7200',
        },
        destination: delegation_details.spend_destination,
        value: {
          type: 'Coin',
          amount: {
            atoms: amount_atoms.toString(),
            decimal: amount!.toString(),
          },
        },
      });
    }

    if (type === 'CreateOrder') {
      const {
        ask_amount,
        ask_token,
        give_amount,
        give_token,
        conclude_destination,
        ask_token_details,
        give_token_details,
      } = params;

      if (give_token === 'Coin') {
        input_amount_coin_req += decimalsToAtoms(give_amount!, 11);
      } else if (give_token_details) {
        input_amount_token_req += decimalsToAtoms(give_amount!, give_token_details.number_of_decimals);
        send_token = {
          token_id: give_token,
          number_of_decimals: give_token_details.number_of_decimals,
        };
      } else {
        throw new Error('Invalid give token');
      }

      outputs.push({
        type: 'CreateOrder',
        conclude_destination,
        ask_currency: ask_token === 'Coin' ? { type: 'Coin' } : { token_id: ask_token, type: 'TokenV1' },
        ask_balance: {
          atoms: ask_token_details
            ? decimalsToAtoms(ask_amount!, ask_token_details.number_of_decimals).toString()
            : decimalsToAtoms(ask_amount!, 11).toString(),
          decimal: ask_amount!.toString(),
        },
        initially_asked: {
          atoms: ask_token_details
            ? decimalsToAtoms(ask_amount!, ask_token_details.number_of_decimals).toString()
            : decimalsToAtoms(ask_amount!, 11).toString(),
          decimal: ask_amount!.toString(),
        },
        give_currency: give_token === 'Coin' ? { type: 'Coin' } : { token_id: give_token, type: 'TokenV1' },
        give_balance: {
          atoms: give_token_details
            ? decimalsToAtoms(give_amount!, give_token_details.number_of_decimals).toString()
            : decimalsToAtoms(give_amount!, 11).toString(),
          decimal: give_amount!.toString(),
        },
        initially_given: {
          atoms: give_token_details
            ? decimalsToAtoms(give_amount!, give_token_details.number_of_decimals).toString()
            : decimalsToAtoms(give_amount!, 11).toString(),
          decimal: give_amount!.toString(),
        },
      });
    }

    if (type === 'ConcludeOrder') {
      const {
        order_id,
        nonce,
        conclude_destination,
        ask_currency,
        give_currency,
        ask_balance,
        give_balance,
        initially_asked,
        initially_given,
      } = params.order;
      inputs.push({
        input: {
          input_type: 'AccountCommand',
          command: 'ConcludeOrder',
          destination: conclude_destination,
          order_id: order_id,
          nonce: nonce,
        },
        utxo: null,
      });

      outputs.push({
        type: 'Transfer',
        destination: conclude_destination,
        value: {
          ...(ask_currency.type === 'Coin'
            ? { type: 'Coin' }
            : {
                type: 'TokenV1',
                token_id: ask_currency.token_id,
              }),
          amount: {
            decimal: (parseInt(initially_asked.decimal) - parseInt(ask_balance.decimal)).toString(),
            atoms: (parseInt(initially_asked.atoms) - parseInt(ask_balance.atoms)).toString(),
          },
        },
      });

      outputs.push({
        type: 'Transfer',
        destination: conclude_destination,
        value: {
          ...(give_currency.type === 'Coin'
            ? { type: 'Coin' }
            : {
                type: 'TokenV1',
                token_id: give_currency.token_id,
              }),
          amount: {
            decimal: give_balance.decimal,
            atoms: give_balance.atoms,
          },
        },
      });
    }

    if (type === 'FillOrder') {
      const { order_id, amount, destination, order_details, ask_token_details, give_token_details } = params;

      const give_amount = amount; // Amount to fill in the order. Give _to_ order as counterpart of ask
      const give_amount_atoms =
        order_details.ask_currency.type === 'Token'
          ? decimalsToAtoms(give_amount!, ask_token_details!.number_of_decimals)
          : decimalsToAtoms(give_amount!, 11); // Coin decimal
      if (order_details.ask_currency.type === 'Coin') {
        input_amount_coin_req += BigInt(give_amount_atoms);
      } else if (ask_token_details) {
        input_amount_token_req += BigInt(give_amount_atoms);
        send_token = {
          token_id: order_details.ask_currency.token_id,
          number_of_decimals: ask_token_details.number_of_decimals,
        };
      }

      const asked = BigInt(order_details.initially_asked.atoms);
      const given = BigInt(order_details.initially_given.atoms);

      const give_atoms = BigInt(give_amount_atoms);
      const ask_amount_atoms_bigint = (give_atoms * given) / asked;

      const rate = parseInt(order_details.initially_asked.atoms) / parseInt(order_details.initially_given.atoms);

      const ask_amount_atoms = ask_amount_atoms_bigint.toString();
      const ask_amount =
        order_details.give_currency.type === 'Token'
          ? atomsToDecimal(ask_amount_atoms, give_token_details!.number_of_decimals)
          : atomsToDecimal(ask_amount_atoms, 11); // Coin decimal

      inputs.push({
        input: {
          input_type: 'AccountCommand',
          command: 'FillOrder',
          order_id: order_id,
          fill_atoms: give_amount_atoms.toString(),
          destination: destination,
          nonce: order_details.nonce.toString(),
        },
        utxo: null,
      });

      outputs.push({
        type: 'Transfer',
        destination: destination,
        value: {
          ...(order_details.give_currency.type === 'Coin'
            ? { type: 'Coin' }
            : {
                type: 'TokenV1',
                token_id: order_details.give_currency.token_id,
              }),
          amount: {
            atoms: ask_amount_atoms.toString(),
            decimal: ask_amount!.toString(),
          },
        },
      });
    }

    if (type === 'Htlc') {
      // @ts-ignore
      const { token_id, token_details } = params;

      if (token_details) {
        input_amount_token_req += BigInt(params.amount! * Math.pow(10, token_details.number_of_decimals));
        send_token = {
          token_id,
          number_of_decimals: token_details.number_of_decimals,
        };
      } else {
        input_amount_coin_req += BigInt(params.amount! * Math.pow(10, 11));
      }

      outputs.push({
        type: 'Htlc',
        htlc: {
          refund_key: params.refund_address,
          refund_timelock: params.refund_timelock,
          secret_hash: {
            hex: params.secret_hash.hex,
            string: null,
          },
          spend_key: params.spend_address,
        },
        value: {
          ...(token_details
            ? {
                amount: {
                  decimal: params.amount!.toString(),
                  atoms: (params.amount! * Math.pow(10, token_details.number_of_decimals)).toString(),
                },
              }
            : {
                amount: {
                  decimal: params.amount!.toString(),
                  atoms: (params.amount! * Math.pow(10, 11)).toString(),
                },
              }),
          ...(token_details
            ? { type: 'TokenV1', token_id }
            : {
                type: 'Coin',
              }),
        },
      });
    }

    return { inputs, outputs, send_token, input_amount_coin_req, input_amount_token_req };
  }

  /**
   * Resolves the UTXO set for assembly: explicit `opts.withUTXO` wins,
   * otherwise the connected addresses' UTXOs are fetched from the API.
   * @private
   */
  private async getAssembleUtxos(opts?: TransactionOpts): Promise<UtxoEntry[]> {
    if (opts?.withUTXO) {
      return opts.withUTXO;
    }
    const addressList = [...this.connectedAddresses.receiving, ...this.connectedAddresses.change];
    return this.apiProvider.getAccountUtxos(addressList, this.network === 'mainnet' ? 0 : 1);
  }

  /**
   * Builds a transaction based on the provided parameters.
   * @param{BuildTransactionParams} arg
   */
  async buildTransaction(arg: BuildTransactionParams): Promise<AssembledTransaction> {
    const { type, params } = arg;

    this.ensureInitialized();
    if (!params) throw new Error('Missing params');

    const { inputs, outputs, input_amount_coin_req, input_amount_token_req, send_token } =
      this.getRequiredInputsOutputs({ type, params } as BuildTransactionParams);

    const baseFee = this.getFeeForType(type);

    return Transaction.assembleRaw(
      {
        outputs,
        inputs,
        requiredCoin: input_amount_coin_req,
        requiredToken: input_amount_token_req,
        sendToken: send_token,
        baseFee,
        deductFeeFromFirstOutput: type === 'DelegationWithdraw',
        withUTXO: await this.getAssembleUtxos(arg?.opts),
        forceSpendUtxo: arg?.opts?.forceSpendUtxo,
      },
      { network: this.network, changeAddress: this.connectedAddresses.change[0] },
    );
  }

  /**
   * Builds an unsigned transaction from developer-forged outputs and optional
   * nonce-based account inputs.
   *
   * Unlike {@link buildTransaction}, the transaction shape is fully chosen by the
   * caller. Coin/token UTXOs are always selected automatically (hybrid model) to
   * cover the outputs, protocol fees and the transaction fee, and change outputs
   * are appended to the first change address.
   *
   * Protocol fees are computed for issuance outputs (IssueFungibleToken,
   * IssueNft), DataDeposit outputs and for fee-bearing account-command inputs
   * (mint/unmint/lock-supply, freeze/unfreeze, change authority/metadata).
   *
   * Plain strings are accepted wherever `{hex, string}` pairs are required and
   * are hex-encoded automatically.
   *
   * @param args - The forged outputs, optional account inputs and UTXO options.
   */
  async buildRawTransaction(args: RawTransactionArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();

    if (!args || typeof args !== 'object') {
      throw new Error('Missing args');
    }
    if (!Array.isArray(args.outputs) || args.outputs.length === 0) {
      throw new Error('At least one output is required');
    }
    if (args.outputs.length > MAX_RAW_OUTPUTS) {
      throw new Error(`Too many outputs: ${args.outputs.length} (maximum ${MAX_RAW_OUTPUTS})`);
    }

    const prepared = await this.prepareRawTransaction(args);

    return Transaction.assembleRaw(
      {
        outputs: prepared.outputs,
        inputs: prepared.inputs ?? [],
        requiredCoin: prepared.requiredCoin,
        requiredToken: prepared.requiredToken,
        sendToken: prepared.sendToken,
        baseFee: prepared.baseFee,
        deductFeeFromFirstOutput: prepared.deductFeeFromFirstOutput,
        withUTXO: await this.getAssembleUtxos(args.opts),
        forceSpendUtxo: args.opts?.forceSpendUtxo,
      },
      { network: this.network, changeAddress: this.connectedAddresses.change[0] },
    );
  }

  /**
   * Builds a raw transaction with {@link buildRawTransaction} and signs it with
   * the connected wallet.
   *
   * @param args - The forged outputs, optional account inputs and UTXO options.
   */
  async forgeTransaction(args: RawTransactionArgs): Promise<SignedTransaction> {
    const tx = await this.buildRawTransaction(args);
    return this.signTransaction(tx);
  }

  /**
   * Normalizes and validates developer-forged outputs/inputs and computes the
   * coin/token requirements for the assembler.
   * @private
   */
  private async prepareRawTransaction(args: RawTransactionArgs): Promise<PreparedTransaction> {
    const tokenDetailsCache = new Map<string, Promise<TokenDetails>>();

    const outputs = await Promise.all(
      args.outputs.map((raw, index) => this.normalizeRawOutput(raw, index, tokenDetailsCache)),
    );
    const inputs = await this.normalizeRawInputs(args.inputs ?? [], tokenDetailsCache);
    const { requiredCoin, requiredToken, sendToken } = await this.computeRawRequirements(
      outputs,
      inputs,
      tokenDetailsCache,
    );

    return { outputs, inputs, requiredCoin, requiredToken, sendToken, baseFee: 0n };
  }

  /**
   * Normalizes developer-forged account inputs, auto-filling nonces (sequentially
   * per token, in input order) and token-command authorities from token details.
   * @private
   */
  private async normalizeRawInputs(
    rawInputs: RawInput[],
    tokenDetailsCache: Map<string, Promise<TokenDetails>>,
  ): Promise<Input[]> {
    const nonceCounters = new Map<string, number>();
    const inputs: Input[] = [];

    for (const raw of rawInputs) {
      if (!raw || typeof raw.input !== 'object') {
        throw new Error('inputs: each input must be an object with an "input" field');
      }

      const meta = raw.input;

      if (meta.input_type !== 'AccountCommand' && meta.input_type !== 'Account') {
        throw new Error(
          `inputs: unsupported input_type "${String((meta as { input_type?: unknown }).input_type)}" — UTXO inputs are selected automatically (use opts.withUTXO to override)`,
        );
      }

      if (meta.input_type === 'AccountCommand') {
        switch (meta.command) {
          case 'MintTokens': {
            const { details, authority, nonce } = await this.resolveRawTokenCommand(
              meta.command,
              meta.token_id,
              meta.authority,
              meta.nonce,
              tokenDetailsCache,
              nonceCounters,
            );
            const amount = this.normalizeRawAmount(
              meta.amount,
              details.number_of_decimals,
              `inputs (command ${meta.command})`,
            );
            inputs.push({
              input: {
                input_type: 'AccountCommand',
                command: 'MintTokens',
                token_id: meta.token_id,
                authority,
                nonce,
                amount,
              },
              utxo: null,
            });
            break;
          }
          case 'UnmintTokens': {
            const { details, authority, nonce } = await this.resolveRawTokenCommand(
              meta.command,
              meta.token_id,
              meta.authority,
              meta.nonce,
              tokenDetailsCache,
              nonceCounters,
            );
            const amount = this.normalizeRawAmount(
              meta.amount,
              details.number_of_decimals,
              `inputs (command ${meta.command})`,
            );
            inputs.push({
              input: {
                input_type: 'AccountCommand',
                command: 'UnmintTokens',
                token_id: meta.token_id,
                authority,
                nonce,
                amount,
              },
              utxo: null,
            });
            break;
          }
          case 'LockTokenSupply': {
            const { authority, nonce } = await this.resolveRawTokenCommand(
              meta.command,
              meta.token_id,
              meta.authority,
              meta.nonce,
              tokenDetailsCache,
              nonceCounters,
            );
            inputs.push({
              input: {
                input_type: 'AccountCommand',
                command: 'LockTokenSupply',
                token_id: meta.token_id,
                authority,
                nonce,
              },
              utxo: null,
            });
            break;
          }
          case 'FreezeToken': {
            const { authority, nonce } = await this.resolveRawTokenCommand(
              meta.command,
              meta.token_id,
              meta.authority,
              meta.nonce,
              tokenDetailsCache,
              nonceCounters,
            );
            inputs.push({
              input: {
                input_type: 'AccountCommand',
                command: 'FreezeToken',
                token_id: meta.token_id,
                authority,
                is_unfreezable: meta.is_unfreezable === true,
                nonce,
              },
              utxo: null,
            });
            break;
          }
          case 'UnfreezeToken': {
            const { authority, nonce } = await this.resolveRawTokenCommand(
              meta.command,
              meta.token_id,
              meta.authority,
              meta.nonce,
              tokenDetailsCache,
              nonceCounters,
            );
            inputs.push({
              input: {
                input_type: 'AccountCommand',
                command: 'UnfreezeToken',
                token_id: meta.token_id,
                authority,
                nonce,
              },
              utxo: null,
            });
            break;
          }
          case 'ChangeTokenAuthority': {
            if (!meta.new_authority) {
              throw new Error('inputs (ChangeTokenAuthority): new_authority is required');
            }
            const { authority, nonce } = await this.resolveRawTokenCommand(
              meta.command,
              meta.token_id,
              meta.authority,
              meta.nonce,
              tokenDetailsCache,
              nonceCounters,
            );
            inputs.push({
              input: {
                input_type: 'AccountCommand',
                command: 'ChangeTokenAuthority',
                token_id: meta.token_id,
                authority,
                new_authority: meta.new_authority,
                nonce,
              },
              utxo: null,
            });
            break;
          }
          case 'ChangeMetadataUri': {
            if (!meta.new_metadata_uri) {
              throw new Error('inputs (ChangeMetadataUri): new_metadata_uri is required');
            }
            const { authority, nonce } = await this.resolveRawTokenCommand(
              meta.command,
              meta.token_id,
              meta.authority,
              meta.nonce,
              tokenDetailsCache,
              nonceCounters,
            );
            inputs.push({
              input: {
                input_type: 'AccountCommand',
                command: 'ChangeMetadataUri',
                token_id: meta.token_id,
                authority,
                new_metadata_uri: meta.new_metadata_uri,
                nonce,
              },
              utxo: null,
            });
            break;
          }
          case 'FillOrder': {
            const order_id = this.validateRawId(meta.order_id, 'inputs (FillOrder)', 'order_id');
            const order: OrderData = await this.apiProvider.getOrder(order_id);
            const orderNonce = this.validateNextNonce(order.nonce, `order ${order_id}`);
            const nonce = this.nextRawNonce(`order:${order_id}`, orderNonce, meta.nonce, nonceCounters);
            inputs.push({
              input: {
                input_type: 'AccountCommand',
                command: 'FillOrder',
                order_id,
                fill_atoms: this.rawAtomsString(meta.fill_atoms, `inputs (FillOrder ${order_id})`, 'fill_atoms'),
                destination: meta.destination,
                nonce: String(nonce),
              },
              utxo: null,
            });
            break;
          }
          case 'ConcludeOrder': {
            const order_id = this.validateRawId(meta.order_id, 'inputs (ConcludeOrder)', 'order_id');
            const order: OrderData = await this.apiProvider.getOrder(order_id);
            const orderNonce = this.validateNextNonce(order.nonce, `order ${order_id}`);
            const nonce = this.nextRawNonce(`order:${order_id}`, orderNonce, meta.nonce, nonceCounters);
            inputs.push({
              input: {
                input_type: 'AccountCommand',
                command: 'ConcludeOrder',
                order_id,
                destination: meta.destination,
                nonce,
              },
              utxo: null,
            });
            break;
          }
          default:
            throw new Error(`inputs: unsupported account command "${String((meta as { command?: unknown }).command)}"`);
        }
      } else if (meta.account_type === 'DelegationBalance') {
        const delegation_id = this.validateRawId(meta.delegation_id, 'inputs (DelegationBalance)', 'delegation_id');
        const delegation: DelegationDetails = await this.apiProvider.getDelegation(delegation_id);
        const delegationNonce = this.validateNextNonce(delegation.next_nonce, `delegation ${delegation_id}`);
        const nonce = this.nextRawNonce(`delegation:${delegation_id}`, delegationNonce, meta.nonce, nonceCounters);
        inputs.push({
          input: {
            input_type: 'Account',
            account_type: 'DelegationBalance',
            amount: this.normalizeRawAmount(meta.amount, 11, `inputs (DelegationBalance ${delegation_id})`),
            delegation_id,
            nonce,
          },
        });
      } else {
        throw new Error(
          `inputs: unsupported account_type "${String((meta as { account_type?: unknown }).account_type)}"`,
        );
      }
    }

    return inputs;
  }

  /**
   * Computes coin/token requirements for raw outputs and inputs, including
   * protocol fees and the fees of the provided account inputs.
   *
   * Token requirements are netted against same-transaction mints: a token
   * requires UTXOs only for the amount by which its outputs exceed the amount
   * minted in the same transaction. Over-minting (minting more than the
   * outputs spend) is allowed and simply leaves the surplus minted.
   * @private
   */
  private async computeRawRequirements(
    outputs: Output[],
    inputs: Input[],
    tokenDetailsCache: Map<string, Promise<TokenDetails>>,
  ): Promise<{
    requiredCoin: bigint;
    requiredToken: bigint;
    sendToken?: { token_id: string; number_of_decimals: number };
  }> {
    let requiredCoin = 0n;
    const tokenRequirements = new Map<string, bigint>();
    const outputTokenTotals = new Map<string, bigint>();
    const mintedTotals = new Map<string, bigint>();

    for (const input of inputs) {
      if (input.input.input_type !== 'AccountCommand') {
        continue;
      }
      if (input.input.command === 'MintTokens') {
        const token_id = input.input.token_id;
        mintedTotals.set(token_id, (mintedTotals.get(token_id) ?? 0n) + BigInt(input.input.amount.atoms));
      }
      if (input.input.command === 'UnmintTokens') {
        const token_id = input.input.token_id;
        tokenRequirements.set(token_id, (tokenRequirements.get(token_id) ?? 0n) + BigInt(input.input.amount.atoms));
      }
    }

    const addCoinRequirement = (atoms: bigint) => {
      requiredCoin += atoms;
    };
    const addTokenOutput = (token_id: string, atoms: bigint) => {
      outputTokenTotals.set(token_id, (outputTokenTotals.get(token_id) ?? 0n) + atoms);
    };

    outputs.forEach((output, index) => {
      const context = `outputs[${index}]`;
      switch (output.type) {
        case 'Transfer':
        case 'LockThenTransfer':
        case 'BurnToken': {
          if (output.value.type === 'Coin') {
            addCoinRequirement(BigInt(output.value.amount.atoms));
          } else {
            addTokenOutput(output.value.token_id, BigInt(output.value.amount.atoms));
          }
          break;
        }
        case 'Htlc': {
          addCoinRequirement(Client.HTLC_FEE_ATOMS);
          if (output.value.type === 'Coin') {
            addCoinRequirement(BigInt(output.value.amount.atoms));
          } else if (output.value.token_id) {
            addTokenOutput(output.value.token_id, BigInt(output.value.amount.atoms));
          }
          break;
        }
        case 'DelegateStaking': {
          addCoinRequirement(BigInt(output.amount.atoms));
          break;
        }
        case 'CreateOrder': {
          if (output.give_currency.type === 'Coin') {
            addCoinRequirement(BigInt(output.give_balance.atoms));
          } else {
            addTokenOutput(output.give_currency.token_id, BigInt(output.give_balance.atoms));
          }
          break;
        }
        case 'IssueFungibleToken': {
          addCoinRequirement(this.protocolFee(fungible_token_issuance_fee));
          break;
        }
        case 'IssueNft': {
          addCoinRequirement(this.protocolFee(nft_issuance_fee));
          break;
        }
        case 'DataDeposit': {
          addCoinRequirement(this.protocolFee(data_deposit_fee));
          break;
        }
        case 'CreateDelegationId':
          break;
        default:
          throw new Error(`${context}: unknown output type`);
      }
    });

    // Net the token outputs against same-transaction mints; only a positive
    // remainder has to be covered from token UTXOs.
    for (const [token_id, outAtoms] of outputTokenTotals) {
      const net = outAtoms - (mintedTotals.get(token_id) ?? 0n);
      if (net > 0n) {
        tokenRequirements.set(token_id, (tokenRequirements.get(token_id) ?? 0n) + net);
      }
    }

    for (const input of inputs) {
      addCoinRequirement(this.getFeeForRawInput(input));
    }

    if (tokenRequirements.size > 1) {
      throw new Error(
        `Raw transactions support at most one non-minted token, found: ${[...tokenRequirements.keys()].join(', ')}`,
      );
    }

    let requiredToken = 0n;
    let sendToken: { token_id: string; number_of_decimals: number } | undefined;

    if (tokenRequirements.size === 1) {
      const [token_id, atoms] = [...tokenRequirements.entries()][0];
      const details = await this.getRawTokenDetails(token_id, tokenDetailsCache);
      requiredToken = atoms;
      sendToken = { token_id, number_of_decimals: details.number_of_decimals };
    }

    return { requiredCoin, requiredToken, sendToken };
  }

  /**
   * Returns the protocol fee (in atoms) contributed by an account input.
   * @private
   */
  private getFeeForRawInput(input: Input): bigint {
    if (input.input.input_type !== 'AccountCommand') {
      return 0n;
    }
    switch (input.input.command) {
      case 'MintTokens':
      case 'UnmintTokens':
      case 'LockTokenSupply':
      case 'FreezeToken':
      case 'UnfreezeToken':
      case 'ChangeTokenAuthority':
      case 'ChangeMetadataUri':
        return this.getFeeForCommand(input.input.command);
      default:
        return 0n; // FillOrder, ConcludeOrder and DelegationBalance carry no protocol fee
    }
  }

  /**
   * Normalizes and validates a developer-forged output.
   * @private
   */
  private async normalizeRawOutput(
    raw: RawOutput,
    index: number,
    tokenDetailsCache: Map<string, Promise<TokenDetails>>,
  ): Promise<Output> {
    const context = `outputs[${index}]`;

    if (!raw || typeof raw !== 'object' || !raw.type) {
      throw new Error(`${context}: output must be an object with a known "type"`);
    }

    switch (raw.type) {
      case 'Transfer': {
        if (!raw.destination) {
          throw new Error(`${context}: destination is required`);
        }
        return {
          type: 'Transfer',
          destination: raw.destination,
          value: await this.normalizeRawValue(raw.value, context, tokenDetailsCache),
        };
      }
      case 'LockThenTransfer': {
        if (!raw.destination) {
          throw new Error(`${context}: destination is required`);
        }
        return {
          type: 'LockThenTransfer',
          destination: raw.destination,
          value: await this.normalizeRawValue(raw.value, context, tokenDetailsCache),
          lock: this.normalizeRawLock(raw.lock, context),
        };
      }
      case 'BurnToken': {
        return { type: 'BurnToken', value: await this.normalizeRawValue(raw.value, context, tokenDetailsCache) };
      }
      case 'DataDeposit': {
        const data = this.sanitizeRawDisplayString(raw.data, context, 'data', MAX_RAW_DATA_DEPOSIT_LENGTH);
        if (data.length === 0) {
          throw new Error(`${context}: data must be a non-empty string`);
        }
        return { type: 'DataDeposit', data };
      }
      case 'IssueFungibleToken': {
        if (!raw.authority) {
          throw new Error(`${context}: authority is required`);
        }
        this.validateTokenDecimals(raw.number_of_decimals, context);
        let total_supply: TotalSupplyValue;
        if (raw.total_supply?.type === 'Unlimited' || raw.total_supply?.type === 'Lockable') {
          total_supply = { type: raw.total_supply.type };
        } else if (raw.total_supply?.type === 'Fixed') {
          total_supply = {
            type: 'Fixed',
            amount: this.normalizeRawAmount(raw.total_supply.amount, raw.number_of_decimals, context),
          };
        } else {
          throw new Error(`${context}: total_supply.type must be "Unlimited", "Lockable" or "Fixed"`);
        }
        return {
          type: 'IssueFungibleToken',
          authority: raw.authority,
          is_freezable: raw.is_freezable === true,
          metadata_uri: this.normalizeRawStringField(raw.metadata_uri, context, 'metadata_uri', MAX_RAW_URI_LENGTH),
          number_of_decimals: raw.number_of_decimals,
          token_ticker: this.normalizeRawStringField(raw.token_ticker, context, 'token_ticker', MAX_RAW_TICKER_LENGTH),
          total_supply,
        };
      }
      case 'IssueNft': {
        if (!raw.destination) {
          throw new Error(`${context}: destination is required`);
        }
        const data = raw.data;
        if (!data || typeof data !== 'object') {
          throw new Error(`${context}: data is required`);
        }
        return {
          type: 'IssueNft',
          destination: raw.destination,
          token_id: raw.token_id ? this.validateRawId(raw.token_id, context, 'token_id') : '',
          data: {
            name: this.normalizeRawStringField(data.name, context, 'name', MAX_RAW_NFT_NAME_LENGTH),
            ticker: this.normalizeRawStringField(data.ticker, context, 'ticker', MAX_RAW_TICKER_LENGTH),
            description: this.normalizeRawStringField(
              data.description,
              context,
              'description',
              MAX_RAW_NFT_DESCRIPTION_LENGTH,
            ),
            media_hash: this.normalizeRawStringField(data.media_hash, context, 'media_hash', MAX_RAW_HASH_LENGTH),
            media_uri: this.normalizeRawStringField(data.media_uri, context, 'media_uri', MAX_RAW_URI_LENGTH),
            icon_uri: this.normalizeRawStringField(data.icon_uri, context, 'icon_uri', MAX_RAW_URI_LENGTH),
            additional_metadata_uri: this.normalizeRawStringField(
              data.additional_metadata_uri,
              context,
              'additional_metadata_uri',
              MAX_RAW_URI_LENGTH,
            ),
            creator: raw.creator
              ? this.sanitizeRawDisplayString(raw.creator, context, 'creator', MAX_RAW_CREATOR_LENGTH)
              : null,
          },
        };
      }
      case 'CreateOrder': {
        if (!raw.conclude_destination) {
          throw new Error(`${context}: conclude_destination is required`);
        }
        const ask_currency = this.validateRawCurrency(raw.ask_currency, context, 'ask_currency');
        const give_currency = this.validateRawCurrency(raw.give_currency, context, 'give_currency');
        const askDecimals =
          ask_currency.type === 'Coin'
            ? 11
            : (await this.getRawTokenDetails(ask_currency.token_id, tokenDetailsCache)).number_of_decimals;
        const giveDecimals =
          give_currency.type === 'Coin'
            ? 11
            : (await this.getRawTokenDetails(give_currency.token_id, tokenDetailsCache)).number_of_decimals;
        return {
          type: 'CreateOrder',
          conclude_destination: raw.conclude_destination,
          ask_currency,
          ask_balance: this.normalizeRawAmount(raw.ask_balance, askDecimals, context),
          give_currency,
          give_balance: this.normalizeRawAmount(raw.give_balance, giveDecimals, context),
          initially_asked: this.normalizeRawAmount(raw.initially_asked, askDecimals, context),
          initially_given: this.normalizeRawAmount(raw.initially_given, giveDecimals, context),
        };
      }
      case 'CreateDelegationId': {
        if (!raw.destination) {
          throw new Error(`${context}: destination is required`);
        }
        const pool_id = this.validateRawId(raw.pool_id, context, 'pool_id');
        return { type: 'CreateDelegationId', destination: raw.destination, pool_id };
      }
      case 'DelegateStaking': {
        const delegation_id = this.validateRawId(raw.delegation_id, context, 'delegation_id');
        return {
          type: 'DelegateStaking',
          delegation_id,
          amount: this.normalizeRawAmount(raw.amount, 11, context),
        };
      }
      case 'Htlc': {
        if (!raw.htlc || typeof raw.htlc !== 'object') {
          throw new Error(`${context}: htlc is required`);
        }
        if (!raw.htlc.spend_key || !raw.htlc.refund_key) {
          throw new Error(`${context}: htlc.spend_key and htlc.refund_key are required`);
        }
        return {
          type: 'Htlc',
          value: await this.normalizeRawValue(raw.value, context, tokenDetailsCache),
          htlc: {
            refund_key: raw.htlc.refund_key,
            spend_key: raw.htlc.spend_key,
            secret_hash: this.normalizeRawSecretHash(raw.htlc.secret_hash, context),
            refund_timelock: this.normalizeRawTimelock(raw.htlc.refund_timelock, context),
          },
        };
      }
      default:
        throw new Error(`${context}: unknown output type "${String((raw as { type?: unknown }).type)}"`);
    }
  }

  /**
   * Validates a Coin/TokenV1 currency discriminant, shared by value and
   * CreateOrder currency normalization. Returns fresh canonical objects so
   * extra caller properties cannot leak into the transaction JSON.
   * @private
   */
  private validateRawCurrency(
    currency: { type: 'Coin' } | { type: 'TokenV1'; token_id: string },
    context: string,
    name: string,
  ): { type: 'Coin' } | { type: 'TokenV1'; token_id: string } {
    if (!currency || (currency.type !== 'Coin' && currency.type !== 'TokenV1')) {
      throw new Error(`${context}: ${name}.type must be "Coin" or "TokenV1"`);
    }
    if (currency.type === 'TokenV1' && !currency.token_id) {
      throw new Error(`${context}: ${name} TokenV1 requires token_id`);
    }
    return currency.type === 'Coin' ? { type: 'Coin' } : { type: 'TokenV1', token_id: currency.token_id };
  }

  /**
   * Normalizes a developer-forged value (Coin or TokenV1). The decimal amount
   * is always recomputed from the validated atoms (11 decimals for Coin, the
   * token's number_of_decimals for TokenV1) so wallets can trust the display
   * value they show the user.
   * @private
   */
  private async normalizeRawValue(
    value: RawValue,
    context: string,
    tokenDetailsCache: Map<string, Promise<TokenDetails>>,
  ): Promise<Value> {
    if (!value || typeof value !== 'object') {
      throw new Error(`${context}: value is required`);
    }
    const currency = this.validateRawCurrency(value, context, 'value');
    if (currency.type === 'Coin') {
      return { type: 'Coin', amount: this.normalizeRawAmount(value.amount, 11, context) };
    }
    const details = await this.getRawTokenDetails(currency.token_id, tokenDetailsCache);
    return {
      type: 'TokenV1',
      token_id: currency.token_id,
      amount: this.normalizeRawAmount(value.amount, details.number_of_decimals, context),
    };
  }

  /**
   * Validates an amount and normalizes it to the canonical `{atoms, decimal}`
   * fields. The decimal value is always recomputed from the validated atoms —
   * a caller-supplied decimal that disagrees is rejected, never echoed.
   * @private
   */
  private normalizeRawAmount(amount: RawAmount, decimals: number, context: string): AmountFields {
    if (!amount || typeof amount !== 'object') {
      throw new Error(`${context}: amount is required`);
    }
    const atoms = this.rawAtomsString(amount.atoms, context);
    const decimal = atomsToDecimal(atoms, decimals);
    if (amount.decimal !== undefined && amount.decimal !== null && String(amount.decimal) !== decimal) {
      throw new Error(
        `${context}: amount.decimal "${amount.decimal}" does not match ${atoms} atoms at ${decimals} decimals ("${decimal}") — decimals are always recomputed from atoms`,
      );
    }
    return { atoms, decimal };
  }

  /**
   * Validates that an atoms value is a non-negative integer and returns it as string.
   * @private
   */
  private rawAtomsString(atoms: string | number, context: string, label = 'amount.atoms'): string {
    const atomsStr = String(atoms);
    if (!/^\d+$/.test(atomsStr)) {
      throw new Error(`${context}: ${label} must be a non-negative integer expressed in atoms (got "${atoms}")`);
    }
    return atomsStr;
  }

  /**
   * Validates a transaction id (64-character hex, case-insensitive) before it
   * is interpolated into API paths or parsed into bytes.
   * @private
   */
  private validateTransactionId(transaction_id: string, context: string): string {
    if (typeof transaction_id !== 'string' || !/^[0-9a-fA-F]{64}$/.test(transaction_id)) {
      throw new Error(`${context}: transaction_id must be a 64-character hex string`);
    }
    return transaction_id;
  }

  /**
   * Validates a token number_of_decimals value (integer 0–18). Shared by raw
   * issuance outputs and token-details lookup so both paths enforce the same
   * bound.
   * @private
   */
  private validateTokenDecimals(value: unknown, context: string): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 18) {
      throw new Error(`${context}: number_of_decimals must be an integer between 0 and 18 (got ${String(value)})`);
    }
    return value;
  }

  /**
   * Validates an on-chain identifier (token/order/delegation/pool id) before it
   * is interpolated into API paths or passed to the wasm encoders. Mintlayer
   * ids are bech32-like (e.g. 'tmltk1…', 'tdelg1…'), hence lowercase
   * alphanumeric with sane length bounds.
   * @private
   */
  private validateRawId(id: string, context: string, name: string): string {
    if (typeof id !== 'string' || id.length < 10 || id.length > 100 || !/^[a-z0-9]+$/.test(id)) {
      throw new Error(`${context}: ${name} has an invalid format`);
    }
    return id;
  }

  /**
   * Strips C0/C1 control characters and Unicode bidi marks from a display
   * string and enforces a maximum length.
   * @private
   */
  private sanitizeRawDisplayString(value: string, context: string, name: string, maxLength: number): string {
    if (typeof value !== 'string') {
      throw new Error(`${context}: ${name} must be a string`);
    }
    const sanitized = value.replace(DISPLAY_STRING_SANITIZE_RE, '');
    if (sanitized.length > maxLength) {
      throw new Error(`${context}: ${name} must be at most ${maxLength} characters`);
    }
    return sanitized;
  }

  /**
   * Wraps a plain string into the canonical `{hex, string}` pair, or validates
   * an already-paired value. The hex is always recomputed from the sanitized
   * string; a caller-provided hex that disagrees is rejected.
   * @private
   */
  private normalizeRawStringField(
    field: RawStringField,
    context: string,
    name: string,
    maxLength: number,
  ): { hex: string; string: string } {
    let string_: string;
    if (typeof field === 'string') {
      string_ = this.sanitizeRawDisplayString(field, context, name, maxLength);
    } else if (field && typeof field === 'object' && typeof field.string === 'string') {
      string_ = this.sanitizeRawDisplayString(field.string, context, name, maxLength);
    } else {
      throw new Error(`${context}: ${name} must be a string or a {hex, string} pair`);
    }

    const hex = this.stringToHex(string_);

    if (field && typeof field === 'object' && field.hex !== undefined) {
      if (typeof field.hex !== 'string' || field.hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(field.hex)) {
        throw new Error(`${context}: ${name}.hex must be an even-length hex string`);
      }
      if (field.hex.toLowerCase() !== hex) {
        throw new Error(`${context}: ${name}.hex does not match ${name}.string`);
      }
    }

    return { hex, string: string_ };
  }

  /**
   * Normalizes an HTLC secret hash (plain hex string or `{hex, string}` pair).
   * @private
   */
  private normalizeRawSecretHash(
    hash: string | { hex: string; string: string | null },
    context: string,
  ): { hex: string; string: string | null } {
    if (typeof hash === 'string') {
      return { hex: this.rawHexString(hash, context, 'htlc.secret_hash'), string: null };
    }
    if (hash && typeof hash.hex === 'string') {
      return { hex: this.rawHexString(hash.hex, context, 'htlc.secret_hash'), string: hash.string ?? null };
    }
    throw new Error(`${context}: htlc.secret_hash must be a hex string or a {hex, string} pair`);
  }

  /**
   * Validates a hex string.
   * @private
   */
  private rawHexString(value: string, context: string, name: string): string {
    if (!/^[0-9a-fA-F]+$/.test(value) || value.length % 2 !== 0) {
      throw new Error(`${context}: ${name} must be an even-length hex string`);
    }
    return value;
  }

  /**
   * Normalizes a LockThenTransfer lock. Contents are validated as non-negative
   * integers and kept as strings (avoids Number precision loss; BigInt is
   * applied at encoding time).
   * @private
   */
  private normalizeRawLock(
    lock:
      | { type: 'ForBlockCount'; content: string | number }
      | { type: 'UntilTime'; content: string | number | { timestamp: string | number } },
    context: string,
  ): { type: 'ForBlockCount' | 'UntilTime'; content: string | { timestamp: string } } {
    return this.normalizeRawTimelockContent(lock, context, 'lock.content', 'lock.type');
  }

  /**
   * Normalizes an HTLC refund timelock. Contents are validated as non-negative
   * integers and kept as strings (BigInt is applied at encoding time).
   * @private
   */
  private normalizeRawTimelock(
    timelock:
      | { type: 'UntilTime'; content: { timestamp: string | number } }
      | { type: 'ForBlockCount'; content: string | number },
    context: string,
  ): Timelock {
    return this.normalizeRawTimelockContent(timelock, context, 'content', 'htlc.refund_timelock.type');
  }

  /**
   * Shared implementation for LockThenTransfer locks and HTLC refund timelocks:
   * validates the discriminant and the numeric content (as ^\d+$ strings) and
   * returns the canonical shape used by the encoders.
   * @private
   */
  private normalizeRawTimelockContent(
    lock:
      | { type: 'ForBlockCount'; content: string | number }
      | { type: 'UntilTime'; content: string | number | { timestamp: string | number } },
    context: string,
    contentLabel: string,
    typeLabel: string,
  ): { type: 'ForBlockCount'; content: string } | { type: 'UntilTime'; content: { timestamp: string } } {
    if (!lock || (lock.type !== 'ForBlockCount' && lock.type !== 'UntilTime')) {
      throw new Error(`${context}: ${typeLabel} must be "ForBlockCount" or "UntilTime"`);
    }
    if (lock.type === 'ForBlockCount') {
      return { type: 'ForBlockCount', content: this.rawAtomsString(lock.content, context, contentLabel) };
    }
    const timestamp = typeof lock.content === 'object' && lock.content !== null ? lock.content.timestamp : lock.content;
    return { type: 'UntilTime', content: { timestamp: this.rawAtomsString(timestamp, context, 'timestamp') } };
  }

  /**
   * Fetches (and caches) token details for decimals/nonce/authority inference.
   * The cache stores the promise so concurrent lookups share one request.
   * @private
   */
  private async getRawTokenDetails(token_id: string, cache: Map<string, Promise<TokenDetails>>): Promise<TokenDetails> {
    this.validateRawId(token_id, 'token_id lookup', 'token_id');
    let details = cache.get(token_id);
    if (!details) {
      details = this.fetchRawTokenDetails(token_id);
      cache.set(token_id, details);
    }
    return details;
  }

  /**
   * Fetches token details and validates their shape before they feed decimal
   * recomputation, nonce assignment and authority inference.
   * @private
   */
  private async fetchRawTokenDetails(token_id: string): Promise<TokenDetails> {
    const raw = await this.apiProvider.getToken(token_id);

    if (!raw || typeof raw !== 'object') {
      throw new Error(`Token ${token_id} not found or returned unexpected data`);
    }

    const { number_of_decimals, authority, next_nonce } = raw as Partial<TokenDetails>;

    this.validateTokenDecimals(number_of_decimals, `Token ${token_id}`);

    if (typeof authority !== 'string' || authority.length === 0) {
      throw new Error(`Token ${token_id} returned an invalid authority`);
    }

    // A string next_nonce ('7') would corrupt nonce arithmetic via concatenation
    if (
      next_nonce !== undefined &&
      (typeof next_nonce !== 'number' || !Number.isInteger(next_nonce) || next_nonce < 0)
    ) {
      throw new Error(`Token ${token_id} returned an invalid next_nonce: ${String(next_nonce)}`);
    }

    return raw as TokenDetails;
  }

  /**
   * Resolves the shared preamble of a token-command input: token details,
   * the authority (inferred from token details when omitted) and the next
   * nonce for the token.
   * @private
   */
  private async resolveRawTokenCommand(
    command: string,
    token_id: string,
    authorityOverride: string | undefined,
    explicitNonce: number | undefined,
    tokenDetailsCache: Map<string, Promise<TokenDetails>>,
    nonceCounters: Map<string, number>,
  ): Promise<{ details: TokenDetails; authority: string; nonce: number }> {
    const details = await this.getRawTokenDetails(token_id, tokenDetailsCache);
    const authority = this.getRawAuthority(authorityOverride, details, command);
    const nonce = this.nextRawNonce(token_id, details.next_nonce ?? 0, explicitNonce, nonceCounters);
    return { details, authority, nonce };
  }

  /**
   * Resolves the authority for a token-command input.
   * @private
   */
  private getRawAuthority(authority: string | undefined, details: TokenDetails, command: string): string {
    const resolved = authority || details.authority;
    if (!resolved) {
      throw new Error(`inputs (${command}): authority is required and could not be inferred from token details`);
    }
    return resolved;
  }

  /**
   * Runtime-validates a nonce served by the API before it feeds nonce
   * arithmetic — a string ('7') would corrupt `base + offset` via
   * concatenation (same contract as the token next_nonce validation).
   * @private
   */
  private validateNextNonce(nonce: unknown, context: string): number {
    if (typeof nonce !== 'number' || !Number.isInteger(nonce) || nonce < 0) {
      throw new Error(`${context} returned an invalid next_nonce: ${String(nonce)}`);
    }
    return nonce;
  }

  /**
   * Assigns the next nonce for a logical sequence (a token, order or
   * delegation, identified by `key`): explicit nonces win and must not fall
   * below the already-assigned ones; auto nonces continue sequentially from
   * `base` in input order. Explicit nonces advance the counter so later
   * inputs cannot collide with them.
   * @private
   */
  private nextRawNonce(
    key: string,
    base: number,
    explicitNonce: number | undefined,
    counters: Map<string, number>,
  ): number {
    const offset = counters.get(key) ?? 0;
    if (explicitNonce !== undefined) {
      if (!Number.isInteger(explicitNonce) || explicitNonce < 0) {
        throw new Error(`inputs: nonce must be a non-negative integer (${key})`);
      }
      if (explicitNonce < base + offset) {
        throw new Error(
          `inputs: explicit nonce ${explicitNonce} for ${key} is below the next expected nonce ${base + offset}`,
        );
      }
      counters.set(key, explicitNonce - base + 1);
      return explicitNonce;
    }
    counters.set(key, offset + 1);
    return base + offset;
  }

  /**
   * Builds a transfer transaction without signing it.
   * If a token_id is provided, token will be transferred instead of base coin.
   *
   * @param to - The recipient address
   * @param amount - The amount to transfer
   * @param token_id - Optional token ID (if transferring tokens instead of base coin)
   * @returns A transaction ready to be signed
   */
  async buildTransfer({ to, amount, token_id }: TransferArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();
    if (token_id) {
      this.validateRawId(token_id, 'transfer', 'token_id');
      const token = await this.apiProvider.getToken(token_id);
      const token_details: TokenDetails = token;
      return this.buildTransaction({ type: 'Transfer', params: { to, amount, token_id, token_details } });
    } else {
      return this.buildTransaction({ type: 'Transfer', params: { to, amount } });
    }
  }

  /**
   * Transfers coins or tokens to a specified address.
   * If a token_id is provided, token will be transferred instead of base coin.
   *
   * @param to - The recipient address
   * @param amount - The amount to transfer
   * @param token_id - Optional token ID (if transferring tokens instead of base coin)
   * @returns A signed transaction
   */
  async transfer({ to, amount, token_id }: TransferArgs): Promise<SignedTransaction> {
    const tx = await this.buildTransfer({ to, amount, token_id });
    return this.signTransaction(tx);
  }

  /**
   * Builds an NFT transfer transaction without signing it.
   * @param to - The recipient address
   * @param token_id - The NFT token ID to transfer
   * @returns A transaction ready to be signed
   */
  async buildTransferNft({ to, token_id }: TransferNftArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();

    if (!token_id) {
      throw new Error('Token ID is required for NFT transfer');
    }

    const amount = 1;
    this.validateRawId(token_id, 'nft lookup', 'token_id');
    const token = await this.apiProvider.getNft(token_id);
    const token_details: TokenDetails = token;
    token_details.number_of_decimals = 0; // that's NFT
    return this.buildTransaction({ type: 'Transfer', params: { to, amount, token_id, token_details } });
  }

  /**
   * Transfers NFT to a given address.
   * @param to - The recipient address
   * @param token_id - The NFT token ID to transfer
   * @returns A signed transaction
   */
  async transferNft({ to, token_id }: TransferNftArgs): Promise<SignedTransaction> {
    const tx = await this.buildTransferNft({ to, token_id });
    return this.signTransaction(tx);
  }

  ////////
  /**
   * Builds a delegation creation transaction without signing it.
   */
  async buildDelegate({
    pool_id,
    destination,
  }: {
    pool_id: string;
    destination: string;
  }): Promise<AssembledTransaction> {
    this.ensureInitialized();
    return this.buildTransaction({ type: 'CreateDelegationId', params: { pool_id, destination } });
  }

  /**
   * Creates a delegation and signs the transaction.
   * @param pool_id - The pool ID to delegate to
   * @param destination - The destination address for the delegation
   * @returns Promise that resolves to a signed transaction
   */
  async delegate({ pool_id, destination }: { pool_id: string; destination: string }): Promise<SignedTransaction> {
    const tx = await this.buildDelegate({ pool_id, destination });
    return this.signTransaction(tx);
  }

  /**
   * Builds an NFT issuance transaction without signing it.
   */
  async buildIssueNft(tokenData: IssueNftArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();
    const description = tokenData.description;

    if (description.length >= 70) {
      throw new Error('Description is too long. Max length is 70 characters.');
    }

    const descriptionBase58 = this.stringToBase58(description);

    if (descriptionBase58.length >= 100) {
      throw new Error('Description is too long.');
    }

    tokenData.description = descriptionBase58;
    return this.buildTransaction({ type: 'IssueNft', params: tokenData });
  }

  /**
   * Issues an NFT and signs the transaction.
   * @param tokenData - The NFT data including metadata
   * @returns Promise that resolves to a signed transaction
   */
  async issueNft(tokenData: IssueNftArgs): Promise<SignedTransaction> {
    const tx = await this.buildIssueNft(tokenData);
    return this.signTransaction(tx);
  }

  /**
   * Builds a fungible token issuance transaction without signing it.
   */
  async buildIssueToken({
    authority,
    is_freezable,
    metadata_uri,
    number_of_decimals,
    token_ticker,
    supply_type,
    supply_amount,
  }: IssueTokenArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();
    return this.buildTransaction({
      type: 'IssueFungibleToken',
      params: { authority, is_freezable, metadata_uri, number_of_decimals, token_ticker, supply_type, supply_amount },
    });
  }

  /**
   * Issues a fungible token and signs the transaction.
   * @param authority - The authority address for the token
   * @param is_freezable - Whether the token can be frozen
   * @param metadata_uri - URI for token metadata
   * @param number_of_decimals - Number of decimal places for the token
   * @param token_ticker - Token ticker symbol
   * @param supply_type - Type of supply (Unlimited, Lockable, or Fixed)
   * @param supply_amount - Initial supply amount (if applicable)
   * @returns Promise that resolves to a signed transaction
   */
  async issueToken({
    authority,
    is_freezable,
    metadata_uri,
    number_of_decimals,
    token_ticker,
    supply_type,
    supply_amount,
  }: IssueTokenArgs): Promise<SignedTransaction> {
    const tx = await this.buildIssueToken({
      authority,
      is_freezable,
      metadata_uri,
      number_of_decimals,
      token_ticker,
      supply_type,
      supply_amount,
    });
    return this.signTransaction(tx);
  }

  /**
   * Builds a token minting transaction without signing it.
   */
  async buildMintToken({ destination, amount, token_id }: MintTokenArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();
    this.validateRawId(token_id, 'token lookup', 'token_id');
    const token = await this.apiProvider.getToken(token_id);
    const token_details = token;

    return this.buildTransaction({
      type: 'MintToken',
      params: { destination, amount, token_id, token_details },
    });
  }

  /**
   * Mints tokens to a specified destination and signs the transaction.
   * @param destination - The destination address to mint tokens to
   * @param amount - The amount of tokens to mint
   * @param token_id - The ID of the token to mint
   * @returns Promise that resolves to a signed transaction
   */
  async mintToken({ destination, amount, token_id }: MintTokenArgs): Promise<SignedTransaction> {
    const tx = await this.buildMintToken({ destination, amount, token_id });
    return this.signTransaction(tx);
  }

  /**
   * Builds a token unminting transaction without signing it.
   */
  async buildUnmintToken({ amount, token_id }: UnmintTokenArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();
    this.validateRawId(token_id, 'token lookup', 'token_id');
    const token = await this.apiProvider.getToken(token_id);
    const token_details = token;

    return this.buildTransaction({ type: 'UnmintToken', params: { amount, token_id, token_details } });
  }

  /**
   * Unmints (burns) tokens from circulation and signs the transaction.
   * @param amount - The amount of tokens to unmint
   * @param token_id - The ID of the token to unmint
   * @returns Promise that resolves to a signed transaction
   */
  async unmintToken({ amount, token_id }: UnmintTokenArgs): Promise<SignedTransaction> {
    const tx = await this.buildUnmintToken({ amount, token_id });
    return this.signTransaction(tx);
  }

  /**
   * Builds a token supply locking transaction without signing it.
   */
  async buildLockTokenSupply({ token_id }: LockTokenSupplyArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();
    this.validateRawId(token_id, 'token lookup', 'token_id');
    const token = await this.apiProvider.getToken(token_id);
    const token_details = token;

    return this.buildTransaction({ type: 'LockTokenSupply', params: { token_id, token_details } });
  }

  /**
   * Locks the token supply to prevent further minting and signs the transaction.
   * @param token_id - The ID of the token to lock supply for
   * @returns Promise that resolves to a signed transaction
   */
  async lockTokenSupply({ token_id }: LockTokenSupplyArgs): Promise<SignedTransaction> {
    const tx = await this.buildLockTokenSupply({ token_id });
    return this.signTransaction(tx);
  }

  /**
   * Builds a token authority change transaction without signing it.
   */
  async buildChangeTokenAuthority({
    token_id,
    new_authority,
  }: ChangeTokenAuthorityArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();
    this.validateRawId(token_id, 'token lookup', 'token_id');
    const token = await this.apiProvider.getToken(token_id);
    const token_details = token;

    return this.buildTransaction({
      type: 'ChangeTokenAuthority',
      params: { token_id, new_authority, token_details },
    });
  }

  /**
   * Changes the authority of a token and signs the transaction.
   * @param token_id - The ID of the token to change authority for
   * @param new_authority - The new authority address
   * @returns Promise that resolves to a signed transaction
   */
  async changeTokenAuthority({ token_id, new_authority }: ChangeTokenAuthorityArgs): Promise<SignedTransaction> {
    const tx = await this.buildChangeTokenAuthority({ token_id, new_authority });
    return this.signTransaction(tx);
  }

  /**
   * Builds a token metadata URI change transaction without signing it.
   */
  async buildChangeMetadataUri({ token_id, new_metadata_uri }: ChangeMetadataUriArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();
    this.validateRawId(token_id, 'token lookup', 'token_id');
    const token = await this.apiProvider.getToken(token_id);
    const token_details = token;

    return this.buildTransaction({
      type: 'ChangeMetadataUri',
      params: { token_id, new_metadata_uri, token_details },
    });
  }

  /**
   * Changes the metadata URI of a token and signs the transaction.
   * @param token_id - The ID of the token to change metadata URI for
   * @param new_metadata_uri - The new metadata URI
   * @returns Promise that resolves to a signed transaction
   */
  async changeMetadataUri({ token_id, new_metadata_uri }: ChangeMetadataUriArgs): Promise<SignedTransaction> {
    const tx = await this.buildChangeMetadataUri({ token_id, new_metadata_uri });
    return this.signTransaction(tx);
  }

  /**
   * Builds a token freezing transaction without signing it.
   */
  async buildFreezeToken({ token_id, is_unfreezable }: FreezeTokenArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();
    this.validateRawId(token_id, 'token lookup', 'token_id');
    const token = await this.apiProvider.getToken(token_id);
    const token_details = token;

    return this.buildTransaction({
      type: 'FreezeToken',
      params: { token_id, is_unfreezable, token_details },
    });
  }

  /**
   * Freezes a token to prevent transfers and signs the transaction.
   * @param token_id - The ID of the token to freeze
   * @param is_unfreezable - Whether the token can be unfrozen later
   * @returns Promise that resolves to a signed transaction
   */
  async freezeToken({ token_id, is_unfreezable }: FreezeTokenArgs): Promise<SignedTransaction> {
    const tx = await this.buildFreezeToken({ token_id, is_unfreezable });
    return this.signTransaction(tx);
  }

  /**
   * Builds a token unfreezing transaction without signing it.
   */
  async buildUnfreezeToken({ token_id }: UnfreezeTokenArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();
    this.validateRawId(token_id, 'token lookup', 'token_id');
    const token = await this.apiProvider.getToken(token_id);
    const token_details = token;

    return this.buildTransaction({ type: 'UnfreezeToken', params: { token_id, token_details } });
  }

  /**
   * Unfreezes a previously frozen token and signs the transaction.
   * @param token_id - The ID of the token to unfreeze
   * @returns Promise that resolves to a signed transaction
   */
  async unfreezeToken({ token_id }: UnfreezeTokenArgs): Promise<SignedTransaction> {
    const tx = await this.buildUnfreezeToken({ token_id });
    return this.signTransaction(tx);
  }

  /**
   * Builds an order creation transaction without signing it.
   */
  async buildCreateOrder({
    conclude_destination,
    ask_token,
    ask_amount,
    give_token,
    give_amount,
  }: CreateOrderArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();

    let ask_token_details = null;
    let give_token_details = null;

    if (ask_token !== 'Coin') {
      this.validateRawId(ask_token, 'create order', 'ask_token');
      ask_token_details = await this.apiProvider.getToken(ask_token);
    }

    if (give_token !== 'Coin') {
      this.validateRawId(give_token, 'create order', 'give_token');
      give_token_details = await this.apiProvider.getToken(give_token);
    }

    return this.buildTransaction({
      type: 'CreateOrder',
      params: {
        conclude_destination,
        ask_token,
        ask_amount,
        give_token,
        give_amount,
        ask_token_details,
        give_token_details,
      },
    });
  }

  /**
   * Creates a trading order and signs the transaction.
   * @param conclude_destination - The destination address for order conclusion
   * @param ask_token - The token being requested
   * @param ask_amount - The amount of tokens being requested
   * @param give_token - The token being offered
   * @param give_amount - The amount of tokens being offered
   * @returns Promise that resolves to a signed transaction
   */
  async createOrder({
    conclude_destination,
    ask_token,
    ask_amount,
    give_token,
    give_amount,
  }: CreateOrderArgs): Promise<SignedTransaction> {
    const tx = await this.buildCreateOrder({
      conclude_destination,
      ask_token,
      ask_amount,
      give_token,
      give_amount,
    });
    return this.signTransaction(tx);
  }

  /**
   * Builds an order fill transaction without signing it.
   */
  async buildFillOrder({ order_id, amount, destination }: FillOrderArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();
    this.validateRawId(order_id, 'fill order', 'order_id');
    const data = await this.apiProvider.getOrder(order_id);
    const order_details: OrderData = data;

    const { ask_currency, give_currency } = order_details;

    let ask_token_details = null;
    let give_token_details = null;

    if (ask_currency.type !== 'Coin') {
      ask_token_details = await this.apiProvider.getToken(ask_currency.token_id);
    }

    if (give_currency.type !== 'Coin') {
      give_token_details = await this.apiProvider.getToken(give_currency.token_id);
    }

    return this.buildTransaction({
      type: 'FillOrder',
      params: { order_id, amount, destination, order_details, ask_token_details, give_token_details },
    });
  }

  /**
   * Fills an existing trading order and signs the transaction.
   * @param order_id - The ID of the order to fill
   * @param amount - The amount to fill
   * @param destination - The destination address for the filled order
   * @returns Promise that resolves to a signed transaction
   */
  async fillOrder({ order_id, amount, destination }: FillOrderArgs): Promise<SignedTransaction> {
    const tx = await this.buildFillOrder({ order_id, amount, destination });
    return this.signTransaction(tx);
  }

  /**
   * Gets all orders created by the connected account.
   * @returns Promise that resolves to an array of order data
   */
  async getAccountOrders(): Promise<OrderData[]> {
    this.ensureInitialized();
    const allOrders = await this.getAvailableOrders();
    const address = this.connectedAddresses;
    const currentAddress = address;
    const addressList = [...currentAddress.receiving, ...currentAddress.change];
    const orders = allOrders.filter((order: OrderData) => {
      return addressList.includes(order.conclude_destination);
    });
    return orders;
  }

  /**
   * Builds an order conclusion transaction without signing it.
   */
  async buildConcludeOrder({ order_id }: ConcludeOrderArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();
    this.validateRawId(order_id, 'conclude order', 'order_id');
    const order: OrderData = await this.apiProvider.getOrder(order_id);

    return this.buildTransaction({ type: 'ConcludeOrder', params: { order } });
  }

  /**
   * Concludes a trading order and signs the transaction.
   * @param order_id - The ID of the order to conclude
   * @returns Promise that resolves to a signed transaction
   */
  async concludeOrder({ order_id }: ConcludeOrderArgs): Promise<SignedTransaction> {
    const tx = await this.buildConcludeOrder({ order_id });
    return this.signTransaction(tx);
  }

  /**
   * Builds a bridge request transaction without signing it.
   */
  async buildBridgeRequest({
    destination,
    amount,
    token_id,
    intent,
  }: BridgeRequestArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();

    if (!token_id) {
      throw new Error('Token is mandatory');
    }

    this.validateRawId(token_id, 'bridge request', 'token_id');
    const token_details = await this.apiProvider.getToken(token_id);

    const tx = await this.buildTransaction({
      type: 'Transfer',
      params: { to: destination, amount, token_id, token_details },
    });
    return { ...tx, intent };
  }

  /**
   * Creates a bridge request transaction and signs it.
   * @param destination - The destination address for the bridge request
   * @param amount - The amount to bridge
   * @param token_id - The ID of the token to bridge
   * @param intent - The bridge intent information
   * @returns Promise that resolves to a signed transaction
   */
  async bridgeRequest({ destination, amount, token_id, intent }: BridgeRequestArgs): Promise<SignedIntentTransaction> {
    const tx = await this.buildBridgeRequest({ destination, amount, token_id, intent });
    return this.signIntentTransaction(tx);
  }

  /**
   * Builds a burn transaction without signing it.
   */
  async buildBurn({ token_id, amount }: BurnArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();
    let token_details: TokenDetails | undefined = undefined;

    if (token_id !== 'Coin' && token_id !== null) {
      this.validateRawId(token_id, 'burn', 'token_id');
      token_details = await this.apiProvider.getToken(token_id);
    }

    return this.buildTransaction({ type: 'BurnToken', params: { token_id, amount, token_details } });
  }

  /**
   * Burns tokens or coins and signs the transaction.
   * @param token_id - The ID of the token to burn (or 'Coin' for base coin)
   * @param amount - The amount to burn
   * @returns Promise that resolves to a signed transaction
   */
  async burn({ token_id, amount }: BurnArgs): Promise<SignedTransaction> {
    const tx = await this.buildBurn({ token_id, amount });
    return this.signTransaction(tx);
  }

  /**
   * Builds a data deposit transaction without signing it.
   */
  async buildDataDeposit({ data }: DataDepositArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();
    return this.buildTransaction({ type: 'DataDeposit', params: { data } });
  }

  /**
   * Creates a data deposit transaction and signs it.
   * @param data - The data to deposit on the blockchain
   * @returns Promise that resolves to a signed transaction
   */
  async dataDeposit({ data }: DataDepositArgs): Promise<SignedTransaction> {
    const tx = await this.buildDataDeposit({ data });
    return this.signTransaction(tx);
  }

  /**
   * Builds a delegation creation transaction without signing it.
   */
  async buildDelegationCreate({ pool_id, destination }: DelegationCreateArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();
    return this.buildTransaction({ type: 'CreateDelegationId', params: { pool_id, destination } });
  }

  /**
   * Creates a delegation ID and signs the transaction.
   * @param pool_id - The pool ID to create delegation for
   * @param destination - The destination address for the delegation
   * @returns Promise that resolves to a signed transaction
   */
  async delegationCreate({ pool_id, destination }: DelegationCreateArgs): Promise<SignedTransaction> {
    const tx = await this.buildDelegationCreate({ pool_id, destination });
    return this.signTransaction(tx);
  }

  /**
   * Builds a delegation staking transaction without signing it.
   */
  async buildDelegationStake(params: DelegationStakeArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();

    const amount = params.amount;
    const delegation_id = params.delegation_id;
    const pool_id = params.pool_id;

    if (!delegation_id && !pool_id) {
      throw new Error('Delegation id or pool id is required');
    }

    if (delegation_id) {
      return this.buildTransaction({ type: 'DelegateStaking', params: { delegation_id, amount } });
    } else if (pool_id) {
      this.validateRawId(pool_id, 'delegation stake', 'pool_id');
      const data: DelegationDetails[] = await this.apiProvider.getPoolDelegations(pool_id).catch(() => {
        throw new Error('Failed to fetch delegation id');
      });

      const delegationIdMap = data.reduce((acc: { [key: string]: string }, item: DelegationDetails) => {
        acc[item.spend_destination] = item.delegation_id;
        return acc;
      }, {});

      const addresses = this.getAddresses();
      const allAddresses = [...addresses.receiving, ...addresses.change];

      // find the first delegation id for the given pool id
      const first_delegation_id = allAddresses.reduce((acc: string | null, address: string) => {
        if (delegationIdMap[address]) {
          return delegationIdMap[address];
        }
        return acc;
      }, null);

      if (!first_delegation_id) {
        throw new Error('No delegation id found for the given pool id');
      }

      return this.buildTransaction({
        type: 'DelegateStaking',
        params: { delegation_id: first_delegation_id, amount },
      });
    } else {
      throw new Error('Delegation id or pool id is required');
    }
  }

  /**
   * Stakes tokens to a delegation and signs the transaction.
   * @param params - The delegation staking parameters including amount and delegation/pool ID
   * @returns Promise that resolves to a signed transaction
   */
  async delegationStake(params: DelegationStakeArgs): Promise<SignedTransaction> {
    const tx = await this.buildDelegationStake(params);
    return this.signTransaction(tx);
  }

  /**
   * Builds a delegation withdrawal transaction without signing it.
   */
  async buildDelegationWithdraw(params: DelegationWithdrawArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();
    const amount = params.amount;
    const delegation_id = params.delegation_id;
    const pool_id = params.pool_id;

    if (!delegation_id && !pool_id) {
      throw new Error('Delegation id or pool id is required');
    }

    if (delegation_id) {
      this.validateRawId(delegation_id, 'delegation withdraw', 'delegation_id');
      const delegation_details: DelegationDetails = await this.apiProvider.getDelegation(delegation_id);

      return this.buildTransaction({
        type: 'DelegationWithdraw',
        params: { delegation_id, amount, delegation_details },
      });
    } else if (pool_id) {
      this.validateRawId(pool_id, 'delegation withdraw', 'pool_id');
      const data = await this.apiProvider.getPoolDelegations(pool_id);

      const delegationIdMap: Record<string, DelegationDetails> = data.reduce(
        (acc: { [key: string]: DelegationDetails }, item: DelegationDetails) => {
          acc[item.spend_destination] = item;
          return acc;
        },
        {},
      );

      const addresses = this.getAddresses();
      const allAddresses = [...addresses.receiving, ...addresses.change];

      // find the first delegation id for the given pool id
      const matchedAddress = allAddresses.find((address) => delegationIdMap[address]);
      const first_delegation = matchedAddress ? delegationIdMap[matchedAddress] : null;

      if (!first_delegation) {
        throw new Error('No delegation id found for the given pool id');
      }

      return this.buildTransaction({
        type: 'DelegationWithdraw',
        params: { delegation_id: first_delegation.delegation_id, amount, delegation_details: first_delegation },
      });
    } else {
      throw new Error('Delegation id or pool id is required');
    }
  }

  /**
   * Withdraws tokens from a delegation and signs the transaction.
   * @param params - The delegation withdrawal parameters including amount and delegation/pool ID
   * @returns Promise that resolves to a signed transaction
   */
  async delegationWithdraw(params: DelegationWithdrawArgs): Promise<SignedTransaction> {
    const tx = await this.buildDelegationWithdraw(params);
    return this.signTransaction(tx);
  }

  /**
   * Builds an HTLC creation transaction without signing it.
   */
  async buildCreateHtlc(params: CreateHtlcArgs): Promise<AssembledTransaction> {
    this.ensureInitialized();

    let token_details: TokenDetails | undefined = undefined;

    if (params.token_id) {
      this.validateRawId(params.token_id, 'create htlc', 'token_id');
      const token = await this.apiProvider.getToken(params.token_id);
      token_details = token;
    }

    const tx = await this.buildTransaction({
      type: 'Htlc',
      params: {
        amount: params.amount,
        // @ts-ignore
        token_id: params.token_id,
        token_details: token_details || undefined,
        // @ts-ignore
        secret_hash: params.secret_hash, // should be optional!!
        spend_address: params.spend_address,
        spend_pubkey: params.spend_pubkey,
        refund_address: params.refund_address,
        refund_timelock: params.refund_timelock,
      },
    });
    return { ...tx, htlc: { spend_pubkey: params.spend_pubkey } };
  }

  /**
   * Creates a Hash Time Locked Contract (HTLC) and signs the transaction.
   * @param params - The HTLC parameters including amount, addresses, and timelock
   * @returns Promise that resolves to a signed transaction
   */
  async createHtlc(params: CreateHtlcArgs): Promise<SignedTransaction> {
    const tx = await this.buildCreateHtlc(params);
    return this.signTransaction(tx);
  }

  /**
   * Builds an HTLC refund transaction without signing it.
   */
  /**
   * Builds an HTLC claim transaction (refund after timelock, or spend with
   * the secret) without signing it. The two flows differ only in which HTLC
   * key receives the funds.
   * @private
   */
  private async buildHtlcClaim(params: any, keyField: 'refund_key' | 'spend_key'): Promise<AssembledTransaction> {
    this.ensureInitialized();

    const { transaction_id } = params;

    let useHtlcUtxo: any[] = [];

    if (transaction_id) {
      this.validateTransactionId(transaction_id, 'HTLC lookup');
      const transaction: TransactionJSONRepresentation = await this.apiProvider.getTransaction(transaction_id);
      const { created } = this.previewUtxoChange({ JSONRepresentation: { ...transaction } } as AssembledTransaction);
      useHtlcUtxo = created.filter(({ utxo }) => utxo.type === 'Htlc');
    }

    let token_details = undefined;

    if (useHtlcUtxo[0].utxo.value.type === 'TokenV1') {
      token_details = await this.apiProvider.getToken(useHtlcUtxo[0].utxo.value.token_id);
    }

    return this.buildTransaction({
      type: 'Transfer',
      params: {
        to: useHtlcUtxo[0].utxo.htlc[keyField],
        amount: useHtlcUtxo[0].utxo.value.amount.decimal,
        ...(useHtlcUtxo[0].utxo.value.type === 'TokenV1' ? { token_id: useHtlcUtxo[0].utxo.value.token_id } : {}),
        token_details,
      },
      opts: {
        forceSpendUtxo: useHtlcUtxo,
      },
    });
  }

  /**
   * Refunds an HTLC after the timelock expires and signs the transaction.
   * @param params - The refund parameters including transaction ID or UTXO
   * @returns Promise that resolves to a signed transaction
   */
  async refundHtlc(params: any): Promise<any> {
    const tx = await this.buildRefundHtlc(params);
    return this.signTransaction(tx);
  }

  /**
   * Builds an HTLC refund transaction without signing it.
   */
  async buildRefundHtlc(params: any): Promise<AssembledTransaction> {
    return this.buildHtlcClaim(params, 'refund_key');
  }

  /**
   * Builds an HTLC spend transaction without signing it.
   */
  async buildSpendHtlc(params: any): Promise<AssembledTransaction> {
    return this.buildHtlcClaim(params, 'spend_key');
  }

  /**
   * Spends an HTLC by providing the secret and signs the transaction.
   * @param params - The spend parameters including transaction ID or UTXO
   * @returns Promise that resolves to a signed transaction
   */
  async spendHtlc(params: any): Promise<any> {
    const tx = await this.buildSpendHtlc(params);
    return this.signTransaction(tx);
  }

  /**
   * Extracts the secret from an HTLC spend transaction.
   * @param arg - Object containing transaction_id, transaction_hex, and optional format
   * @param arg.transaction_id - The transaction ID containing the HTLC spend
   * @param arg.transaction_hex - The hex representation of the signed transaction
   * @param arg.format - The format for the returned secret ('Uint8Array' or 'hex')
   * @returns Promise that resolves to the extracted secret
   */
  async extractHtlcSecret(arg: any): Promise<any> {
    const {
      transaction_id,
      transaction_hex,
      format = 'Uint8Array', // 'bytes' or 'hex'
    } = arg;

    this.validateTransactionId(transaction_id, 'HTLC secret extraction');
    const transaction: TransactionJSONRepresentation = await this.apiProvider.getTransaction(transaction_id);

    const transaction_signed = hexToUint8Array(transaction_hex);

    const inputs = transaction.inputs.filter(({ utxo }: any) => utxo && utxo.type === 'Htlc');

    const outpointedSourceIds: any[] = (inputs as any[])
      .filter(({ input }) => input.input_type === 'UTXO')
      .map(({ input }) => {
        const bytes = Uint8Array.from(input.source_id.match(/.{1,2}/g)!.map((byte: any) => parseInt(byte, 16)));
        return {
          source_id: encode_outpoint_source_id(bytes, SourceId.Transaction),
          index: input.index,
        };
      });

    const htlc_outpoint_source_id: any = outpointedSourceIds[0].source_id;
    const htlc_output_index: any = outpointedSourceIds[0].index;

    const secret = extract_htlc_secret(transaction_signed, true, htlc_outpoint_source_id, htlc_output_index);

    if (format === 'hex') {
      return uint8ArrayToHex(secret);
    }

    return secret;
  }

  /**
   * Signs a transaction using the connected wallet.
   * @param tx - The transaction to sign
   * @returns Promise that resolves to the signed transaction hex
   */
  async signTransaction(tx: AssembledTransaction): Promise<SignedTransaction> {
    this.ensureInitialized();
    return this.request({
      method: 'signTransaction',
      params: { txData: tx },
    });
  }

  async signIntentTransaction(tx: AssembledTransaction): Promise<SignedIntentTransaction> {
    this.ensureInitialized();
    return this.request({
      method: 'signTransaction',
      params: { txData: tx },
    });
  }

  /**
   * Signs a challenge message with the given address.
   * Used to prove ownership of the address.
   * @param args
   */
  async signChallenge(args: SignChallengeArgs): Promise<SignChallengeResponse> {
    this.ensureInitialized();
    return this.request({
      method: 'signChallenge',
      params: {
        message: args.message,
        address: args.address,
      },
    });
  }

  /**
   * Verifies a signed challenge message.
   * Used to verify that a signature was produced by the private key corresponding to the given address.
   *
   * Note: The provided address must be a 'pubkeyhash' address.
   *
   * @param args - Object containing message, address, and signature
   * @returns Promise that resolves to true if the signature is valid, throws an error otherwise
   */
  async verifyChallenge(args: VerifyChallengeArgs): Promise<boolean> {
    this.ensureInitialized();

    const messageBytes = stringToUint8Array(args.message);
    const signatureBytes = hexToUint8Array(args.signature);
    const network = this.getMLNetwork();

    return verify_challenge(args.address, network, signatureBytes, messageBytes);
  }

  /**
   * Requests a secret hash from the wallet for HTLC operations.
   * @param args - Additional arguments (currently unused)
   * @returns Promise that resolves to the secret hash
   */
  async requestSecretHash(args: any): Promise<any> {
    this.ensureInitialized();
    return this.request({
      method: 'requestSecretHash',
      params: {},
    });
  }

  /**
   * Returns a preview of UTXO changes (spent/created) for a built transaction.
   *
   * ⚠️ WARNING: This is *only* a local simulation based on the unsigned transaction.
   * If the transaction is not successfully broadcast to the network, these changes are NOT real.
   *
   * Use this method very carefully.
   *
   * @param tx - The transaction to preview.
   * @return { spent: UtxoEntry[], created: UtxoEntry[] } An object containing arrays of spent and created UTXOs.
   */
  previewUtxoChange(tx: AssembledTransaction): { spent: UtxoEntry[]; created: UtxoEntry[] } {
    const spent: UtxoEntry[] = [];
    const created: UtxoEntry[] = [];

    tx.JSONRepresentation.inputs.forEach((input: any) => {
      if (input.input.input_type === 'UTXO' && (input as UtxoInput).utxo) {
        spent.push({
          outpoint: {
            index: input.input.index,
            source_type: input.input.source_type,
            source_id: input.input.source_id,
          },
          utxo: (input as UtxoInput).utxo,
        });
      }
    });

    tx.JSONRepresentation.outputs.forEach((output: any, index: number) => {
      if (output.type === 'Transfer') {
        created.push({
          outpoint: {
            index,
            source_type: SourceId.Transaction,
            source_id: tx.JSONRepresentation.id,
          },
          utxo: {
            type: output.type,
            value: output.value,
            destination: output.destination,
          },
        });
      }
      if (output.type === 'LockThenTransfer') {
        created.push({
          outpoint: {
            index,
            source_type: SourceId.Transaction,
            source_id: tx.transaction_id,
          },
          utxo: {
            type: output.type,
            value: output.value,
            destination: output.destination,
            lock: output.lock,
          },
        });
      }
      if (output.type === 'IssueNft') {
        created.push({
          outpoint: {
            index,
            source_type: SourceId.Transaction,
            source_id: tx.JSONRepresentation.id,
          },
          // @ts-ignore
          utxo: {
            // TODO: check nft utxo structure
            type: output.type,
            destination: output.destination,
            token_id: output.token_id,
            data: output.data,
          },
        });
      }
      if (output.type === 'Htlc') {
        created.push({
          outpoint: {
            index,
            source_type: SourceId.Transaction,
            source_id: tx.JSONRepresentation.id,
          },
          // @ts-ignore
          utxo: {
            // @ts-ignore
            type: output.type,
            // @ts-ignore
            value: output.value,
            // @ts-ignore
            htlc: output.htlc,
          },
        });
      }
    });

    return { spent, created };
  }

  /**
   * Decorates a function with UTXO fetching logic.
   * ⚠️ Not thread-safe.
   * Do not use in parallel for the same client instance.
   * Intended to get utxo changes for transactions one by one.
   * @param func The function to decorate.
   * @return A promise that resolves to an object containing the result of the function **and** UTXO changes.
   */
  async decorateWithUtxoFetch<T>(func: () => Promise<T>): Promise<{ result: T; utxo: { created: any; spent: any } }> {
    this.ensureInitialized();

    const originalBuildTransaction = this.buildTransaction;

    let txresult: AssembledTransaction | undefined = undefined;
    this.buildTransaction = new Proxy(this.buildTransaction, {
      apply: async (target, thisArg, args) => {
        const result = (await Reflect.apply(target, thisArg, args)) as AssembledTransaction;
        txresult = result; // pull the result of the buildTransaction
        return result;
      },
    });

    // Call this function in parallel is not allowed due to Proxy usage BUT also due to the fact that we need to
    // ensure that utxo results are getting one by one, parallel not makes sense here.
    if ((this as any).__decoratorLock__) {
      throw new Error('decorateWithUtxoFetch already running — cannot run in parallel.');
    }

    (this as any).__decoratorLock__ = true;

    try {
      const t = await func();

      if (!txresult) {
        throw new Error('Failed to decorate with UtxoFetch');
      }

      const { created, spent } = this.previewUtxoChange(txresult);

      return { result: t, utxo: { created, spent } };
    } finally {
      (this as any).__decoratorLock__ = false;
      this.buildTransaction = originalBuildTransaction;
    }
  }

  /**
   * Gets the extended public key (xpub) from the connected wallet.
   * @returns Promise that resolves to the extended public key string
   * @warning Sharing xPub exposes all derived addresses. Use with caution.
   */
  async getXPub(): Promise<string> {
    this.ensureInitialized();
    console.warn('[Mintlayer SDK] Warning: Sharing xPub exposes all derived addresses. Use with caution.');
    return this.request({ method: 'getXPub' });
  }

  /**
   * Broadcasts a signed transaction to the network.
   * @param tx - The transaction to broadcast (hex string or object with hex and json)
   * @returns Promise that resolves to the broadcast response
   */
  async broadcastTx(tx: string | { hex: string; json: TransactionJSONRepresentation }): Promise<any> {
    this.ensureInitialized();
    return this.apiProvider.broadcastTransaction(tx);
  }

  /**
   * Registers an event listener for wallet events.
   * @param eventName - The name of the event to listen for
   * @param callback - The callback function to execute when the event occurs
   */
  on(eventName: string, callback: (data: any) => void): void {
    this.ensureInitialized();
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.data.type === 'MINTLAYER_EVENT' && event.data.event === eventName) {
        callback(event.data.data);
      }
    });
  }

  /**
   * Gets all available trading orders from the network.
   * @returns Promise that resolves to an array of order data
   */
  async getAvailableOrders(): Promise<OrderData[]> {
    this.ensureInitialized();
    return this.apiProvider.getOrders();
  }
}

class Signer {
  private keys: Record<string, Uint8Array>;
  private network: Network;

  constructor(privateKeys: Record<string, Uint8Array>, network: Network = Network.Testnet) {
    this.keys = privateKeys;
    this.network = network;
  }

  private getPrivateKey(address: string): Uint8Array | undefined {
    return this.keys[address];
  }

  private createSignature(tx: AssembledTransaction) {
    const network = this.network;
    const optUtxos_ = tx.JSONRepresentation.inputs.map((input: any) => {
      if (input.input.input_type !== 'UTXO') {
        return 0;
      }
      const { utxo }: UtxoInput = input as UtxoInput;
      if (input.input.input_type === 'UTXO') {
        if (utxo.type === 'Transfer') {
          if (utxo.value.type === 'TokenV1') {
            return encode_output_token_transfer(
              Amount.from_atoms(utxo.value.amount.atoms),
              utxo.destination,
              utxo.value.token_id,
              network,
            );
          } else {
            return encode_output_transfer(Amount.from_atoms(utxo.value.amount.atoms), utxo.destination, network);
          }
        }
        if (utxo.type === 'LockThenTransfer') {
          let lockEncoded: Uint8Array = new Uint8Array();
          const lockContent = utxo.lock.content;
          if (utxo.lock.type === 'UntilTime') {
            lockEncoded = encode_lock_until_time(
              BigInt(typeof lockContent === 'object' ? lockContent.timestamp : lockContent),
            ); // TODO: check if timestamp is correct
          }
          if (utxo.lock.type === 'ForBlockCount') {
            lockEncoded = encode_lock_for_block_count(BigInt(lockContent as string | number));
          }
          if (utxo.value.type === 'TokenV1') {
            return encode_output_token_lock_then_transfer(
              Amount.from_atoms(utxo.value.amount.atoms),
              utxo.destination,
              utxo.value.token_id,
              lockEncoded,
              network,
            );
          } else {
            return encode_output_lock_then_transfer(
              Amount.from_atoms(utxo.value.amount.atoms),
              utxo.destination,
              lockEncoded,
              network,
            );
          }
        }
        return null;
      }
    });

    const optUtxosArray: number[] = [];

    for (let i = 0; i < optUtxos_.length; i++) {
      const utxoBytes = optUtxos_[i];
      if (tx.JSONRepresentation.inputs[i].input.input_type !== 'UTXO') {
        optUtxosArray.push(0);
      } else {
        if (!(utxoBytes instanceof Uint8Array)) {
          throw new Error(`optUtxos_[${i}] is not a valid Uint8Array`);
        }
        optUtxosArray.push(1);
        optUtxosArray.push(...utxoBytes);
      }
    }

    const optUtxos = new Uint8Array(optUtxosArray);

    const encodedWitnesses = tx.JSONRepresentation.inputs.map((input: any, index: number) => {
      let address: string | undefined = undefined;

      if (input.input.input_type === 'UTXO') {
        const utxoInput = input as UtxoInput;
        address = utxoInput.utxo.destination;
      }

      if (input.input.input_type === 'AccountCommand') {
        // @ts-ignore
        address = input.input.authority;
      }

      if (input.input.input_type === 'AccountCommand' && input.input.command === 'FillOrder') {
        address = input.input.destination;
      }

      if (address === undefined) {
        throw new Error(`Address not found for input at index ${index}`);
      }

      const addressPrivateKey = this.getPrivateKey(address);

      if (!addressPrivateKey) {
        throw new Error(`Private key not found for address: ${address}`);
      }

      const transaction = hexToUint8Array(tx.HEXRepresentation_unsigned);

      const block_height = FEE_BLOCK_HEIGHT;
      const additional_info = {
        pool_info: {},
        order_info: {},
      };

      const witness = encode_witness(
        SignatureHashType.ALL,
        addressPrivateKey,
        address,
        transaction,
        optUtxos,
        index,
        additional_info,
        block_height,
        network,
      );
      return witness;
    });

    const signature = mergeUint8Arrays(encodedWitnesses);
    return signature;
  }

  private encodeSignedTransaction(tx: AssembledTransaction, signature: Uint8Array): string {
    const transaction_signed = encode_signed_transaction(hexToUint8Array(tx.HEXRepresentation_unsigned), signature);
    const transaction_signed_hex = transaction_signed.reduce(
      (acc, byte) => acc + byte.toString(16).padStart(2, '0'),
      '',
    );
    return transaction_signed_hex;
  }

  sign(tx: AssembledTransaction): string {
    const signature = this.createSignature(tx);
    return this.encodeSignedTransaction(tx, signature);
  }
}

export { Transaction } from './transaction';
export * from './wallet-state';

export { Client, Signer, PrivateKeyAccountProvider, MnemonicAccountProvider, MnemonicAccountProviderOptions };
