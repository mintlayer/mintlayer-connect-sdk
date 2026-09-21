import { useState } from 'react';

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
  const [configOpen, setConfigOpen] = useState(false);
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
    <main className="appShell">
      <section className="toolbar controlBar">
        <div className="heroCard">
          <span>Runtime</span>
          <strong>{state.runtime.mode}</strong>
          <small>Last cycle: {formatTime(state.lastCycleAt)}</small>
        </div>
        <button
          className="secondary"
          aria-expanded={configOpen}
          aria-controls="strategy-config-dialog"
          onClick={() => setConfigOpen(true)}
        >
          Strategy config
        </button>
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

      {configOpen && (
        <div className="modalBackdrop" onMouseDown={() => setConfigOpen(false)}>
          <div
            className="configDialog"
            id="strategy-config-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="strategy-config-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="dialogHeader">
              <h2 id="strategy-config-title">Strategy config</h2>
              <button className="secondary" onClick={() => setConfigOpen(false)}>Close</button>
            </div>
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
          </div>
        </div>
      )}
    </main>
  );
}
