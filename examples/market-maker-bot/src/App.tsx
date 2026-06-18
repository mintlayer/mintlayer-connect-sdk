import {
  BranchPanel,
  ConfigPanel,
  OrderBookPanel,
  StrategyPanel,
  TradesPanel,
  TransactionPanel,
  WalletPanel,
} from './components/Panels';
import { useMarketMakerBot } from './hooks/useMarketMakerBot';
import './styles.css';

function formatTime(value: number | null): string {
  return value ? new Date(value).toLocaleTimeString() : 'never';
}

export default function App() {
  const {
    state,
    setConfig,
    setBroadcastEnabled,
    setDryRun,
    initialize,
    runCycle,
    startLoop,
    stopLoop,
    resetLocalState,
    executeStrategyAction,
    executePreparationAction,
  } = useMarketMakerBot();

  const initialized = Boolean(state.runtime.client);
  const running = state.runtime.mode === 'running';

  return (
    <main>
      <header className="hero">
        <div>
          <p className="eyebrow">Mintlayer SDK Example</p>
          <h1>Market Maker Bot</h1>
          <p>
            Browser-based testnet SPA for synthetic orderbook tracking, inventory-aware quoting,
            transaction lifecycle visualization, and UTXO branch preparation.
          </p>
        </div>
        <div className="heroCard">
          <span>Status</span>
          <strong>{state.runtime.mode}</strong>
          <small>Last cycle: {formatTime(state.lastCycleAt)}</small>
        </div>
      </header>

      <section className="toolbar">
        <button disabled={state.runtime.mode === 'initializing'} onClick={() => void initialize()}>
          {initialized ? 'Reinitialize' : 'Initialize SDK'}
        </button>
        <button disabled={!initialized} onClick={() => void runCycle()}>
          Run One Cycle
        </button>
        <button disabled={!initialized || running} onClick={startLoop}>
          Start Loop
        </button>
        <button disabled={!running} onClick={stopLoop}>
          Stop Loop
        </button>
        <button
          className="danger"
          onClick={() => {
            if (
              window.confirm(
                'Clear all local wallet transactions, execution records, and cached UTXO state? This does not affect on-chain data.',
              )
            ) {
              void resetLocalState();
            }
          }}
        >
          Clear Local State
        </button>
      </section>

      {state.runtime.error && <div className="banner errorText">{state.runtime.error}</div>}

      <div className="layout">
        <ConfigPanel
          config={state.config}
          tokenLabels={state.tokenLabels}
          warnings={state.configWarnings}
          broadcastEnabled={state.broadcastEnabled}
          dryRun={state.dryRun}
          setConfig={setConfig}
          setBroadcastEnabled={setBroadcastEnabled}
          setDryRun={setDryRun}
        />
        <WalletPanel
          wallet={state.wallet}
          config={state.config}
          tokenLabels={state.tokenLabels}
          midPrice={state.book.midPrice}
        />
        <OrderBookPanel
          book={state.book}
          orders={state.orders}
          ownOrders={state.ownOrders}
          config={state.config}
          tokenLabels={state.tokenLabels}
        />
        <StrategyPanel
          actions={state.actions}
          tokenLabels={state.tokenLabels}
          dryRun={state.dryRun}
          onExecute={(action) => void executeStrategyAction(action)}
        />
        <TransactionPanel records={state.records} />
        <TradesPanel trades={state.trades} tokenLabels={state.tokenLabels} baseToken={state.config.baseToken} />
        <BranchPanel
          branches={state.branches}
          plan={state.preparationPlan}
          tokenLabels={state.tokenLabels}
          onExecute={(request) => void executePreparationAction(request)}
        />
      </div>
    </main>
  );
}
