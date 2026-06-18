import type { Client, CreateOrderArgs, WalletBalance, WalletTx, WalletUtxo } from '@mintlayer/sdk';

export type NetworkName = 'testnet' | 'mainnet';

export type TokenRef = 'Coin' | string;

export type BotMode = 'idle' | 'initializing' | 'ready' | 'running' | 'error';

export type ExecutionStatus = 'draft' | 'signed' | 'local' | 'broadcasted' | 'confirmed' | 'rejected';

export type ExecutionKind = 'create-order' | 'fill-order' | 'conclude-order' | 'prepare-utxo';

export type MarketMakerConfig = {
  network: NetworkName;
  apiUrl?: string;
  apiKey?: string;
  walletSeed?: string;
  pair: string;
  baseToken: TokenRef;
  quoteToken: TokenRef;
  orderSize: number;
  spreadBps: number;
  inventoryTarget: number;
  rebalanceThreshold: number;
  maxPosition: number;
  maxOrders: number;
  pollIntervalMs: number;
  maxUnconfirmedBranchDepth: number;
  allowMainnetBroadcast: boolean;
  enableFillTrading: boolean;
  allowSelfFills: boolean;
};

export type WalletSnapshot = {
  addresses: {
    receiving: string[];
    change: string[];
  };
  sdkBalances: {
    coin: number;
    token: Record<string, number>;
  } | null;
  localBalance: WalletBalance | null;
  utxos: WalletUtxo[];
  spendableUtxos: WalletUtxo[];
  transactions: WalletTx[];
};

export type OrderCurrency = {
  type: 'Coin' | 'Token' | 'TokenV1';
  token_id?: string;
};

export type AmountLike = {
  atoms?: string | number;
  decimal?: string;
};

export type MarketOrder = {
  order_id: string;
  ask_balance: AmountLike;
  initially_asked: AmountLike;
  ask_currency: OrderCurrency;
  give_balance: AmountLike;
  initially_given: AmountLike;
  give_currency: OrderCurrency;
  conclude_destination: string;
  nonce?: number;
};

export type BookSide = 'bid' | 'ask';

export type BookLevel = {
  side: BookSide;
  orderId: string;
  price: number;
  baseAmount: number;
  quoteAmount: number;
  ownerAddress: string;
};

export type SyntheticBook = {
  bids: BookLevel[];
  asks: BookLevel[];
  midPrice: number | null;
  bestBid: number | null;
  bestAsk: number | null;
};

export type StrategyAction =
  | {
      id: string;
      kind: 'create-order';
      side: BookSide;
      reason: string;
      price: number;
      args: CreateOrderArgs;
    }
  | {
      id: string;
      kind: 'conclude-order';
      reason: string;
      orderId: string;
    }
  | {
      id: string;
      kind: 'fill-order';
      side: 'buy' | 'sell';
      reason: string;
      orderId: string;
      amount: number;
      price: number;
      expectedBaseAmount: number;
      expectedQuoteAmount: number;
      isOwnOrder: boolean;
    };

export type ExecutionRequest =
  | {
      id: string;
      kind: 'create-order';
      args: CreateOrderArgs;
      description: string;
      idempotencyKey: string;
    }
  | {
      id: string;
      kind: 'conclude-order';
      orderId: string;
      description: string;
      idempotencyKey: string;
    }
  | {
      id: string;
      kind: 'fill-order';
      orderId: string;
      amount: number;
      destination: string;
      description: string;
      idempotencyKey: string;
      tradeMeta: NonNullable<ExecutionRecord['tradeMeta']>;
    }
  | {
      id: string;
      kind: 'prepare-utxo';
      to: string;
      amount: number;
      tokenId?: string;
      description: string;
      idempotencyKey: string;
    };

export type ExecutionRecord = {
  id: string;
  kind: ExecutionKind;
  description: string;
  idempotencyKey: string;
  status: ExecutionStatus;
  createdAt: number;
  updatedAt: number;
  txId?: string;
  signedHex?: string;
  error?: string;
  broadcastResponse?: unknown;
  tradeMeta?: {
    side: 'buy' | 'sell';
    orderId: string;
    fillAmount: number;
    price: number;
    expectedBaseAmount: number;
    expectedQuoteAmount: number;
    isOwnOrder: boolean;
  };
};

export type TradeRecord = {
  id: string;
  orderId: string;
  side: 'buy' | 'sell';
  fillAmount: number;
  expectedBaseAmount: number;
  expectedQuoteAmount: number;
  price: number;
  status: ExecutionStatus;
  isOwnOrder: boolean;
  txId?: string;
  timestamp: number;
  description: string;
};

export type BranchInfo = {
  id: string;
  asset: TokenRef;
  outpoint: string;
  status: WalletUtxo['status'];
  amountAtoms: string;
  depth: number;
  remainingDepth: number;
  reserved: boolean;
  warning: string | null;
};

export type BranchPreparationPlan = {
  sourceAsset: TokenRef;
  targetBranchCount: number;
  perBranchAmount: number;
  destination: string;
  actions: ExecutionRequest[];
  warnings: string[];
};

export type BotRuntime = {
  mode: BotMode;
  client: Client | null;
  initializedAt: number | null;
  error: string | null;
};
