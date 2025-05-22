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
} from '@mintlayer/wasm-lib';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function mergeUint8Arrays(arrays: any) {
  const totalLength = arrays.reduce((sum: any, arr: any) => sum + arr.length, 0);

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

type AmountFields= {
  atoms: string;
  decimal: string;
}

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

type Utxo = {
  type: 'Transfer' | 'LockThenTransfer' | 'IssueNft';
  value: Value;
  destination: string;
  token_id?: string;
  data?: any;
};

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
}

type DelegateStakingOutput = {
  type: 'DelegateStaking';
  delegation_id: string;
  amount: AmountFields;
}

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

type TotalSupplyValue = {
  type: 'Unlimited' | 'Lockable';
} | {
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
  | DelegateStakingOutput;

export interface TransactionJSONRepresentation {
  inputs: Input[];
  outputs: Output[];
}

interface Transaction {
  JSONRepresentation: TransactionJSONRepresentation;
  BINRepresentation: Record<string, any>;
  HEXRepresentation_unsigned: string;
  intent?: string;
  transaction_id: string;
}

interface TokenDetails {
  token_id: string;
  number_of_decimals: number;
  authority: string;
  next_nonce?: number;
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
  type: 'DelegationStake';
  params: {
    pool_id: string;
    delegation_id: string;
    amount: number;
  };
}
  | {
  type: 'DelegationWithdraw';
  params: {
    pool_id: string;
    delegation_id: string;
    amount: number;
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
  };
}
  | {
  type: 'ConcludeOrder';
  params: {
    order: {
      order_id: string;
      nonce: number;
      conclude_destination: string;
      ask_balance: AmountFields;
      ask_currency: { type: 'Coin' } | { type: 'TokenV1'; token_id: string };
      give_balance: AmountFields;
      give_currency: { type: 'Coin' } | { type: 'TokenV1'; token_id: string };
    };
  };
}
  | {
  type: 'FillOrder';
  params: {
    order_id: string;
    amount: number;
    destination: string;
    order_details: {
      nonce: number;
    };
  };
};

interface OrderData {
  order_id: string;
  ask_balance: AmountFields;
  nonce: number;
  conclude_destination: string;
  ask_currency: { type: 'Coin' } | { type: 'TokenV1'; token_id: string };
  give_balance: AmountFields;
  give_currency: { type: 'Coin' } | { type: 'TokenV1'; token_id: string };
}

interface ClientOptions {
  network?: 'mainnet' | 'testnet';
  autoRestore?: boolean;
}

class Client {
  private network: 'mainnet' | 'testnet';
  private connectedAddresses: {
    [key: string]: {
      receiving: string[];
      change: string[];
    };
  };
  private isInitialized: boolean;

  constructor(options: ClientOptions = {}) {
    this.network = options.network || 'mainnet';
    this.connectedAddresses = {};
    this.isInitialized = false;
  }

  private getMLNetwork(): Network {
    return this.network === 'mainnet' ? Network.Mainnet : Network.Testnet;
  }

  static async create(options: ClientOptions = { autoRestore: true }): Promise<Client> {
    console.log('Create client');
    const client = new Client(options);
    await client.init();

    if (options.autoRestore !== false) {
      const restored = await client.restore();
      console.log('[Mojito SDK] Session restore', restored ? 'successful' : 'skipped');
    }

    return client;
  }

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

  private getApiServer(): string {
    return this.network === 'testnet'
      ? 'https://api-server-lovelace.mintlayer.org/api/v2'
      : 'https://api-server.mintlayer.org/api/v2';
  }

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

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('SDK not initialized. Use Client.create() to initialize the SDK.');
    }
  }

  private selectUTXOs(utxos: UtxoEntry[], amount: bigint, token_id: string | null): UtxoInput[] {
    return this.selectUTXOsForTransfer(utxos, amount, token_id);
  }

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

  private getOutputs({ amount, address, type = 'Transfer', lock, chainTip, tokenId, utxo }: any) {
    if (type === 'LockThenTransfer' && !lock) {
      throw new Error('LockThenTransfer requires a lock');
    }

    const amountInstace = Amount.from_atoms(amount);

    const networkIndex = this.getMLNetwork();
    if (type === 'Transfer') {
      if (tokenId) {
        return encode_output_token_transfer(amountInstace, address, tokenId, networkIndex);
      } else {
        return encode_output_transfer(amountInstace, address, networkIndex);
      }
    }
    if (type === 'LockThenTransfer') {
      let lockEncoded: Uint8Array = new Uint8Array();
      if (lock.type === 'UntilTime') {
        lockEncoded = encode_lock_until_time(BigInt(lock.content.timestamp));
      }
      if (lock.type === 'ForBlockCount') {
        lockEncoded = encode_lock_for_block_count(BigInt(lock.content));
      }
      if (tokenId) {
        return encode_output_token_lock_then_transfer(amountInstace, address, tokenId, lockEncoded, networkIndex);
      } else {
        return encode_output_lock_then_transfer(amountInstace, address, lockEncoded, networkIndex);
      }
    }
    if (type === 'spendFromDelegation') {
      // const stakingMaturity = getStakingMaturity(chainTip, networkType); // TODO: Get the staking maturity
      const stakingMaturity = 0n; // TODO: Get the staking maturity
      const encodedLockForBlock = encode_lock_for_block_count(stakingMaturity);
      return encode_output_lock_then_transfer(amountInstace, address, encodedLockForBlock, networkIndex);
    }

    if (type === 'IssueNft') {
      return encode_output_issue_nft(
        utxo.utxo.token_id,
        utxo.utxo.destination,
        utxo.utxo.data.name.string,
        utxo.utxo.data.ticker.string,
        utxo.utxo.data.description.string,
        stringToUint8Array(utxo.utxo.data.description.string),
        utxo.utxo.data.creator,
        utxo.utxo.data.media_uri.string,
        utxo.utxo.data.icon_uri.string,
        utxo.utxo.data.additional_metadata_uri.string,
        BigInt(Number(chainTip)),
        networkIndex,
      );
    }
  }

  private selectUTXOsForTransfer(utxos: UtxoEntry[], amount: bigint, token_id: string | null): UtxoInput[] {
    const transferableUtxoTypes = ['Transfer', 'LockThenTransfer', 'IssueNft'];
    const filteredUtxos: UtxoEntry[] = utxos
      .map((utxo) => {
        if (utxo.utxo.type === 'IssueNft') {
          return {
            ...utxo,
            utxo: {
              ...utxo.utxo,
              // value: {
              //   amount: {
              //     atoms: 1,
              //     decimal: 1,
              //   },
              //   type: 'TokenV1',
              //   token_id: utxo.utxo.token_id,
              // },
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

    console.log('filteredUtxos', filteredUtxos);

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

  readonly isMintlayer: boolean = true;

  setNetwork(net: 'mainnet' | 'testnet'): void {
    if (net !== 'testnet' && net !== 'mainnet') {
      throw new Error('Invalid network. Use "testnet" or "mainnet".');
    }
    this.network = net;
    console.log(`[Mintlayer Connect SDK] Network set to: ${this.network}`);
  }

  getNetwork(): 'mainnet' | 'testnet' {
    return this.network;
  }

  isConnected() {
    this.ensureInitialized();
    return this.connectedAddresses[this.network]?.receiving?.length > 0;
  }

  async connect(): Promise<string[]> {
    this.ensureInitialized();
    if (typeof window !== 'undefined' && window.mojito?.connect) {
      const addresses = await window.mojito.connect();
      this.connectedAddresses = addresses;
      return addresses;
    } else {
      throw new Error('Mojito extension not available');
    }
  }

  async disconnect(): Promise<void> {
    this.ensureInitialized();
    if (typeof window !== 'undefined' && window.mojito?.disconnect) {
      await window.mojito.disconnect();
      this.connectedAddresses = {};
    } else {
      throw new Error('Mojito extension not available');
    }
  }

  async restore(): Promise<boolean> {
    this.ensureInitialized();

    if (typeof window === 'undefined' || !window.mojito || typeof window.mojito.restore !== 'function') {
      console.warn('[Mintlayer SDK] No injected wallet found. Cannot restore session.');
      return false;
    }

    try {
      const addressData = await window.mojito.restore();

      if (addressData?.[this.network]?.receiving?.length) {
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

  async request({ method, params }: { method: string; params?: Record<string, any> }): Promise<any> {
    this.ensureInitialized();

    if (typeof window !== 'undefined' && window.mojito?.request) {
      return await window.mojito.request(method, params);
    } else {
      throw new Error('Mojito extension not available');
    }
  }

  getAddresses(): { receiving: string[]; change: string[] } {
    this.ensureInitialized();
    if (this.connectedAddresses[this.network].receiving.length > 0) {
      return this.connectedAddresses[this.network];
    }
    return { receiving: [], change: [] };
  }

  async getBalance(): Promise<number> {
    this.ensureInitialized();
    const address = this.connectedAddresses;
    const currentAddress = address[this.network];

    if (this.connectedAddresses[this.network].receiving.length === 0) {
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

  async getBalances(): Promise<{
    coin: number;
    token: Record<string, number>;
  }> {
    this.ensureInitialized();
    const address = this.connectedAddresses;
    const currentAddress = address[this.network];

    if (this.connectedAddresses[this.network].receiving.length === 0) {
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

  async getDelegations(): Promise<any[]> {
    this.ensureInitialized();
    if (this.connectedAddresses[this.network].receiving.length === 0) {
      throw new Error('No addresses connected. Call connect first.');
    }
    const address = this.connectedAddresses;
    const currentAddress = address[this.network];
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
      const delegations = await Promise.all(delegationPromises);
      const totalDelegations = delegations.reduce((acc: any[], del: any) => {
        return acc.concat(del);
      }, []);

      return totalDelegations;
    } catch (error) {
      throw new Error(`API error: ${(error as Error).message}`);
    }
  }

  async getTokensOwned(): Promise<any[]> {
    this.ensureInitialized();
    if (this.connectedAddresses[this.network].receiving.length === 0) {
      throw new Error('No addresses connected. Call connect first.');
    }
    const address = this.connectedAddresses;
    const currentAddress = address[this.network];
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
      const totalAuthority = authority.reduce((acc: any[], del: any) => {
        return acc.concat(del);
      }, []);

      return totalAuthority;
    } catch (error) {
      throw new Error(`API error: ${(error as Error).message}`);
    }
  }

  async getDelegationsTotal(): Promise<number> {
    this.ensureInitialized();
    const delegations = await this.getDelegations();
    const totalDelegation = delegations.reduce((acc: number, del: any) => {
      return acc + parseFloat(del.balance.decimal);
    }, 0);
    return totalDelegation;
  }

  getFeeForType(type: string): bigint {
    this.ensureInitialized();
    const block_height = 200000n; // TODO: Get the current block height
    let fee = Amount.from_atoms('0');
    switch (type) {
      case 'Transfer':
        return BigInt(2 * Math.pow(10, 11));
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
        return BigInt(50 * Math.pow(10, 11));
      case 'FreezeToken':
        fee = token_freeze_fee(block_height, this.network === 'mainnet' ? Network.Mainnet : Network.Testnet);
        return BigInt(fee.atoms());
      case 'UnfreezeToken':
        return BigInt(50 * Math.pow(10, 11));
      case 'DataDeposit':
        fee = data_deposit_fee(block_height, this.network === 'mainnet' ? Network.Mainnet : Network.Testnet);
        return BigInt(fee.atoms());
      case 'CreateDelegationId':
        return 0n;
      case 'DelegationStake':
        return 0n;
      case 'CreateOrder':
        return 0n;
      case 'FillOrder':
        return 0n;
      case 'ConcludeOrder':
        return 0n;
      default:
        throw new Error(`Unknown transaction type: ${type}`);
    }
  }

  async buildTransaction(arg: BuildTransactionParams): Promise<Transaction> {
    const {
      type,
      params,
    } = arg;

    this.ensureInitialized();
    if (!params) throw new Error('Missing params');

    console.log('[Mintlayer Connect SDK] Building transaction:', type, params);

    const address = this.connectedAddresses;
    const currentAddress = address[this.network];
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
    const utxos: UtxoEntry[] = data.utxos;

    let fee = 0n;
    const inputs: Input[] = [];
    const outputs: Output[] = [];

    let input_amount_coin_req = 0n;
    let input_amount_token_req = 0n;

    let send_token: { token_id: string; number_of_decimals: number } | undefined;

    fee += this.getFeeForType(type);

    if (type === 'Transfer') {
      const {
        token_id,
        token_details
      } = params;

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
        type: 'Transfer',
        destination: params.to,
        value: {
          ...(token_details
            ? { type: 'TokenV1',
                token_id,
              }
            : {
              type: 'Coin'
              }),
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
        },
      });
    }

    if (type === 'BurnToken') {
      const {
        token_id,
        token_details,
      } = params;

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
            atoms: (params.amount! * Math.pow(10, 11)).toString(),
          },
        },
      });
    }

    if (type === 'IssueFungibleToken') {
      let total_supply: { type: "Unlimited" | "Lockable" } | { type: "Fixed"; amount: AmountFields };

      if (params.supply_type === 'Unlimited') {
        total_supply = { type: 'Unlimited' };
      } else if (params.supply_type === 'Lockable') {
        total_supply = { type: 'Lockable' };
      } else if (params.supply_type === 'Fixed') {
        total_supply = {
          type: 'Fixed',
          amount: {
            atoms: (params.supply_amount! * Math.pow(10, params.number_of_decimals!)).toString(),
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
        atoms: (params.amount! * Math.pow(10, params.token_details!.number_of_decimals)).toString(),
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

      input_amount_token_req += BigInt(params.amount! * Math.pow(10, token_details!.number_of_decimals));
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

    if (type === 'DelegationStake') {
      const { pool_id, delegation_id, amount } = params;

      const amount_atoms = amount! * Math.pow(10, 11);
      input_amount_coin_req += BigInt(amount! * Math.pow(10, 11));

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
      const { delegation_id, amount } = params;

      const amount_atoms = amount! * Math.pow(10, 11);

      inputs.push({
        input: {
          input_type: "Account",
          account_type: "DelegationBalance",
          amount: {
            atoms: amount_atoms.toString(),
            decimal: amount.toString(),
          },
          delegation_id,
          nonce: 0
        },
      });
    }

    if (type === 'CreateOrder') {
      const { ask_amount, ask_token, give_amount, give_token, conclude_destination } = params;
      const give_token_details = { number_of_decimals: 11 }; // TODO
      const ask_token_details = { number_of_decimals: 11 }; // TODO

      if (give_token === 'Coin') {
        input_amount_coin_req += BigInt(give_amount! * Math.pow(10, 11));
      } else {
        input_amount_token_req += BigInt(give_amount! * Math.pow(10, give_token_details.number_of_decimals));
      }

      outputs.push({
        type: 'CreateOrder',
        ask_balance: {
          atoms: (ask_amount! * Math.pow(10, 11)).toString(),
          decimal: ask_amount!.toString(),
        },
        ask_currency: ask_token === 'Coin' ? { type: 'Coin' } : { token_id: ask_token, type: 'TokenV1' },
        conclude_destination,
        give_balance: {
          atoms: (give_amount! * Math.pow(10, give_token_details.number_of_decimals)).toString(),
          decimal: give_amount!.toString(),
        },
        give_currency: give_token === 'Coin' ? { type: 'Coin' } : { token_id: give_token, type: 'TokenV1' },
        initially_asked: {
          atoms: (ask_amount! * Math.pow(10, ask_token_details.number_of_decimals)).toString(),
          decimal: ask_amount!.toString(),
        },
        initially_given: {
          atoms: (give_amount! * Math.pow(10, ask_token_details.number_of_decimals)).toString(),
          decimal: give_amount!.toString(),
        },
      });
    }

    if (type === 'ConcludeOrder') {
      const { order_id, nonce, conclude_destination, ask_currency, give_currency, ask_balance, give_balance } = params.order;
      inputs.push({
        input: {
          input_type: "AccountCommand",
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
            decimal: ask_balance.decimal,
            atoms: ask_balance.atoms,
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
      const { order_id, amount, destination, order_details } = params;

      const amount_atoms = amount! * Math.pow(10, 11);

      inputs.push({
        input: {
          input_type: 'AccountCommand',
          command: 'FillOrder',
          order_id: order_id,
          fill_atoms: amount_atoms.toString(),
          destination: destination,
          nonce: order_details.nonce.toString(),
        },
        utxo: null,
      });
    }

    fee += BigInt(2 * Math.pow(10, 11));
    input_amount_coin_req += fee;

    const inputObjCoin = this.selectUTXOs(utxos, input_amount_coin_req, null);
    const inputObjToken = send_token?.token_id
      ? this.selectUTXOs(utxos, input_amount_token_req, send_token.token_id)
      : [];

    const totalInputValueCoin = inputObjCoin.reduce((acc, item) => acc + BigInt(item.utxo!.value.amount.atoms), 0n);
    const totalInputValueToken = inputObjToken.reduce((acc, item) => acc + BigInt(item.utxo!.value.amount.atoms), 0n);

    if (totalInputValueToken < input_amount_token_req) {
      console.log('Not enough token UTXOs');
    }

    const changeAmountCoin = totalInputValueCoin - input_amount_coin_req;
    const changeAmountToken = totalInputValueToken - input_amount_token_req;

    if (changeAmountCoin > 0) {
      outputs.push({
        type: 'Transfer',
        value: {
          type: 'Coin',
          amount: {
            atoms: changeAmountCoin.toString(),
            decimal: (Number(changeAmountCoin) / 1e11).toString(),
          },
        },
        destination: currentAddress.change[0],
      });
    }

    if (changeAmountToken > 0 && send_token) {
      const decimals = send_token.number_of_decimals;

      outputs.push({
        type: 'Transfer',
        value: {
          type: 'TokenV1',
          token_id: send_token.token_id,
          amount: {
            atoms: changeAmountToken.toString(),
            decimal: (Number(changeAmountToken) / Math.pow(10, decimals!)).toString(),
          },
        },
        destination: currentAddress.change[0],
      });
    }

    inputs.push(...inputObjCoin);
    inputs.push(...inputObjToken);

    const JSONRepresentation = {
      inputs,
      outputs,
    };

    const BINRepresentation = this.getTransactionBINrepresentation(JSONRepresentation, 1);

    const transaction = encode_transaction(
      mergeUint8Arrays(BINRepresentation.inputs),
      mergeUint8Arrays(BINRepresentation.outputs),
      BigInt(0),
    );

    const transaction_id = get_transaction_id(transaction, true);

    // some operations need to be recoded with given data
    // if outputs include issueNft type
    if (outputs.some((output) => output.type === 'IssueNft')) {
      // need to modify the transaction outout exact that object
      try {
        get_token_id(
          mergeUint8Arrays(BINRepresentation.inputs),
          this.network === 'mainnet' ? Network.Mainnet : Network.Testnet,
        );
      } catch (error) {
        throw new Error('Error while getting token id');
      }
      const token_id = get_token_id(
        mergeUint8Arrays(BINRepresentation.inputs),
        this.network === 'mainnet' ? Network.Mainnet : Network.Testnet,
      );
      const index = outputs.findIndex((output) => output.type === 'IssueNft');
      const output = outputs[index] as IssueNftOutput;
      outputs[index] = {
        ...output,
        token_id: token_id,
      };
    }

    const HEXRepresentation_unsigned = transaction.reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');

    return {
      JSONRepresentation,
      BINRepresentation,
      HEXRepresentation_unsigned,
      transaction_id,
    };
  }

  getTransactionBINrepresentation(transactionJSONrepresentation: TransactionJSONRepresentation, _network: Network) {
    const network = _network;
    // Binarisation
    // calculate fee and prepare as much transaction as possible
    const inputs = transactionJSONrepresentation.inputs;
    const outpointedSourceIds = (inputs as UtxoInput[])
      .filter(({ input }) => input.input_type === 'UTXO')
      .map(({ input }) => {
        const bytes = Uint8Array.from(
          input.source_id.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
        );
        return {
          source_id: encode_outpoint_source_id(bytes, SourceId.Transaction),
          index: input.index,
        };
      });
    const inputsIds = outpointedSourceIds.map((source) => encode_input_for_utxo(source.source_id, source.index));

    const inputCommands = (transactionJSONrepresentation.inputs as any[])
      .filter(({ input }) => input.input_type === 'AccountCommand')
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
      });

    const inputsArray = [...inputCommands, ...inputsIds];

    const outputsArrayItems = transactionJSONrepresentation.outputs.map((output) => {
      if (output.type === 'Transfer') {
        return this.getOutputs({
          amount: BigInt(output.value.amount.atoms).toString(),
          address: output.destination,
          networkType: this.network,
          ...(output.value.type === 'Coin' ? {} : { tokenId: output.value.token_id }),
        });
      }
      if (output.type === 'LockThenTransfer') {
        return this.getOutputs({
          type: 'LockThenTransfer',
          lock: output.lock,
          amount: BigInt(output.value.amount.atoms).toString(),
          address: output.destination,
          networkType: this.network,
          ...(output.value.type === 'Coin' ? {} : { tokenId: output.value.token_id }),
        });
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
    });
    const outputsArray = outputsArrayItems;

    const inputAddresses: string[] = (transactionJSONrepresentation.inputs as UtxoInput[])
      .filter(({ input }) => input.input_type === 'UTXO')
      .map((input) => input.utxo.destination);

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

  async transfer({ to, amount, token_id }: { to: string; amount: number; token_id?: string }): Promise<any> {
    this.ensureInitialized();
    if (token_id) {
      const request = await fetch(`${this.getApiServer()}/token/${token_id}`);
      if (!request.ok) {
        throw new Error('Failed to fetch token');
      }
      const token = await request.json();
      const token_details: TokenDetails = token;
      const tx = await this.buildTransaction({ type: 'Transfer', params: { to, amount, token_id, token_details } });
      return this.signTransaction(tx);
    } else {
      const tx = await this.buildTransaction({ type: 'Transfer', params: { to, amount } });
      return this.signTransaction(tx);
    }
  }

  async transferNft({ to, token_id }: { to: string; token_id: string }): Promise<any> {
    this.ensureInitialized();

    if(!token_id) {
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
    const tx = await this.buildTransaction({ type: 'Transfer', params: { to, amount, token_id, token_details } });
    return this.signTransaction(tx);
  }

  async delegate({ pool_id, destination }: { pool_id: string; destination: string }): Promise<any> {
    this.ensureInitialized();
    const tx = await this.buildTransaction({ type: 'CreateDelegationId', params: { pool_id, destination } });
    return this.signTransaction(tx);
  }

  async issueNft(tokenData: any): Promise<any> {
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
    const tx = await this.buildTransaction({ type: 'IssueNft', params: tokenData });
    return this.signTransaction(tx);
  }

  async issueToken({
    authority,
    is_freezable,
    metadata_uri,
    number_of_decimals,
    token_ticker,
    supply_type,
    supply_amount,
  }: {
    authority: string;
    is_freezable: boolean;
    metadata_uri: string;
    number_of_decimals: number;
    token_ticker: string;
    supply_type: 'Unlimited' | 'Lockable' | 'Fixed';
    supply_amount?: number;
  }): Promise<any> {
    this.ensureInitialized();
    const tx = await this.buildTransaction({
      type: 'IssueFungibleToken',
      params: { authority, is_freezable, metadata_uri, number_of_decimals, token_ticker, supply_type, supply_amount },
    });
    return this.signTransaction(tx);
  }

  async mintToken({
    destination,
    amount,
    token_id,
  }: {
    destination: string;
    amount: number;
    token_id: string;
  }): Promise<any> {
    this.ensureInitialized();
    const request = await fetch(`${this.getApiServer()}/token/${token_id}`);
    if (!request.ok) {
      throw new Error('Failed to fetch token');
    }
    const token = await request.json();
    const token_details = token;

    const tx = await this.buildTransaction({
      type: 'MintToken',
      params: { destination, amount, token_id, token_details },
    });
    return this.signTransaction(tx);
  }

  async unmintToken({ amount, token_id }: { amount: number; token_id: string }): Promise<any> {
    this.ensureInitialized();
    const request = await fetch(`${this.getApiServer()}/token/${token_id}`);
    if (!request.ok) {
      throw new Error('Failed to fetch token');
    }
    const token = await request.json();
    const token_details = token;

    const tx = await this.buildTransaction({ type: 'UnmintToken', params: { amount, token_id, token_details } });
    return this.signTransaction(tx);
  }

  async lockTokenSupply({ token_id }: { token_id: string }): Promise<any> {
    this.ensureInitialized();
    const request = await fetch(`${this.getApiServer()}/token/${token_id}`);
    if (!request.ok) {
      throw new Error('Failed to fetch token');
    }
    const token = await request.json();
    const token_details = token;

    const tx = await this.buildTransaction({ type: 'LockTokenSupply', params: { token_id, token_details } });
    return this.signTransaction(tx);
  }

  async changeTokenAuthority({ token_id, new_authority }: { token_id: string; new_authority: string }): Promise<any> {
    this.ensureInitialized();
    const request = await fetch(`${this.getApiServer()}/token/${token_id}`);
    if (!request.ok) {
      throw new Error('Failed to fetch token');
    }
    const token = await request.json();
    const token_details = token;

    const tx = await this.buildTransaction({
      type: 'ChangeTokenAuthority',
      params: { token_id, new_authority, token_details },
    });
    return this.signTransaction(tx);
  }

  async changeMetadataUri({
    token_id,
    new_metadata_uri,
  }: {
    token_id: string;
    new_metadata_uri: string;
  }): Promise<any> {
    this.ensureInitialized();
    const request = await fetch(`${this.getApiServer()}/token/${token_id}`);
    if (!request.ok) {
      throw new Error('Failed to fetch token');
    }
    const token = await request.json();
    const token_details = token;

    const tx = await this.buildTransaction({
      type: 'ChangeMetadataUri',
      params: { token_id, new_metadata_uri, token_details },
    });
    return this.signTransaction(tx);
  }

  async freezeToken({ token_id, is_unfreezable }: { token_id: string; is_unfreezable: boolean }): Promise<any> {
    this.ensureInitialized();
    const request = await fetch(`${this.getApiServer()}/token/${token_id}`);
    if (!request.ok) {
      throw new Error('Failed to fetch token');
    }
    const token = await request.json();
    const token_details = token;

    const tx = await this.buildTransaction({
      type: 'FreezeToken',
      params: { token_id, is_unfreezable, token_details },
    });
    return this.signTransaction(tx);
  }

  async unfreezeToken({ token_id }: { token_id: string }): Promise<any> {
    this.ensureInitialized();
    const request = await fetch(`${this.getApiServer()}/token/${token_id}`);
    if (!request.ok) {
      throw new Error('Failed to fetch token');
    }
    const token = await request.json();
    const token_details = token;

    const tx = await this.buildTransaction({ type: 'UnfreezeToken', params: { token_id, token_details } });
    return this.signTransaction(tx);
  }

  async createOrder({
    conclude_destination,
    ask_token,
    ask_amount,
    give_token,
    give_amount,
  }: {
    conclude_destination: string;
    ask_token: string;
    ask_amount: number;
    give_token: string;
    give_amount: number;
  }): Promise<any> {
    this.ensureInitialized();
    const tx = await this.buildTransaction({
      type: 'CreateOrder',
      params: { conclude_destination, ask_token, ask_amount, give_token, give_amount },
    });
    return this.signTransaction(tx);
  }

  async fillOrder({
    order_id,
    amount,
    destination,
  }: {
    order_id: string;
    amount: number;
    destination: string;
  }): Promise<any> {
    this.ensureInitialized();
    const response = await fetch(`${this.getApiServer()}/order/${order_id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch order');
    }
    const data = await response.json();
    const order_details = data;
    const tx = await this.buildTransaction({
      type: 'FillOrder',
      params: { order_id, amount, order_details, destination },
    });
    return this.signTransaction(tx);
  }

  async getAccountOrders(): Promise<any[]> {
    this.ensureInitialized();
    const allOrders = await this.getAvailableOrders();
    const address = this.connectedAddresses;
    const currentAddress = address[this.network];
    const addressList = [...currentAddress.receiving, ...currentAddress.change];
    const orders = allOrders.filter((order: any) => {
      return addressList.includes(order.conclude_destination);
    });
    return orders;
  }

  async concludeOrder({ order_id }: { order_id: string }): Promise<any> {
    this.ensureInitialized();
    const response = await fetch(`${this.getApiServer()}/order/${order_id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch order');
    }
    const order: OrderData = await response.json();

    const tx = await this.buildTransaction({ type: 'ConcludeOrder', params: { order } });
    return this.signTransaction(tx);
  }

  async bridgeRequest({
    destination,
    amount,
    token_id,
    intent,
  }: {
    destination: string;
    amount: number;
    token_id: string;
    intent: string;
  }): Promise<any> {
    this.ensureInitialized();

    if(!token_id) {
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
    return this.signTransaction({ ...tx, intent });
  }

  async burn({ token_id, amount }: { token_id: string; amount: number }): Promise<any> {
    this.ensureInitialized();
    let token_details: TokenDetails | undefined = undefined;

    if (token_id !== 'Coin' && token_id !== null) {
      const request = await fetch(`${this.getApiServer()}/token/${token_id}`);
      if (!request.ok) {
        throw new Error('Failed to fetch token');
      }
      token_details = await request.json();
    }

    const tx = await this.buildTransaction({ type: 'BurnToken', params: { token_id, amount, token_details } });
    return this.signTransaction(tx);
  }

  async dataDeposit({ data }: { data: string }): Promise<any> {
    this.ensureInitialized();
    const tx = await this.buildTransaction({ type: 'DataDeposit', params: { data } });
    return this.signTransaction(tx);
  }

  async delegationCreate({ pool_id, destination }: { pool_id: string; destination: string }): Promise<any> {
    this.ensureInitialized();
    const tx = await this.buildTransaction({ type: 'CreateDelegationId', params: { pool_id, destination } });
    return this.signTransaction(tx);
  }

  async delegationStake({
    pool_id,
    delegation_id,
    amount,
  }: {
    pool_id: string;
    delegation_id: string;
    amount: number;
  }): Promise<any> {
    this.ensureInitialized();
    const tx = await this.buildTransaction({ type: 'DelegationStake', params: { delegation_id, pool_id, amount } });
    return this.signTransaction(tx);
  }

  async delegationWithdraw({
    pool_id,
    delegation_id,
    amount,
  }: {
    pool_id: string;
    delegation_id: string;
    amount: number;
  }): Promise<any> {
    this.ensureInitialized();
    const tx = await this.buildTransaction({ type: 'DelegationWithdraw', params: { delegation_id, pool_id, amount } });
    return this.signTransaction(tx);
  }

  async signTransaction(tx: Transaction): Promise<any> {
    this.ensureInitialized();
    return this.request({
      method: 'signTransaction',
      params: { txData: tx },
    });
  }

  async getXPub(): Promise<string> {
    this.ensureInitialized();
    console.warn('[Mintlayer SDK] Warning: Sharing xPub exposes all derived addresses. Use with caution.');
    return this.request({ method: 'getXPub' });
  }

  async broadcastTx(tx: string): Promise<any> {
    this.ensureInitialized();
    const response = await fetch(`${this.getApiServer()}/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: tx,
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

  on(eventName: string, callback: (data: any) => void): void {
    this.ensureInitialized();
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.data.type === 'MINTLAYER_EVENT' && event.data.event === eventName) {
        callback(event.data.data);
      }
    });
  }

  async getAvailableOrders(): Promise<any[]> {
    this.ensureInitialized();
    const response = await fetch(`${this.getApiServer()}/order`);
    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }
    const data = await response.json();
    return data;
  }
}

export { Client };

console.log('[Mintlayer Connect SDK] Loaded');
