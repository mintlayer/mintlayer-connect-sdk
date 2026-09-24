import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WalletState } from '@mintlayer/sdk';

import { createBotClient } from '../lib/client';
import { loadConfigFromEnv, validateConfig } from '../lib/config';
import { executeRequest, mergeRecords, strategyActionToRequest } from '../lib/execution';
import { averageBookPrice, buildSyntheticBook, isOwnOrder } from '../lib/orderBook';
import { fetchPairOrders } from '../lib/orders';
import { planAllStrategyActions, planSimulatedOwnFill, planStrategyActions, withReferencePrice } from '../lib/strategy';
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
  manualReferencePrice: number;
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
    availableBranches: [],
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
  const cycleInFlightRef = useRef(false);
  const simulationTurnRef = useRef(0);
  const orphanedPendingOutpointsRef = useRef(new Set<string>());
  const unfillableSimulationOrderIdsRef = useRef(new Set<string>());

  const configWarnings = useMemo(() => validateConfig(config), [config]);
  const book = useMemo(() => buildSyntheticBook(orders, config.baseToken, config.quoteToken), [orders, config]);
  // Keep manual proposals consistent with the loop: an empty book still has
  // the configured reference price from which to quote.
  const strategyBook = useMemo(
    () => withReferencePrice(book, config.referencePrice),
    [book, config.referencePrice],
  );
  const manualReferencePrice = useMemo(
    () => averageBookPrice(book) ?? config.referencePrice,
    [book, config.referencePrice],
  );
  const actions = useMemo(() => {
    const appliedActionIds = new Set(
      records
        .filter((record) => record.status !== 'rejected')
        .map((record) => record.idempotencyKey),
    );

    return planAllStrategyActions({ config, book: strategyBook, ownOrders, wallet, quoteLevelOffset }).filter(
      (action) => !appliedActionIds.has(action.id),
    );
  }, [config, ownOrders, quoteLevelOffset, records, strategyBook, wallet]);
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
        maxUnconfirmedBranchDepth: config.maxUnconfirmedBranchDepth,
      }),
    [config.baseToken, config.maxUnconfirmedBranchDepth, config.orderSize, wallet],
  );

  const refresh = useCallback(async () => {
    if (!runtime.client || !walletState) {
      return null;
    }

    const [pairOrders, accountOrders, walletSnapshot] = await Promise.all([
      fetchPairOrders(config),
      runtime.client.getAccountOrders(),
      loadWalletSnapshot(runtime.client, walletState, config.maxUnconfirmedBranchDepth),
    ]);

    // An API UTXO response does not guarantee the local broadcast node has
    // accepted the parent into its mempool. Keep an orphaned branch excluded
    // for this browser session; reinitialize after its parent confirms.
    const safeWalletSnapshot = {
      ...walletSnapshot,
      availableUtxos: walletSnapshot.availableUtxos.filter(
        (utxo) => !orphanedPendingOutpointsRef.current.has(`${utxo.txId}:${utxo.outputIndex}`),
      ),
    };
    const typedOrders = pairOrders as MarketOrder[];
    const typedOwnOrders =
      accountOrders.length > 0
        ? (accountOrders as MarketOrder[]).filter((order) =>
          typedOrders.some((pairOrder) => pairOrder.order_id === order.order_id),
          )
        : typedOrders.filter((order) => isOwnOrder(order, safeWalletSnapshot.addresses));

    setOrders(typedOrders);
    setOwnOrders(typedOwnOrders);
    setWallet(safeWalletSnapshot);

    const branchSnapshot = analyzeBranches(safeWalletSnapshot, config.maxUnconfirmedBranchDepth);
    const labels = await loadTokenLabels(
      config,
      collectTokenIds({ config, wallet: safeWalletSnapshot, branches: branchSnapshot }),
    );
    setTokenLabels((current) => mergeTokenLabels(current, labels));
    return { orders: typedOrders, ownOrders: typedOwnOrders, wallet: safeWalletSnapshot };
  }, [config, config.maxUnconfirmedBranchDepth, runtime.client, walletState]);

  const initialize = useCallback(async () => {
    setRuntime((current) => ({ ...current, mode: 'initializing', error: null }));
    orphanedPendingOutpointsRef.current.clear();
    unfillableSimulationOrderIdsRef.current.clear();

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
    async (request: ExecutionRequest, forceBroadcast = broadcastEnabled, executionWallet = wallet) => {
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
        availableUtxos: executionWallet?.availableUtxos ?? [],
        tradeMeta: request.kind === 'fill-order' ? request.tradeMeta : undefined,
      });

      if (
        record.status === 'rejected' &&
        /orphan transaction/i.test(record.error ?? '') &&
        executionWallet
      ) {
        const inputOutpoints = new Set(record.inputOutpoints);
        for (const utxo of executionWallet.availableUtxos) {
          const outpoint = `${utxo.txId}:${utxo.outputIndex}`;
          if (utxo.status === 'unconfirmed' && inputOutpoints.has(outpoint)) {
            orphanedPendingOutpointsRef.current.add(outpoint);
          }
        }
      }
      if (
        request.kind === 'fill-order' &&
        request.idempotencyKey.startsWith('simulation-fill:') &&
        record.status === 'rejected' &&
        /zero amount|not enough (coin|token) UTXOs/i.test(record.error ?? '')
      ) {
        // The order book can be one API cycle behind the order fetched by the
        // builder. Do not repeatedly attempt an exhausted order, or one whose
        // ask currency is not presently available in this wallet's UTXOs.
        unfillableSimulationOrderIdsRef.current.add(request.orderId);
      }

      setRecords((current) => mergeRecords(current, record));
      await refresh();
      return record;
    },
    [broadcastEnabled, config, dryRun, records, refresh, runtime.client, wallet, walletState],
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

  const createManualOrder = useCallback(
    async (side: 'bid' | 'ask') => {
      const destination = wallet?.addresses.receiving[0];
      if (!destination || !Number.isFinite(manualReferencePrice) || manualReferencePrice <= 0 || config.orderSize <= 0) return;

      const price = manualReferencePrice * (side === 'bid' ? 0.95 : 1.05);
      const action: StrategyAction = {
        // Manual creation is repeatable, unlike the stable automatic proposal IDs.
        id: `manual-${side}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        kind: 'create-order',
        side,
        price,
        reason: `Manual ${side} at ${side === 'bid' ? '-5%' : '+5%'} of the average market price (${manualReferencePrice.toFixed(8)}).`,
        args: side === 'bid'
          ? { conclude_destination: destination, ask_token: config.baseToken, ask_amount: config.orderSize, give_token: config.quoteToken, give_amount: config.orderSize * price }
          : { conclude_destination: destination, ask_token: config.quoteToken, ask_amount: config.orderSize * price, give_token: config.baseToken, give_amount: config.orderSize },
      };
      await execute(strategyActionToRequest(action, destination));
    },
    [config.baseToken, config.orderSize, config.quoteToken, execute, manualReferencePrice, wallet?.addresses.receiving],
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
    if (cycleInFlightRef.current) {
      return;
    }

    cycleInFlightRef.current = true;
    try {
      const snapshot = await refresh();
      // A simulation creates real candles only when transactions are broadcast.
      // Keep dry-run and broadcast-off sessions observational, even while looping.
      if (!snapshot || !config.simulateOwnFills || dryRun || !broadcastEnabled) {
        return;
      }

      const filledOrderIds = new Set(
        records
          .filter((record) => record.idempotencyKey.startsWith('simulation-fill:') && record.status !== 'rejected')
          .map((record) => record.tradeMeta?.orderId)
          .filter((orderId): orderId is string => Boolean(orderId)),
      );
      const concludedOrderIds = new Set(
        records
          .filter((record) => record.idempotencyKey.startsWith('simulation-conclude:') && record.status !== 'rejected')
          .map((record) => record.idempotencyKey.slice('simulation-conclude:'.length)),
      );
      const filledOrderToConclude = snapshot.ownOrders.find(
        (order) => filledOrderIds.has(order.order_id) && !concludedOrderIds.has(order.order_id),
      );

      if (filledOrderToConclude) {
        const fillRecord = records.find(
          (record) =>
            record.idempotencyKey.startsWith('simulation-fill:') &&
            record.tradeMeta?.orderId === filledOrderToConclude.order_id &&
            record.status !== 'rejected',
        );
        if (fillRecord && Date.now() - fillRecord.updatedAt < config.simulationTradeTimeoutMs) {
          return;
        }
        await execute(
          strategyActionToRequest(
            {
              id: `simulation-conclude:${filledOrderToConclude.order_id}`,
              kind: 'conclude-order',
              orderId: filledOrderToConclude.order_id,
              reason: 'Liquidity simulation: conclude the partially self-filled order before replacing it.',
            },
            snapshot.wallet.addresses.receiving[0],
          ),
          true,
          snapshot.wallet,
        );
        return;
      }

      const simulatedFill = planSimulatedOwnFill({
        config,
        book: withReferencePrice(
          buildSyntheticBook(snapshot.orders, config.baseToken, config.quoteToken),
          config.referencePrice,
        ),
        wallet: snapshot.wallet,
        alreadyFilledOrderIds: new Set([
          ...filledOrderIds,
          ...unfillableSimulationOrderIdsRef.current,
        ]),
        turn: simulationTurnRef.current++,
      });
      if (simulatedFill) {
        await execute(strategyActionToRequest(simulatedFill, snapshot.wallet.addresses.receiving[0]), true, snapshot.wallet);
        return;
      }

      const lifecycleAction = planStrategyActions({
        config,
        book: withReferencePrice(
          buildSyntheticBook(snapshot.orders, config.baseToken, config.quoteToken),
          config.referencePrice,
        ),
        ownOrders: snapshot.ownOrders,
        wallet: snapshot.wallet,
        quoteLevelOffset,
      })[0];
      if (lifecycleAction) {
        const record = await execute(
          strategyActionToRequest(lifecycleAction, snapshot.wallet.addresses.receiving[0]),
          true,
          snapshot.wallet,
        );
        if (record?.status !== 'rejected' && lifecycleAction.kind === 'create-order') {
          setQuoteLevelOffset((current) => current + 1);
        }
      }
    } finally {
      setLastCycleAt(Date.now());
      cycleInFlightRef.current = false;
    }
  }, [broadcastEnabled, config, dryRun, execute, quoteLevelOffset, records, refresh]);

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
    orphanedPendingOutpointsRef.current.clear();
    unfillableSimulationOrderIdsRef.current.clear();

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
    manualReferencePrice,
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
    createManualOrder,
    concludeOrder,
    executePreparationAction,
  };
}
