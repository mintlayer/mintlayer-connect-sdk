import type {
  BranchInfo,
  BranchPreparationPlan,
  BotRuntime,
  ExecutionRecord,
  MarketMakerConfig,
  MarketOrder,
  StrategyAction,
  SyntheticBook,
  TradeRecord,
  WalletSnapshot,
} from '../src/lib/types';
import type { TokenLabelMap } from '../src/lib/tokens';

export type ExecutionMode = 'observe' | 'dry-run' | 'live';
export type Control = { running: boolean; executionMode: ExecutionMode; configVersion: number };
export type BotEvent = {
  id: number;
  at: number;
  level: 'info' | 'warn' | 'error';
  kind: string;
  message: string;
  context: Record<string, unknown>;
};
export type Command =
  | { kind: 'start' }
  | { kind: 'stop' }
  | { kind: 'sync' }
  | { kind: 'mode'; mode: ExecutionMode }
  | { kind: 'config'; config: MarketMakerConfig; expectedVersion: number }
  | { kind: 'execute'; actionId: string }
  | { kind: 'manual-order'; side: 'bid' | 'ask' }
  | { kind: 'conclude'; orderId: string }
  | { kind: 'prepare'; requestId: string };
export type CommandEnvelope = { id: string; command: Command };
export type CommandResult = {
  id: string;
  status: 'queued' | 'running' | 'applied' | 'failed';
  error?: string;
  createdAt: number;
  updatedAt: number;
};
export type BotSnapshot = {
  revision: number;
  control: Control;
  runtime: BotRuntime;
  config: MarketMakerConfig;
  configWarnings: string[];
  wallet: WalletSnapshot | null;
  orders: MarketOrder[];
  ownOrders: MarketOrder[];
  book: SyntheticBook;
  actions: StrategyAction[];
  records: ExecutionRecord[];
  trades: TradeRecord[];
  branches: BranchInfo[];
  preparationPlan: BranchPreparationPlan;
  tokenLabels: TokenLabelMap;
  manualReferencePrice: number;
  lastCycleAt: number | null;
  lastSyncAt: number | null;
  stale: boolean;
  pauseReason: string | null;
  events: BotEvent[];
  totals: { transactions: number; events: number };
};

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
