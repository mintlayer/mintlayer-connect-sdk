import { SourceId } from '@mintlayer/wasm-lib';

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

export type UtxoInput = {
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

export type Timelock =
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

export interface TransactionJSONRepresentation {
  inputs: Input[];
  outputs: Output[];
  fee?: AmountFields;
  id: string;
}


interface Outpoint {
  id: string;
  index: number;
}

interface UtxoOutpoint {
  index: number;
  source_type: SourceId;
  source_id: string;
}

export interface UtxoEntry {
  outpoint: UtxoOutpoint;
  utxo: Utxo;
}
