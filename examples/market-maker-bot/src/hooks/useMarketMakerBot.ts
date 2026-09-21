import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WalletState } from '@mintlayer/sdk';

import { createBotClient } from '../lib/client';
import { loadConfigFromEnv, validateConfig } from '../lib/config';
import { executeRequest, mergeRecords, strategyActionToRequest } from '../lib/execution';
import { buildSyntheticBook, isOwnOrder } from '../lib/orderBook';
import { fetchPairOrders } from '../lib/orders';
import { planAllStrategyActions } from '../lib/strategy';
import { listTrades } from '../lib/trades';
import { analyzeBranches, createBranchPreparationPlan } from '../lib/utxoBranches';
import { collectTokenIds, loadTokenLabels, mergeTokenLabels, type TokenLabelMap } from '../lib/tokens';
import {
  clearAllLocalWalletState,
  createWalletStateForAddresses,
  loadWalletSnapshot,
} from '../lib/walletStore';
import type {
  BotRuntime,
  BranchPreparationPlan,
  ExecutionRecord,
  ExecutionRequest,
  MarketMakerConfig,
  MarketOrder,
  StrategyAction,
  SyntheticBook,
  TradeRecord,
  WalletSnapshot,
} from '../lib/types';

type BotState = {
  config: MarketMakerConfig;
  configWarnings: string[];
  runtime: BotRuntime;
  wallet: WalletSnapshot | null;
  orders: MarketOrder[];
  ownOrders: MarketOrder[];
  book: SyntheticBook;
  actions: StrategyAction[];
  records: ExecutionRecord[];
  broadcastEnabled: boolean;
  dryRun: boolean;
  preparationPlan: BranchPreparationPlan;
  lastCycleAt: number | null;
  trades: TradeRecord[];
  tokenLabels: TokenLabelMap;
};

const initialConfig = loadConfigFromEnv();

const EMPTY_BOOK: SyntheticBook = {
  bids: [],
  asks: [],
  bestBid: null,
  bestAsk: null,
  midPrice: null,
};

function emptyPreparationPlan(config: MarketMakerConfig): BranchPreparationPlan {
  return {
    sourceAsset: config.baseToken,
    targetBranchCount: 4,
    perBranchAmount: config.orderSize,
    destination: '',
    actions: [],
    warnings: [],
  };
}

export function useMarketMakerBot() {
  const [config, setConfig] = useState(initialConfig);
  const [runtime, setRuntime] = useState<BotRuntime>({
    mode: 'idle',
    client: null,
    initializedAt: null,
    error: null,
  });
  const [walletState, setWalletState] = useState<WalletState | null>(null);
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const [orders, setOrders] = useState<MarketOrder[]>([]);
  const [ownOrders, setOwnOrders] = useState<MarketOrder[]>([]);
  const [records, setRecords] = useState<ExecutionRecord[]>([]);
  const [broadcastEnabled, setBroadcastEnabled] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [quoteLevelOffset, setQuoteLevelOffset] = useState(0);
  const [lastCycleAt, setLastCycleAt] = useState<number | null>(null);
  const [tokenLabels, setTokenLabels] = useState<TokenLabelMap>({
    Coin: { tokenId: 'Coin', ticker: 'ML', decimals: 11 },
  });
  const loopRef = useRef<number | null>(null);

  const configWarnings = useMemo(() => validateConfig(config), [config]);
  const book = useMemo(() => buildSyntheticBook(orders, config.baseToken, config.quoteToken), [orders, config]);
  const actions = useMemo(() => {
    const appliedActionIds = new Set(
      records
        .filter((record) => record.status !== 'rejected')
        .map((record) => record.idempotencyKey),
    );

    return planAllStrategyActions({ config, book, ownOrders, wallet, quoteLevelOffset }).filter(
      (action) => !appliedActionIds.has(action.id),
    );
  }, [book, config, ownOrders, quoteLevelOffset, records, wallet]);
  const trades = useMemo(() => listTrades(records), [records]);
  const branches = useMemo(
    () => analyzeBranches(wallet, config.maxUnconfirmedBranchDepth),
    [wallet, config.maxUnconfirmedBranchDepth],
  );
  const preparationPlan = useMemo(
    () =>
      createBranchPreparationPlan({
        snapshot: wallet,
        sourceAsset: config.baseToken,
        targetBranchCount: 4,
        perBranchAmount: config.orderSize,
      }),
    [config.baseToken, config.orderSize, wallet],
  );

  const refresh = useCallback(async () => {
    if (!runtime.client || !walletState) {
      return;
    }

    const [pairOrders, accountOrders, walletSnapshot] = await Promise.all([
      fetchPairOrders(config),
      runtime.client.getAccountOrders(),
      loadWalletSnapshot(runtime.client, walletState, config.maxUnconfirmedBranchDepth),
    ]);

    const typedOrders = pairOrders as MarketOrder[];
    const typedOwnOrders =
      accountOrders.length > 0
        ? (accountOrders as MarketOrder[]).filter((order) =>
            typedOrders.some((pairOrder) => pairOrder.order_id === order.order_id),
          )
        : typedOrders.filter((order) => isOwnOrder(order, walletSnapshot.addresses));

    setOrders(typedOrders);
    setOwnOrders(typedOwnOrders);
    setWallet(walletSnapshot);

    const branchSnapshot = analyzeBranches(walletSnapshot, config.maxUnconfirmedBranchDepth);
    const labels = await loadTokenLabels(
      config,
      collectTokenIds({ config, wallet: walletSnapshot, branches: branchSnapshot }),
    );
    setTokenLabels((current) => mergeTokenLabels(current, labels));
  }, [config, config.maxUnconfirmedBranchDepth, runtime.client, walletState]);

  const initialize = useCallback(async () => {
    setRuntime((current) => ({ ...current, mode: 'initializing', error: null }));

    try {
      const client = await createBotClient(config);
      const addresses = client.getAddresses();
      const nextWalletState = await createWalletStateForAddresses(addresses);
      const walletSnapshot = await loadWalletSnapshot(client, nextWalletState, config.maxUnconfirmedBranchDepth);
      const [pairOrders, accountOrders] = await Promise.all([fetchPairOrders(config), client.getAccountOrders()]);

      const typedOrders = pairOrders as MarketOrder[];
      const typedOwnOrders =
        accountOrders.length > 0
          ? (accountOrders as MarketOrder[]).filter((order) =>
              typedOrders.some((pairOrder) => pairOrder.order_id === order.order_id),
            )
          : typedOrders.filter((order) => isOwnOrder(order, walletSnapshot.addresses));

      setWalletState(nextWalletState);
      setWallet(walletSnapshot);
      setOrders(typedOrders);
      setOwnOrders(typedOwnOrders);

      const branchSnapshot = analyzeBranches(walletSnapshot, config.maxUnconfirmedBranchDepth);
      const labels = await loadTokenLabels(
        config,
        collectTokenIds({ config, wallet: walletSnapshot, branches: branchSnapshot }),
      );
      setTokenLabels((current) => mergeTokenLabels(current, labels));

      setRuntime({
        mode: 'ready',
        client,
        initializedAt: Date.now(),
        error: null,
      });
    } catch (error) {
      setRuntime({
        mode: 'error',
        client: null,
        initializedAt: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [config]);

  const execute = useCallback(
    async (request: ExecutionRequest, forceBroadcast = broadcastEnabled) => {
      if (!runtime.client || !walletState) {
        return;
      }

      const duplicate = records.some((record) => record.idempotencyKey === request.idempotencyKey);
      if (duplicate) {
        return;
      }

      const record = await executeRequest({
        client: runtime.client,
        walletState,
        request,
        config,
        broadcast: forceBroadcast && !dryRun,
        availableUtxos: wallet?.availableUtxos ?? [],
        tradeMeta: request.kind === 'fill-order' ? request.tradeMeta : undefined,
      });

      setRecords((current) => mergeRecords(current, record));
      await refresh();
      return record;
    },
    [broadcastEnabled, config, dryRun, records, refresh, runtime.client, wallet?.availableUtxos, walletState],
  );

  const executeStrategyAction = useCallback(
    async (action: StrategyAction) => {
      const destination = wallet?.addresses.receiving[0];
      if (!destination) {
        return;
      }

      const record = await execute(strategyActionToRequest(action, destination));
      // Advance after both previews and successful broadcasts. The market API
      // can take a cycle to reflect a broadcast, so relying only on refreshed
      // own orders leaves the proposal box empty in the meantime.
      if (record?.status !== 'rejected') {
        setQuoteLevelOffset((current) => current + 3);
      }
    },
    [execute, wallet?.addresses.receiving],
  );

  const concludeOrder = useCallback(
    async (orderId: string) => {
      const destination = wallet?.addresses.receiving[0];
      if (!destination) {
        return;
      }

      await execute(
        strategyActionToRequest(
          {
            id: `manual-conclude:${orderId}`,
            kind: 'conclude-order',
            orderId,
            reason: 'Manually concluded from the order book.',
          },
          destination,
        ),
        true,
      );
    },
    [execute, wallet?.addresses.receiving],
  );

  const executePreparationAction = useCallback(
    async (request: ExecutionRequest) => {
      await execute(request);
    },
    [execute],
  );

  const runCycle = useCallback(async () => {
    await refresh();
    setLastCycleAt(Date.now());
  }, [refresh]);

  const startLoop = useCallback(() => {
    if (loopRef.current !== null) {
      return;
    }

    setRuntime((current) => ({ ...current, mode: 'running' }));
    loopRef.current = window.setInterval(() => {
      void runCycle();
    }, config.pollIntervalMs);
    void runCycle();
  }, [config.pollIntervalMs, runCycle]);

  const stopLoop = useCallback(() => {
    if (loopRef.current !== null) {
      window.clearInterval(loopRef.current);
      loopRef.current = null;
    }

    setRuntime((current) => ({
      ...current,
      mode: current.client ? 'ready' : 'idle',
    }));
  }, []);

  const resetLocalState = useCallback(async () => {
    stopLoop();
    clearAllLocalWalletState();

    setRecords([]);
    setOrders([]);
    setOwnOrders([]);
    setLastCycleAt(null);

    if (!runtime.client) {
      setWalletState(null);
      setWallet(null);
      setRuntime({
        mode: 'idle',
        client: null,
        initializedAt: null,
        error: null,
      });
      return;
    }

    try {
      const addresses = runtime.client.getAddresses();
      const nextWalletState = await createWalletStateForAddresses(addresses);
      const walletSnapshot = await loadWalletSnapshot(
        runtime.client,
        nextWalletState,
        config.maxUnconfirmedBranchDepth,
      );

      setWalletState(nextWalletState);
      setWallet(walletSnapshot);
      setRuntime((current) => ({
        ...current,
        mode: 'ready',
        error: null,
      }));
    } catch (error) {
      setRuntime((current) => ({
        ...current,
        mode: 'error',
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [config.maxUnconfirmedBranchDepth, runtime.client, stopLoop]);

  useEffect(() => {
    void loadTokenLabels(config, [config.baseToken, config.quoteToken]).then((labels) => {
      setTokenLabels((current) => mergeTokenLabels(current, labels));
    });
  }, [config.baseToken, config.quoteToken, config.network, config.apiUrl, config.apiKey]);

  useEffect(() => {
    return () => {
      if (loopRef.current !== null) {
        window.clearInterval(loopRef.current);
      }
    };
  }, []);

  const state: BotState & { branches: ReturnType<typeof analyzeBranches> } = {
    config,
    configWarnings,
    runtime,
    wallet,
    orders,
    ownOrders,
    book,
    actions,
    records,
    broadcastEnabled,
    dryRun,
    preparationPlan,
    lastCycleAt,
    branches,
    trades,
    tokenLabels,
  };

  return {
    state,
    setConfig,
    setBroadcastEnabled,
    setDryRun,
    initialize,
    refresh,
    runCycle,
    startLoop,
    stopLoop,
    resetLocalState,
    executeStrategyAction,
    concludeOrder,
    executePreparationAction,
  };
}
