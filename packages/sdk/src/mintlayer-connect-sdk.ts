import initWasm, {
  get_transaction_id,
  nft_issuance_fee,
  token_supply_change_fee,
  get_token_id,
  fungible_token_issuance_fee,
  Network,
  token_freeze_fee,
  token_change_authority_fee,
  encode_outpoint_source_id,
  SourceId,
  encode_input_for_utxo,
  encode_input_for_conclude_order,
  encode_input_for_fill_order,
  encode_input_for_mint_tokens,
  encode_input_for_unmint_tokens,
  encode_input_for_lock_token_supply,
  encode_input_for_change_token_authority,
  encode_input_for_freeze_token,
  encode_input_for_unfreeze_token,
  encode_input_for_withdraw_from_delegation,
  encode_output_transfer,
  encode_output_token_transfer,
  estimate_transaction_size,
  Amount,
  encode_lock_until_time,
  encode_lock_for_block_count,
  encode_output_token_lock_then_transfer,
  encode_output_lock_then_transfer,
  encode_output_issue_nft,
  data_deposit_fee,
  encode_input_for_change_token_metadata_uri,
  TokenUnfreezable,
  encode_create_order_output,
  encode_output_token_burn,
  encode_transaction,
  encode_output_coin_burn,
  FreezableToken,
  TotalSupply,
  encode_output_issue_fungible_token,
  encode_output_data_deposit,
  encode_output_create_delegation,
  encode_output_delegate_staking,
  encode_signed_transaction,
  encode_witness,
  SignatureHashType,
  encode_output_htlc,
  extract_htlc_secret,
} from '@mintlayer/wasm-lib';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function mergeUint8Arrays(arrays: Uint8Array[]) {
  const totalLength = arrays.reduce((sum: number, arr: Uint8Array) => sum + arr.length, 0);

  const result = new Uint8Array(totalLength);

  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }

  return result;
}

function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function hexToUint8Array(hex: any) {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }

  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < array.length; i++) {
    array[i] = parseInt(hex.substr(i * 2, 2), 16);
  }

  return array;
}

function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function atomsToDecimal(atoms: string | number, decimals: number): string {
  const atomsStr = atoms.toString();
  const atomsLength = atomsStr.length;

  if (decimals === 0) {
    return atomsStr;
  }

  if (atomsLength <= decimals) {
    // Pad with leading zeros
    const padded = atomsStr.padStart(decimals, '0');
    return '0.' + padded.replace(/0+$/, '') || '0';
  }

  // Insert decimal point
  const integerPart = atomsStr.slice(0, atomsLength - decimals);
  const fractionalPart = atomsStr.slice(atomsLength - decimals).replace(/0+$/, '');

  return fractionalPart === '' ? integerPart : `${integerPart}.${fractionalPart}`;
}

export function decimalsToAtoms(value: string | number, decimals: number): bigint {
  const [intPart, fracPart = ""] = value.toString().split(".");
  const paddedFrac = (fracPart + "0".repeat(decimals)).slice(0, decimals);
  const full = intPart + paddedFrac;
  return BigInt(full);
}

type Address = {
  [key: string]: {
    receiving: string[];
    change: string[];
  };
}; // TODO expand

type MojitoRequest = any; // TODO expand

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

type CreateHtlcArgs = {
  amount: number;
  token_id?: string;
  secret_hash: string;
  spend_address: string;
  spend_pubkey: string;
  refund_address: string;
  refund_timelock: Timelock;
};

type AmountFields = {
  atoms: string;
  decimal: string;
};

type Coin = {
  type: 'Coin';
  amount: AmountFields;
};

type Token = {
  type: 'TokenV1';
  token_id: string;
  amount: AmountFields;
};

type Value = Coin | Token;

type SignedTransaction = string;

interface Outpoint {
  id: string;
  index: number;
}

interface UtxoOutpoint {
  index: number;
  source_type: SourceId;
  source_id: string;
}

interface UtxoEntry {
  outpoint: UtxoOutpoint;
  utxo: Utxo;
}

type BaseUtxo = {
  value: Value;
  destination: string;
  token_id?: string;
};

type TransferUtxo = BaseUtxo & {
  type: 'Transfer';
};

type HtlcUtxo = BaseUtxo & {
  type: 'Htlc';
  htlc: any;
};

type LockThenTransferUtxo = BaseUtxo & {
  type: 'LockThenTransfer';
  lock: {
    type: 'ForBlockCount' | 'UntilTime';
    content: string;
  };
};

type IssueNftUtxo = {
  type: 'IssueNft';
  value: Value;
  destination: string;
  token_id?: string;
  data: {
    name: { hex: string; string: string };
    ticker: { hex: string; string: string };
    description: { hex: string; string: string };
    media_hash: { hex: string; string: string };
    media_uri: { hex: string; string: string };
    icon_uri: { hex: string; string: string };
    additional_metadata_uri: { hex: string; string: string };
    creator: string | null;
  };
};

type Utxo = TransferUtxo | LockThenTransferUtxo | IssueNftUtxo | HtlcUtxo;

type UtxoInput = {
  input: {
    index: number;
    input_type: 'UTXO';
    source_id: string;
    source_type: SourceId;
  };
  utxo: Utxo;
};

type AccountCommandBase = {
  input_type: 'AccountCommand';
  nonce: number;
  authority: string;
  token_id: string;
};

type MintTokensInput = {
  input: AccountCommandBase & {
    command: 'MintTokens';
    amount: AmountFields;
  };
  utxo: null;
};

type UnmintTokensInput = {
  input: AccountCommandBase & {
    command: 'UnmintTokens';
    amount: AmountFields;
  };
  utxo: null;
};

type LockTokenSupplyInput = {
  input: AccountCommandBase & {
    command: 'LockTokenSupply';
  };
  utxo: null;
};

type ChangeTokenAuthorityInput = {
  input: AccountCommandBase & {
    command: 'ChangeTokenAuthority';
    new_authority: string;
  };
  utxo: null;
};

type ChangeMetadataUriInput = {
  input: AccountCommandBase & {
    command: 'ChangeMetadataUri';
    new_metadata_uri: string;
  };
  utxo: null;
};

type FreezeTokenInput = {
  input: AccountCommandBase & {
    command: 'FreezeToken';
    is_unfreezable: boolean;
  };
  utxo: null;
};

type UnfreezeTokenInput = {
  input: AccountCommandBase & {
    command: 'UnfreezeToken';
  };
  utxo: null;
};

type FillOrderInput = {
  input: {
    input_type: 'AccountCommand';
    command: 'FillOrder';
    order_id: string;
    fill_atoms: string;
    destination: string;
    nonce: string;
  };
  utxo: null;
};

type ConcludeOrderInput = {
  input: {
    input_type: 'AccountCommand';
    command: 'ConcludeOrder';
    order_id: string;
    destination: string;
    nonce: number;
  };
  utxo: null;
};

type Input =
  | UtxoInput
  | MintTokensInput
  | UnmintTokensInput
  | LockTokenSupplyInput
  | ChangeTokenAuthorityInput
  | ChangeMetadataUriInput
  | FreezeTokenInput
  | UnfreezeTokenInput
  | FillOrderInput
  | ConcludeOrderInput
  | DelegationWithdrawInput;

type TransferOutput = {
  type: 'Transfer';
  destination: string;
  value: Value;
};

type LockThenTransferOutput = {
  type: 'LockThenTransfer';
  destination: string;
  value: Value;
  lock: {
    type: 'ForBlockCount' | 'UntilTime';
    content: string;
  };
};

type CreateDelegationIdOutput = {
  type: 'CreateDelegationId';
  destination: string;
  pool_id: string;
};

type DelegateStakingOutput = {
  type: 'DelegateStaking';
  delegation_id: string;
  amount: AmountFields;
};

type DelegationWithdrawInput = {
  input: {
    input_type: 'Account';
    account_type: 'DelegationBalance';
    amount: AmountFields;
    delegation_id: string;
    nonce: number;
  };
};

type BurnTokenOutput = {
  type: 'BurnToken';
  value: Value;
};

type DataDepositOutput = {
  type: 'DataDeposit';
  data: string;
};

type TotalSupplyValue =
  | {
      type: 'Unlimited' | 'Lockable';
    }
  | {
      type: 'Fixed';
      amount: AmountFields;
    };

type IssueFungibleTokenOutput = {
  type: 'IssueFungibleToken';
  authority: string;
  is_freezable: boolean;
  metadata_uri: { hex: string; string: string };
  number_of_decimals: number;
  token_ticker: { hex: string; string: string };
  total_supply: TotalSupplyValue;
};

type Timelock =
  | {
  type: 'UntilTime';
  content: {
    timestamp: string;
  };
}
  | {
  type: 'ForBlockCount';
  content: number;
};

type HtlcOutput = {
  type: 'Htlc';
  value: {
    token_id?: string;
    type: 'Coin' | 'TokenV1';
    amount: AmountFields;
  }
  token_id?: string;
  htlc: {
    refund_key: string;
    secret_hash: {
      hex: string;
      string: string | null;
    },
    spend_key: string;
    refund_timelock: Timelock;
  }
}

type IssueNftOutput = {
  type: 'IssueNft';
  destination: string;
  token_id?: string;
  data: {
    name: { hex: string; string: string };
    ticker: { hex: string; string: string };
    description: { hex: string; string: string };
    media_hash: { hex: string; string: string };
    media_uri: { hex: string; string: string };
    icon_uri: { hex: string; string: string };
    additional_metadata_uri: { hex: string; string: string };
    creator: string | null;
  };
};

type CreateOrderOutput = {
  type: 'CreateOrder';
  ask_balance: { atoms: string | number; decimal: string };
  ask_currency: { type: 'Coin' } | { type: 'TokenV1'; token_id: string };
  give_balance: { atoms: string | number; decimal: string };
  give_currency: { type: 'Coin' } | { type: 'TokenV1'; token_id: string };
  initially_asked: { atoms: string; decimal: string };
  initially_given: { atoms: string; decimal: string };
  conclude_destination: string;
};

type Output =
  | TransferOutput
  | LockThenTransferOutput
  | BurnTokenOutput
  | DataDepositOutput
  | IssueFungibleTokenOutput
  | IssueNftOutput
  | CreateOrderOutput
  | CreateDelegationIdOutput
  | DelegateStakingOutput
  | HtlcOutput;

export interface TransactionJSONRepresentation {
  inputs: Input[];
  outputs: Output[];
  fee?: AmountFields;
  id: string;
}

interface Transaction {
  JSONRepresentation: TransactionJSONRepresentation;
  BINRepresentation: Record<string, any>;
  HEXRepresentation_unsigned: string;
  intent?: string;
  htlc?: { spend_pubkey: string };
  transaction_id: string;
}

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

type BuildTransactionParams =
  | {
      type: 'Transfer';
      params: TransferParams;
      opts?: any; // TODO: define options type
    }
  | {
      type: 'BurnToken';
      params: {
        amount: number;
        token_id: string;
        token_details?: TokenDetails;
      };
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
    }
  | {
      type: 'MintToken';
      params: {
        amount: number;
        destination: string;
        token_id: string;
        token_details: TokenDetails;
      };
    }
  | {
      type: 'UnmintToken';
      params: {
        amount: number;
        token_id: string;
        token_details: TokenDetails;
      };
    }
  | {
      type: 'FreezeToken';
      params: {
        token_id: string;
        token_details: TokenDetails;
        is_unfreezable: boolean;
      };
    }
  | {
      type: 'LockTokenSupply';
      params: {
        token_id: string;
        token_details: TokenDetails;
        is_unfreezable?: boolean;
      };
    }
  | {
      type: 'UnfreezeToken';
      params: {
        token_id: string;
        token_details: TokenDetails;
      };
    }
  | {
      type: 'ChangeMetadataUri';
      params: {
        token_id: string;
        token_details: TokenDetails;
        new_metadata_uri: string;
      };
    }
  | {
      type: 'ChangeTokenAuthority';
      params: {
        token_id: string;
        token_details: TokenDetails;
        new_authority: string;
      };
    }
  | {
      type: 'DataDeposit';
      params: {
        data: string;
      };
    }
  | {
      type: 'CreateDelegationId';
      params: {
        destination: string;
        pool_id: string;
      };
    }
  | {
      type: 'DelegateStaking';
      params: {
        delegation_id: string;
        amount: number;
      };
    }
  | {
      type: 'DelegationWithdraw';
      params: {
        delegation_id: string;
        amount: number;
        delegation_details: DelegationDetails;
      };
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
    }
  | {
      type: 'ConcludeOrder';
      params: {
        order: OrderData;
      };
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
    }
  | {
      type: 'Htlc';
      params: {
        amount: number;
        token_id: string;
        secret_hash: string;
        spend_address: string;
        refund_address: string;
        refund_timelock: Timelock;
      };
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
}

/**
 * Arguments for the `transfer()` method.
 *
 * If `token_id` is provided, the corresponding token will be sent.
 */
export type TransferArgs =
  | { to: string; amount: number; token_id: string }
  | { to: string; amount: number; token_id?: undefined };

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

class Client {
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
   * Returns the API server URL based on the network.
   * @private
   */
  private getApiServer(): string {
    return this.network === 'testnet'
      ? 'https://api-server-lovelace.mintlayer.org/api/v2'
      : 'https://api-server.mintlayer.org/api/v2';
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

      const response = await fetch(this.getApiServer() + '/chain/tip');
      if (!response.ok) {
        throw new Error('Failed to connect to API server');
      }
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
   * Select required UTXOs for the transaction based on provided amount and token ID.
   * @param utxos
   * @param amount
   * @param token_id
   * @private
   */
  private selectUTXOs(utxos: UtxoEntry[], amount: bigint, token_id: string | null): UtxoInput[] {
    const transferableUtxoTypes = ['Transfer', 'LockThenTransfer', 'IssueNft', 'Htlc'];
    const filteredUtxos: any[] = utxos // type fix for NFT considering that NFT don't have amount
      .map((utxo) => {
        if (utxo.utxo.type === 'IssueNft') {
          return {
            ...utxo,
            utxo: {
              ...utxo.utxo,
              value: {
                amount: {
                  atoms: 1,
                  decimal: 1,
                },
                type: 'TokenV1',
                token_id: utxo.utxo.token_id,
              },
            },
          };
        } else {
          return utxo;
        }
      })
      .filter((utxo) => transferableUtxoTypes.includes(utxo.utxo.type))
      .filter((utxo) => {
        if (utxo.utxo.type === 'IssueNft') {
          return utxo.utxo.token_id === token_id;
        } else {
          if (token_id === null) {
            return utxo.utxo.value.type === 'Coin';
          }
          if (utxo.utxo.value.type === 'TokenV1') {
            return utxo.utxo.value.token_id === token_id;
          }
        }
      });

    let balance = BigInt(0);
    const utxosToSpend: UtxoEntry[] = [];
    let lastIndex = 0;

    filteredUtxos.sort((a, b) => {
      return Number(BigInt(b.utxo.value.amount.atoms) - BigInt(a.utxo.value.amount.atoms));
    });

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

    if (balance === amount) {
      if (filteredUtxos[lastIndex + 1]) {
        utxosToSpend.push(filteredUtxos[lastIndex + 1]);
      }
    }

    const transformedInput: UtxoInput[] = utxosToSpend.map((item: UtxoEntry) => ({
      input: {
        ...item.outpoint,
        input_type: 'UTXO',
      },
      utxo: item.utxo,
    }));

    return transformedInput;
  }

  /**
   * Converts a string to a hex string.
   * @param str
   * @private
   */
  private stringToHex(str: string): string {
    if (!str) {
      return '';
    }

    let hex = '';
    for (let i = 0; i < str.length; i++) {
      hex += str.charCodeAt(i).toString(16);
    }
    return hex;
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

      if (addressData?.[this.network]?.receiving?.length) {
        // @ts-ignore
        this.connectedAddresses = addressData[this.network].receiving;
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
        const response = await fetch(`${this.getApiServer()}/address/${addr}`);
        if (!response.ok) {
          if (response.status === 404) {
            console.warn(`Address ${addr} not found`);
            return 0;
          }
          throw new Error('Failed to fetch balance');
        }
        const data = await response.json();
        return data.coin_balance.decimal;
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
        const response = await fetch(`${this.getApiServer()}/address/${addr}`);
        if (!response.ok) {
          if (response.status === 404) {
            console.warn(`Address ${addr} not found`);
            return null;
          }
          throw new Error('Failed to fetch balance');
        }
        const data = await response.json();
        return data;
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
        const response = await fetch(`${this.getApiServer()}/address/${addr}/delegations`);
        if (!response.ok) {
          if (response.status === 404) {
            console.warn(`Address ${addr} not found`);
            return {};
          }
          throw new Error('Failed to fetch delegations');
        }
        const data = await response.json();
        return data;
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
        const response = await fetch(`${this.getApiServer()}/address/${addr}/token-authority`);
        if (!response.ok) {
          if (response.status === 404) {
            console.warn(`Address ${addr} not found`);
            return {};
          }
          throw new Error('Failed to fetch delegations');
        }
        const data = await response.json();
        return data;
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
   * Returns the fee for a specific transaction type.
   * @param {string} type
   * @returns {bigint} Fee in atoms.
   */
  getFeeForType(type: string): bigint {
    this.ensureInitialized();
    const block_height = 200000n; // TODO: Get the current block height
    let fee = Amount.from_atoms('0');
    switch (type) {
      case 'Transfer':
        return 0n;
      case 'BurnToken':
        return 0n;
      case 'IssueNft':
        fee = nft_issuance_fee(block_height, this.network === 'mainnet' ? Network.Mainnet : Network.Testnet);
        return BigInt(fee.atoms());
      case 'IssueFungibleToken':
        fee = fungible_token_issuance_fee(block_height, this.network === 'mainnet' ? Network.Mainnet : Network.Testnet);
        return BigInt(fee.atoms());
      case 'MintToken':
        fee = token_supply_change_fee(block_height, this.network === 'mainnet' ? Network.Mainnet : Network.Testnet);
        return BigInt(fee.atoms());
      case 'UnmintToken':
        fee = token_supply_change_fee(block_height, this.network === 'mainnet' ? Network.Mainnet : Network.Testnet);
        return BigInt(fee.atoms());
      case 'LockTokenSupply':
        fee = token_supply_change_fee(block_height, this.network === 'mainnet' ? Network.Mainnet : Network.Testnet);
        return BigInt(fee.atoms());
      case 'ChangeTokenAuthority':
        fee = token_change_authority_fee(block_height, this.network === 'mainnet' ? Network.Mainnet : Network.Testnet);
        return BigInt(fee.atoms());
      case 'ChangeMetadataUri':
        return decimalsToAtoms(50, 11);
      case 'FreezeToken':
        fee = token_freeze_fee(block_height, this.network === 'mainnet' ? Network.Mainnet : Network.Testnet);
        return BigInt(fee.atoms());
      case 'UnfreezeToken':
        return decimalsToAtoms(50,  11);
      case 'DataDeposit':
        fee = data_deposit_fee(block_height, this.network === 'mainnet' ? Network.Mainnet : Network.Testnet);
        return BigInt(fee.atoms());
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
        return BigInt(1 * Math.pow(10, 11)); // TODO: 0n
      default:
        throw new Error(`Unknown transaction type: ${type}`);
    }
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
        input_amount_token_req += decimalsToAtoms(params.amount!,token_details.number_of_decimals);
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
                  decimal: params.amount!.toString(),
                  atoms: decimalsToAtoms(params.amount!, token_details.number_of_decimals).toString(),
                },
              }
            : {
                amount: {
                  decimal: params.amount!.toString(),
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
        input_amount_coin_req += decimalsToAtoms(params.amount!,11);
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
            decimal: params.amount!.toString(),
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
            decimal: params.supply_amount!.toString(),
          },
        };
      } else {
        throw new Error('Invalid supply_type');
      }

      outputs.push({
        authority: params.authority,
        is_freezable: params.is_freezable,
        metadata_uri: {
          hex: this.stringToHex(params.metadata_uri!),
          string: params.metadata_uri,
        },
        number_of_decimals: params.number_of_decimals,
        token_ticker: {
          hex: this.stringToHex(params.token_ticker!),
          string: params.token_ticker,
        },
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
          additional_metadata_uri: {
            hex: this.stringToHex(params.additional_metadata_uri!),
            string: params.additional_metadata_uri,
          },
          description: {
            hex: this.stringToHex(params.description!),
            string: params.description,
          },
          icon_uri: {
            hex: this.stringToHex(params.icon_uri!),
            string: params.icon_uri,
          },
          media_hash: {
            hex: this.stringToHex(params.media_hash!),
            string: params.media_hash,
          },
          media_uri: {
            hex: this.stringToHex(params.media_uri!),
            string: params.media_uri,
          },
          name: {
            hex: this.stringToHex(params.name!),
            string: params.name,
          },
          ticker: {
            hex: this.stringToHex(params.ticker!),
            string: params.ticker,
          },
        },
      });
    }

    if (type === 'MintToken') {
      const amount = {
        atoms: decimalsToAtoms(params.amount!, params.token_details!.number_of_decimals).toString(),
        decimal: params.amount!.toString(),
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
          nonce: delegation_details.next_nonce,
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
            : decimalsToAtoms(ask_amount!,  11).toString(),
          decimal: ask_amount!.toString(),
        },
        give_currency: give_token === 'Coin' ? { type: 'Coin' } : { token_id: give_token, type: 'TokenV1' },
        give_balance: {
          atoms: give_token_details
            ? decimalsToAtoms(give_amount!, give_token_details.number_of_decimals).toString()
            : decimalsToAtoms(give_amount!,  11).toString(),
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
            // @ts-ignore
            hex: params.secret_hash.hex,
            string: null,
          },
          spend_key: params.spend_address,
        },
        value:
          {
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
   * Builds a transaction based on the provided parameters.
   * @param{BuildTransactionParams} arg
   */
  async buildTransaction(arg: BuildTransactionParams): Promise<Transaction> {
    const { type, params } = arg;

    this.ensureInitialized();
    if (!params) throw new Error('Missing params');

    console.log('[Mintlayer Connect SDK] Building transaction:', type, params);

    const address = this.connectedAddresses;
    const currentAddress = address;
    const addressList = [...currentAddress.receiving, ...currentAddress.change];

    const response = await fetch('https://api.mintini.app' + '/account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ addresses: addressList, network: this.network === 'mainnet' ? 0 : 1 }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch utxos');
    }

    const data = await response.json();

    // @ts-ignore
    const forceSpendUtxo: UtxoEntry[] = arg?.opts?.forceSpendUtxo ? arg?.opts?.forceSpendUtxo.map((item: UtxoEntry) => ({
      input: {
        ...item.outpoint,
        input_type: 'UTXO',
      },
      utxo: item.utxo,
    })) : [];

    const utxos: UtxoEntry[] = data.utxos.filter((item: UtxoEntry) => {
      // filter out UTXO with type htlc, they have to be added manually
      if (item.utxo.type === 'Htlc') {
        return false;
      }

      return true;
    });

    const { inputs, outputs, input_amount_coin_req, input_amount_token_req, send_token } =
      this.getRequiredInputsOutputs({ type, params } as BuildTransactionParams);

    let preciseFee = BigInt(0);
    let previousFee = BigInt(-1);
    const MAX_ATTEMPTS = 10;
    let attempts = 0;

    while (attempts < MAX_ATTEMPTS) {
      attempts++;

      const totalFee = this.getFeeForType(type) + preciseFee;
      const input_amount_coin_req_w_fee = input_amount_coin_req + totalFee;

      const inputObjCoin =
        type !== 'DelegationWithdraw' ? this.selectUTXOs(utxos, input_amount_coin_req_w_fee, null) : [];
      const inputObjToken = send_token?.token_id
        ? this.selectUTXOs(utxos, input_amount_token_req, send_token.token_id)
        : [];

      if(forceSpendUtxo) {
        const forceCoinUtxos = forceSpendUtxo.filter(utxo => utxo.utxo.value.type === 'Coin');
        const forceTokenUtxos = forceSpendUtxo.filter(utxo => utxo.utxo.value.type === 'TokenV1' && utxo.utxo.value.token_id === send_token?.token_id);

        if (forceCoinUtxos.length > 0) {
          // @ts-ignore
          inputObjCoin.unshift(...forceCoinUtxos);
        }
        if (forceTokenUtxos.length > 0) {
          // @ts-ignore
          inputObjToken.unshift(...forceTokenUtxos);
        }
      }


      const totalInputValueCoin = inputObjCoin.reduce((acc, item) => acc + BigInt(item.utxo!.value.amount.atoms), 0n);
      const totalInputValueToken = inputObjToken.reduce((acc, item) => acc + BigInt(item.utxo!.value.amount.atoms), 0n);

      if (type !== 'DelegationWithdraw' && totalInputValueCoin < input_amount_coin_req_w_fee) {
        throw new Error('Not enough coin UTXOs');
      }
      if (totalInputValueToken < input_amount_token_req) {
        throw new Error('Not enough token UTXOs');
      }

      const changeAmountCoin = totalInputValueCoin - input_amount_coin_req_w_fee;
      const changeAmountToken = totalInputValueToken - input_amount_token_req;

      const finalOutputs = [...outputs];

      if (type === 'DelegationWithdraw') {
        const out = finalOutputs[0] as LockThenTransferOutput;
        out.value.amount = {
          atoms: (BigInt(out.value.amount.atoms) - totalFee).toString(),
          decimal: (Number(BigInt(out.value.amount.atoms) - totalFee) / 1e11).toString(),
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
          destination: currentAddress.change[0],
        });
      }

      if (changeAmountToken > 0n && send_token) {
        const decimals = send_token.number_of_decimals;
        finalOutputs.push({
          type: 'Transfer',
          value: {
            type: 'TokenV1',
            token_id: send_token.token_id,
            amount: {
              atoms: changeAmountToken.toString(),
              decimal: atomsToDecimal(changeAmountToken.toString(), decimals).toString(),
            },
          },
          destination: currentAddress.change[0],
        });
      }

      const finalInputs = [...inputs, ...inputObjCoin, ...inputObjToken];

      const JSONRepresentation: TransactionJSONRepresentation = {
        inputs: finalInputs,
        outputs: finalOutputs,
        fee: {
          atoms: totalFee.toString(),
          decimal: atomsToDecimal(totalFee.toString(), 11).toString(),
        },
        id: 'to_be_filled_in'
      };

      const BINRepresentation = this.getTransactionBINrepresentation(JSONRepresentation, 1);

      const transaction_size_in_bytes = BigInt(Math.ceil(BINRepresentation.transactionsize));
      const fee_amount_per_kb = BigInt('100000000000'); // TODO: Get the current feerate from the network

      const nextPreciseFee = (fee_amount_per_kb * transaction_size_in_bytes + BigInt(999)) / BigInt(1000);

      if (nextPreciseFee === preciseFee || nextPreciseFee === previousFee) {
        const transaction = encode_transaction(
          mergeUint8Arrays(BINRepresentation.inputs),
          mergeUint8Arrays(BINRepresentation.outputs),
          BigInt(0),
        );

        const transaction_id = get_transaction_id(transaction, true);

        if (finalOutputs.some((output) => output.type === 'IssueNft')) {
          const token_id = get_token_id(
            mergeUint8Arrays(BINRepresentation.inputs),
            this.network === 'mainnet' ? Network.Mainnet : Network.Testnet,
          );
          const index = finalOutputs.findIndex((output) => output.type === 'IssueNft');
          const output = finalOutputs[index] as IssueNftOutput;
          finalOutputs[index] = {
            ...output,
            token_id,
          };
        }

        const HEXRepresentation_unsigned = transaction.reduce(
          (acc, byte) => acc + byte.toString(16).padStart(2, '0'),
          '',
        );

        return {
          JSONRepresentation: {
            ...JSONRepresentation,
            id: transaction_id,
          },
          BINRepresentation,
          HEXRepresentation_unsigned,
          transaction_id,
        };
      }
      previousFee = preciseFee;
      preciseFee = nextPreciseFee;
    }

    throw new Error('Failed to build transaction after maximum attempts');
  }

  /**
   * Returns the transaction binary representation.
   * @param transactionJSONrepresentation
   * @param _network
   */
  getTransactionBINrepresentation(
    transactionJSONrepresentation: TransactionJSONRepresentation,
    _network: Network,
  ): {
    inputs: Uint8Array[];
    outputs: Uint8Array[];
    transactionsize: number;
  } {
    const network = _network;
    // Binarisation
    // calculate fee and prepare as much transaction as possible
    const inputs = transactionJSONrepresentation.inputs;
    const outpointedSourceIds = (inputs as UtxoInput[])
      .filter(({ input }) => input.input_type === 'UTXO')
      .map(({ input }) => {
        const bytes = Uint8Array.from(input.source_id.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
        return {
          source_id: encode_outpoint_source_id(bytes, SourceId.Transaction),
          index: input.index,
        };
      });
    const inputsIds = outpointedSourceIds.map((source) => encode_input_for_utxo(source.source_id, source.index));

    const inputCommands = (transactionJSONrepresentation.inputs as any[])
      .filter(({ input }) => input.input_type === 'AccountCommand' || input.input_type === 'Account')
      .map(({ input }) => {
        if (input.command === 'ConcludeOrder') {
          return encode_input_for_conclude_order(input.order_id, BigInt(input.nonce.toString()), network);
        }
        if (input.command === 'FillOrder') {
          return encode_input_for_fill_order(
            input.order_id,
            Amount.from_atoms(input.fill_atoms.toString()),
            input.destination,
            BigInt(input.nonce.toString()),
            network,
          );
        }
        if (input.command === 'MintTokens') {
          return encode_input_for_mint_tokens(
            input.token_id,
            Amount.from_atoms(input.amount.atoms.toString()),
            input.nonce.toString(),
            network,
          );
        }
        if (input.command === 'UnmintTokens') {
          return encode_input_for_unmint_tokens(input.token_id, input.nonce.toString(), network);
        }
        if (input.command === 'LockTokenSupply') {
          return encode_input_for_lock_token_supply(input.token_id, input.nonce.toString(), network);
        }
        if (input.command === 'ChangeTokenAuthority') {
          return encode_input_for_change_token_authority(
            input.token_id,
            input.new_authority,
            input.nonce.toString(),
            network,
          );
        }
        if (input.command === 'ChangeMetadataUri') {
          return encode_input_for_change_token_metadata_uri(
            input.token_id,
            input.new_metadata_uri,
            input.nonce.toString(),
            network,
          );
        }
        if (input.command === 'FreezeToken') {
          return encode_input_for_freeze_token(
            input.token_id,
            input.is_unfreezable ? TokenUnfreezable.Yes : TokenUnfreezable.No,
            input.nonce.toString(),
            network,
          );
        }
        if (input.command === 'UnfreezeToken') {
          return encode_input_for_unfreeze_token(input.token_id, input.nonce.toString(), network);
        }
        if (input.account_type === 'DelegationBalance') {
          return encode_input_for_withdraw_from_delegation(
            input.delegation_id,
            Amount.from_atoms(input.amount.atoms.toString()),
            BigInt(input.nonce.toString()),
            network,
          );
        }
      });

    const inputsArray = [...inputCommands, ...inputsIds].filter((x): x is NonNullable<typeof x> => x !== undefined);

    const outputsArrayItems = transactionJSONrepresentation.outputs.map((output) => {
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

        const chainTip = '200000'; // TODO unhardcode

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

        const chainTip = '200000'; // TODO: unhardcode height

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
    const outputsArray = outputsArrayItems.filter((x): x is NonNullable<typeof x> => x !== undefined);

    const inputAddresses: string[] = (transactionJSONrepresentation.inputs as UtxoInput[])
      // @ts-ignore
      .filter(({ input, utxo }) => input.input_type === 'UTXO' || utxo?.htlc)
      .map((input) => {
        if (input.utxo.destination){
          return input.utxo.destination;
        }
        // @ts-ignore
        if (input?.utxo?.htlc) {
          // @ts-ignore
          return [input.utxo.htlc.spend_key, input.utxo.htlc.refund_key]; // TODO: need to handle spend too
        }
      }).flat();

    // @ts-ignore
    if (transactionJSONrepresentation.inputs[0].input.account_type === 'DelegationBalance') {
      // @ts-ignore
      inputAddresses.push(transactionJSONrepresentation.outputs[0].destination);
    }
    // @ts-ignore
    if (transactionJSONrepresentation.inputs[0].input.input_type === 'AccountCommand') {
      // @ts-ignore
      if (transactionJSONrepresentation.inputs[0].input.destination) {
        // @ts-ignore
        inputAddresses.push(transactionJSONrepresentation.inputs[0].input.destination);
      }
      // @ts-ignore
      if (transactionJSONrepresentation.inputs[0].input.authority) {
        // @ts-ignore
        inputAddresses.push(transactionJSONrepresentation.inputs[0].input.authority);
      }
    }
    // @ts-ignore
    if (transactionJSONrepresentation.inputs[0].input.input_type === 'Account') {
      // @ts-ignore
      if (transactionJSONrepresentation.inputs[0].input.destination) {
        // @ts-ignore
        inputAddresses.push(transactionJSONrepresentation.inputs[0].input.destination);
      }
      // @ts-ignore
      if (transactionJSONrepresentation.inputs[0].input.authority) {
        // @ts-ignore
        inputAddresses.push(transactionJSONrepresentation.inputs[0].input.authority);
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

  /**
   * Builds a transfer transaction without signing it.
   * If a token_id is provided, token will be transferred instead of base coin.
   *
   * @param to - The recipient address
   * @param amount - The amount to transfer
   * @param token_id - Optional token ID (if transferring tokens instead of base coin)
   * @returns A transaction ready to be signed
   */
  async buildTransfer({ to, amount, token_id }: TransferArgs): Promise<Transaction> {
    this.ensureInitialized();
    if (token_id) {
      const request = await fetch(`${this.getApiServer()}/token/${token_id}`);
      if (!request.ok) {
        throw new Error('Failed to fetch token');
      }
      const token = await request.json();
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
  async buildTransferNft({ to, token_id }: TransferNftArgs): Promise<Transaction> {
    this.ensureInitialized();

    if (!token_id) {
      throw new Error('Token ID is required for NFT transfer');
    }

    const amount = 1;
    const request = await fetch(`${this.getApiServer()}/nft/${token_id}`);
    if (!request.ok) {
      throw new Error('Failed to fetch token');
    }
    const token = await request.json();
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
  async buildDelegate({ pool_id, destination }: { pool_id: string; destination: string }): Promise<Transaction> {
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
  async buildIssueNft(tokenData: IssueNftArgs): Promise<Transaction> {
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
  }: IssueTokenArgs): Promise<Transaction> {
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
  async buildMintToken({ destination, amount, token_id }: MintTokenArgs): Promise<Transaction> {
    this.ensureInitialized();
    const request = await fetch(`${this.getApiServer()}/token/${token_id}`);
    if (!request.ok) {
      throw new Error('Failed to fetch token');
    }
    const token = await request.json();
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
  async buildUnmintToken({ amount, token_id }: UnmintTokenArgs): Promise<Transaction> {
    this.ensureInitialized();
    const request = await fetch(`${this.getApiServer()}/token/${token_id}`);
    if (!request.ok) {
      throw new Error('Failed to fetch token');
    }
    const token = await request.json();
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
  async buildLockTokenSupply({ token_id }: LockTokenSupplyArgs): Promise<Transaction> {
    this.ensureInitialized();
    const request = await fetch(`${this.getApiServer()}/token/${token_id}`);
    if (!request.ok) {
      throw new Error('Failed to fetch token');
    }
    const token = await request.json();
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
  async buildChangeTokenAuthority({ token_id, new_authority }: ChangeTokenAuthorityArgs): Promise<Transaction> {
    this.ensureInitialized();
    const request = await fetch(`${this.getApiServer()}/token/${token_id}`);
    if (!request.ok) {
      throw new Error('Failed to fetch token');
    }
    const token = await request.json();
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
  async buildChangeMetadataUri({ token_id, new_metadata_uri }: ChangeMetadataUriArgs): Promise<Transaction> {
    this.ensureInitialized();
    const request = await fetch(`${this.getApiServer()}/token/${token_id}`);
    if (!request.ok) {
      throw new Error('Failed to fetch token');
    }
    const token = await request.json();
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
  async buildFreezeToken({ token_id, is_unfreezable }: FreezeTokenArgs): Promise<Transaction> {
    this.ensureInitialized();
    const request = await fetch(`${this.getApiServer()}/token/${token_id}`);
    if (!request.ok) {
      throw new Error('Failed to fetch token');
    }
    const token = await request.json();
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
  async buildUnfreezeToken({ token_id }: UnfreezeTokenArgs): Promise<Transaction> {
    this.ensureInitialized();
    const request = await fetch(`${this.getApiServer()}/token/${token_id}`);
    if (!request.ok) {
      throw new Error('Failed to fetch token');
    }
    const token = await request.json();
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
  }: CreateOrderArgs): Promise<Transaction> {
    this.ensureInitialized();

    let ask_token_details = null;
    let give_token_details = null;

    if (ask_token !== 'Coin') {
      const request = await fetch(`${this.getApiServer()}/token/${ask_token}`);
      if (!request.ok) {
        throw new Error('Failed to fetch ask token');
      }
      ask_token_details = await request.json();
    }

    if (give_token !== 'Coin') {
      const request = await fetch(`${this.getApiServer()}/token/${give_token}`);
      if (!request.ok) {
        throw new Error('Failed to fetch give token');
      }
      give_token_details = await request.json();
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
  async buildFillOrder({ order_id, amount, destination }: FillOrderArgs): Promise<Transaction> {
    this.ensureInitialized();
    const response = await fetch(`${this.getApiServer()}/order/${order_id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch order');
    }
    const data = await response.json();
    const order_details: OrderData = data;

    const { ask_currency, give_currency } = order_details;

    let ask_token_details = null;
    let give_token_details = null;

    if (ask_currency.type !== 'Coin') {
      const request = await fetch(`${this.getApiServer()}/token/${ask_currency.token_id}`);
      if (!request.ok) {
        throw new Error('Failed to fetch ask token');
      }
      ask_token_details = await request.json();
    }

    if (give_currency.type !== 'Coin') {
      const request = await fetch(`${this.getApiServer()}/token/${give_currency.token_id}`);
      if (!request.ok) {
        throw new Error('Failed to fetch give token');
      }
      give_token_details = await request.json();
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
  async buildConcludeOrder({ order_id }: ConcludeOrderArgs): Promise<Transaction> {
    this.ensureInitialized();
    const response = await fetch(`${this.getApiServer()}/order/${order_id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch order');
    }
    const order: OrderData = await response.json();

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
  async buildBridgeRequest({ destination, amount, token_id, intent }: BridgeRequestArgs): Promise<Transaction> {
    this.ensureInitialized();

    if (!token_id) {
      throw new Error('Token is mandatory');
    }

    const request = await fetch(`${this.getApiServer()}/token/${token_id}`);
    if (!request.ok) {
      throw new Error('Failed to fetch token');
    }
    const token_details = await request.json();

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
  async bridgeRequest({ destination, amount, token_id, intent }: BridgeRequestArgs): Promise<SignedTransaction> {
    const tx = await this.buildBridgeRequest({ destination, amount, token_id, intent });
    return this.signTransaction(tx);
  }

  /**
   * Builds a burn transaction without signing it.
   */
  async buildBurn({ token_id, amount }: BurnArgs): Promise<Transaction> {
    this.ensureInitialized();
    let token_details: TokenDetails | undefined = undefined;

    if (token_id !== 'Coin' && token_id !== null) {
      const request = await fetch(`${this.getApiServer()}/token/${token_id}`);
      if (!request.ok) {
        throw new Error('Failed to fetch token');
      }
      token_details = await request.json();
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
  async buildDataDeposit({ data }: DataDepositArgs): Promise<Transaction> {
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
  async buildDelegationCreate({ pool_id, destination }: DelegationCreateArgs): Promise<Transaction> {
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
  async buildDelegationStake(params: DelegationStakeArgs): Promise<Transaction> {
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
      const response = await fetch(`${this.getApiServer()}/pool/${pool_id}/delegations`);
      const data: DelegationDetails[] = await response.json();

      if (!response.ok) {
        throw new Error('Failed to fetch delegation id');
      }

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
  async buildDelegationWithdraw(params: DelegationWithdrawArgs): Promise<Transaction> {
    this.ensureInitialized();
    const amount = params.amount;
    const delegation_id = params.delegation_id;
    const pool_id = params.pool_id;

    if (!delegation_id && !pool_id) {
      throw new Error('Delegation id or pool id is required');
    }

    if (delegation_id) {
      const response = await fetch(`${this.getApiServer()}/delegation/${delegation_id}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error('Failed to fetch delegation id');
      }
      const delegation_details: DelegationDetails = data;

      return this.buildTransaction({
        type: 'DelegationWithdraw',
        params: { delegation_id, amount, delegation_details },
      });
    } else if (pool_id) {
      const response = await fetch(`${this.getApiServer()}/pool/${pool_id}/delegations`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error('Failed to fetch delegation id');
      }

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
  async buildCreateHtlc(params: CreateHtlcArgs): Promise<Transaction> {
    this.ensureInitialized();

    let token_details: TokenDetails | undefined = undefined;

    if(params.token_id){
      const request = await fetch(`${this.getApiServer()}/token/${params.token_id}`);
      if (!request.ok) {
        throw new Error('Failed to fetch token');
      }
      const token = await request.json();
      token_details = token;
    }

    const tx = await this.buildTransaction({
      type: 'Htlc',
      params: {
        amount: params.amount,
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
  async buildRefundHtlc(params: any): Promise<Transaction> {
    this.ensureInitialized();

    const {
      transaction_json,
      multisig_challege,
      witness_input,
    } = params;

    // @ts-ignore
    return {
      JSONRepresentation: transaction_json,
      BINRepresentation: {},
      HEXRepresentation_unsigned: '',
      // @ts-ignore
      htlc: { multisig_challege, witness_input }
    };
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
   * Builds an HTLC spend transaction without signing it.
   */
  async buildSpendHtlc(params: any): Promise<Transaction> {
    this.ensureInitialized();

    const { transaction_id, utxo } = params;

    let useHtlcUtxo: any[] = [];

    if (transaction_id) {
      const response = await fetch(`${this.getApiServer()}/transaction/${transaction_id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transaction');
      }
      const transaction: TransactionJSONRepresentation = await response.json();
      // @ts-ignore
      const { created } = this.previewUtxoChange({ JSONRepresentation: { ...transaction } } as Transaction);
      // @ts-ignore
      useHtlcUtxo = created.filter(({utxo}) => utxo.type === 'Htlc') || null;
    }

    let token_details = undefined;

    if(useHtlcUtxo[0].utxo.value.type === 'TokenV1'){
      const request = await fetch(`${this.getApiServer()}/token/${useHtlcUtxo[0].utxo.value.token_id}`);
      if (!request.ok) {
        throw new Error('Failed to fetch token');
      }
      token_details = await request.json();
    }

    return this.buildTransaction({
      type: 'Transfer',
      params: {
        to: useHtlcUtxo[0].utxo.htlc.spend_key,
        amount: useHtlcUtxo[0].utxo.value.amount.decimal,
        ...(
          useHtlcUtxo[0].utxo.value.type === 'TokenV1'
            ? { token_id: useHtlcUtxo[0].utxo.value.token_id }
            : {}
        ),
        token_details,
      },
      opts: {
        forceSpendUtxo: useHtlcUtxo,
      }
    });
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

    const res = await fetch(`${this.getApiServer()}/transaction/${transaction_id}`);
    if (!res.ok) {
      throw new Error('Failed to fetch transaction');
    }
    const transaction: TransactionJSONRepresentation = await res.json();

    const transaction_signed = hexToUint8Array(transaction_hex);

    const inputs = transaction.inputs.filter(({utxo}: any) => utxo && utxo.type === 'Htlc');

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

    const secret = extract_htlc_secret(
      transaction_signed,
      true,
      htlc_outpoint_source_id,
      htlc_output_index
    );

    if(format === 'hex') {
      return uint8ArrayToHex(secret);
    }

    return secret;
  }

  /**
   * Signs a transaction using the connected wallet.
   * @param tx - The transaction to sign
   * @returns Promise that resolves to the signed transaction hex
   */
  async signTransaction(tx: Transaction): Promise<SignedTransaction> {
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
  previewUtxoChange(tx: Transaction): { spent: UtxoEntry[]; created: UtxoEntry[] } {
    const spent: UtxoEntry[] = [];
    const created: UtxoEntry[] = [];

    tx.JSONRepresentation.inputs.forEach((input) => {
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

    tx.JSONRepresentation.outputs.forEach((output, index) => {
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

    let txresult: Transaction | undefined = undefined;
    this.buildTransaction = new Proxy(this.buildTransaction, {
      apply: async (target, thisArg, args) => {
        const result = (await Reflect.apply(target, thisArg, args)) as Transaction;
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
  async broadcastTx(tx: string | { hex: string, json: TransactionJSONRepresentation }): Promise<any> {
    this.ensureInitialized();
    const response = await fetch(`${this.getApiServer()}/transaction`, {
      method: 'POST',
      headers: typeof tx === 'string' ? {
        'Content-Type': 'text/plain',
      } : {
        'Content-Type': 'application/json',
      },
      body: typeof tx === 'string' ? tx : JSON.stringify({ transaction: tx.hex, json: tx.json }),
    });

    if (!response.ok) {
      const error_json = await response.json();
      const match = error_json.error.match(/message: "(.*?)"/);
      const errorMessage = match ? match[1] : null;

      throw new Error('Failed to broadcast transaction: ' + errorMessage);
    }
    const data = await response.json();
    return data;
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
    const response = await fetch(`${this.getApiServer()}/order`);
    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }
    const data = await response.json();
    return data;
  }
}

class Signer {
  private keys: Record<string, Uint8Array>;

  constructor(privateKeys: Record<string, Uint8Array>) {
    this.keys = privateKeys;
  }

  private getPrivateKey(address: string): Uint8Array | undefined {
    return this.keys[address];
  }

  private createSignature(tx: Transaction) {
    const network = Network.Testnet; // TODO: make network configurable
    const optUtxos_ = tx.JSONRepresentation.inputs.map((input) => {
      if (input.input.input_type !== 'UTXO') {
        return 0
      }
      const { utxo }: UtxoInput = input as UtxoInput;
      if (input.input.input_type === 'UTXO') {
        if (utxo.type === 'Transfer') {
          if (utxo.value.type === 'TokenV1') {
            return encode_output_token_transfer(Amount.from_atoms(utxo.value.amount.atoms), utxo.destination, utxo.value.token_id, network);
          } else {
            return encode_output_transfer(Amount.from_atoms(utxo.value.amount.atoms), utxo.destination, network);
          }
        }
        if (utxo.type === 'LockThenTransfer') {
          let lockEncoded: Uint8Array = new Uint8Array();
          if (utxo.lock.type === 'UntilTime') {
            // @ts-ignore
            lockEncoded = encode_lock_until_time(BigInt(utxo.lock.content.timestamp)); // TODO: check if timestamp is correct
          }
          if (utxo.lock.type === 'ForBlockCount') {
            lockEncoded = encode_lock_for_block_count(BigInt(utxo.lock.content));
          }
          if (utxo.value.type === 'TokenV1') {
            return encode_output_token_lock_then_transfer(Amount.from_atoms(utxo.value.amount.atoms), utxo.destination, utxo.value.token_id, lockEncoded, network);
          } else {
            return encode_output_lock_then_transfer(Amount.from_atoms(utxo.value.amount.atoms), utxo.destination, lockEncoded, network);
          }
        }
        return null
      }
    })

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

    const encodedWitnesses = tx.JSONRepresentation.inputs.map(
      (input, index) => {
        let address: string | undefined = undefined;

        if(input.input.input_type === 'UTXO') {
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

        const addressPrivateKey = this.getPrivateKey(address)

        if (!addressPrivateKey) {
          throw new Error(`Private key not found for address: ${address}`);
        }

        const transaction = this.hexToUint8Array(tx.HEXRepresentation_unsigned);

        const witness = encode_witness(
          SignatureHashType.ALL,
          addressPrivateKey,
          address,
          transaction,
          optUtxos,
          index,
          network,
        )
        return witness
      },
    )

    const signature = mergeUint8Arrays(encodedWitnesses);
    return signature;
  }

  private hexToUint8Array(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
      throw new Error("Hex string must have an even length");
    }

    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
  }

  private encodeSignedTransaction(tx: Transaction, signature: Uint8Array): string {
    const transaction_signed = encode_signed_transaction(
      this.hexToUint8Array(tx.HEXRepresentation_unsigned),
      signature
    );
    const transaction_signed_hex = transaction_signed.reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
    return transaction_signed_hex;
  }

  sign(tx: Transaction): string {
    const signature = this.createSignature(tx);
    return this.encodeSignedTransaction(tx, signature);
  }
}

export { Client, Signer };

console.log('[Mintlayer Connect SDK] Loaded');
