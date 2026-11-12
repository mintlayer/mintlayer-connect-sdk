import { useState } from 'react';
import {
  BranchPanel,
  ConfigPanel,
  FillSimulationPanel,
  OrderBookPanel,
  StrategyPanel,
  TradesPanel,
  TransactionPanel,
  WalletPanel,
} from './components/Panels';
import { apiRequest, useMarketMakerBot } from './hooks/useMarketMakerBot';
import type { ExecutionRecord, MarketMakerConfig } from './lib/types';
import type { BotEvent, ExecutionMode } from '../shared/protocol';
import './styles.css';

const time = (value: number | null) => (value ? new Date(value).toLocaleTimeString() : 'never');
export default function App() {
  const { state, authenticated, login, error, connected, pending, command } = useMarketMakerBot();
  const [password, setPassword] = useState('');
  const [draft, setDraft] = useState<MarketMakerConfig | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);
  const [history, setHistory] = useState<ExecutionRecord[] | null>(null);
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);
  const [events, setEvents] = useState<BotEvent[] | null>(null);
  const [eventsCursor, setEventsCursor] = useState<number | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  async function loadHistory(more = false) {
    try {
      const page = await apiRequest<{ items: ExecutionRecord[]; nextCursor: number | null }>(
        `/api/transactions?limit=100${more && historyCursor ? `&before=${historyCursor}` : ''}`,
      );
      setHistory((old) => (more ? [...(old ?? []), ...page.items] : page.items));
      setHistoryCursor(page.nextCursor);
      setHistoryError(null);
    } catch (cause) {
      setHistoryError((cause as Error).message);
    }
  }
  async function loadEvents(more = false) {
    try {
      const page = await apiRequest<{ items: BotEvent[]; nextCursor: number | null }>(
        `/api/events?limit=100${more && eventsCursor ? `&before=${eventsCursor}` : ''}`,
      );
      setEvents((old) => (more ? [...(old ?? []), ...page.items] : page.items));
      setEventsCursor(page.nextCursor);
      setHistoryError(null);
    } catch (cause) {
      setHistoryError((cause as Error).message);
    }
  }
  if (!authenticated)
    return (
      <main className="appShell">
        <section className="panel loginPanel">
          <h1>Market Maker Bot</h1>
          <p>Connect to the bot server.</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void login(password);
            }}
          >
            <label>
              Server password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button type="submit">Connect</button>
          </form>
          {error && <p className="errorText">{error}</p>}
        </section>
      </main>
    );
  if (!state)
    return (
      <main className="appShell">
        <p>{error ?? 'Loading server state…'}</p>
      </main>
    );
  const running = state.control.running;
  const dryRun = state.control.executionMode !== 'live';
  const canExecute = connected && !state.stale && !pending && state.control.executionMode !== 'observe';
  return (
    <main className="appShell">
      <section className="toolbar controlBar">
        <div className="heroCard">
          <span>Server runtime</span>
          <strong>{state.runtime.mode}</strong>
          <small>
            Sync: {time(state.lastSyncAt)} · cycle: {time(state.lastCycleAt)}
          </small>
        </div>
        <label>
          Execution mode
          <select
            value={state.control.executionMode}
            onChange={(event) => void command({ kind: 'mode', mode: event.target.value as ExecutionMode })}
          >
            <option value="observe">Observe</option>
            <option value="dry-run">Dry run</option>
            <option value="live">Live</option>
          </select>
        </label>
        <button
          className="secondary"
          onClick={() => {
            setDraft({ ...state.config });
            setDraftVersion(state.control.configVersion);
          }}
        >
          Strategy config
        </button>
        <button disabled={pending} onClick={() => void command({ kind: 'sync' })}>
          Sync now
        </button>
        <button disabled={pending || running || state.stale} onClick={() => void command({ kind: 'start' })}>
          Start
        </button>
        <button className="danger" onClick={() => void command({ kind: 'stop' })}>
          Stop
        </button>
      </section>
      {(error || historyError) && <div className="banner errorText">{error ?? historyError}</div>}
      {(state.stale || state.pauseReason) && (
        <div className="banner warningText">
          {state.stale ? 'Data is stale. ' : ''}
          {state.pauseReason ?? 'Trading waits for synchronization.'}
        </div>
      )}
      <p className="muted">
        Execution runs on the server and continues when this page closes. Config version {state.control.configVersion}.
        Stop blocks new submissions; submitted transactions continue to synchronize.
      </p>
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
          canConclude={canExecute && !dryRun}
          onConclude={(orderId) => void command({ kind: 'conclude', orderId })}
        />
        <StrategyPanel
          actions={canExecute ? state.actions : []}
          tokenLabels={state.tokenLabels}
          dryRun={dryRun}
          manualReferencePrice={state.manualReferencePrice}
          canCreateManualOrder={canExecute}
          onExecute={(action) => void command({ kind: 'execute', actionId: action.id })}
          onCreateManualOrder={(side) => void command({ kind: 'manual-order', side })}
        />
        <FillSimulationPanel
          config={state.config}
          running={running}
          dryRun={dryRun}
          broadcastEnabled={!dryRun}
          records={state.records}
        />
        <section className="panel">
          <div className="panelHeader">
            <h2>Own Orders</h2>
            <span className="badge">{state.ownOrders.length}</span>
          </div>
          <div className="list">
            {state.ownOrders.map((order) => (
              <div className="listItem" key={order.order_id}>
                <div>
                  <code>{order.order_id}</code>
                  <p>
                    Remaining ask: {order.ask_balance.decimal ?? order.ask_balance.atoms} · give:{' '}
                    {order.give_balance.decimal ?? order.give_balance.atoms}
                  </p>
                </div>
                <button
                  disabled={!canExecute}
                  onClick={() => void command({ kind: 'conclude', orderId: order.order_id })}
                >
                  {dryRun ? 'Preview conclude' : 'Conclude'}
                </button>
              </div>
            ))}
          </div>
        </section>
        <div className="panel historyControls">
          <button
            className="secondary"
            onClick={() => {
              if (history) setHistory(null);
              else void loadHistory();
            }}
          >
            {history ? 'Show recent transactions' : `Browse all ${state.totals.transactions} transactions`}
          </button>
          <TransactionPanel records={history ?? state.records} />
          {history && historyCursor && <button onClick={() => void loadHistory(true)}>Load older transactions</button>}
        </div>
        <TradesPanel trades={state.trades} tokenLabels={state.tokenLabels} baseToken={state.config.baseToken} />
        <BranchPanel
          branches={state.branches}
          plan={state.preparationPlan}
          tokenLabels={state.tokenLabels}
          disabled={!canExecute}
          onExecute={(request) => {
            if (canExecute) void command({ kind: 'prepare', requestId: request.id });
          }}
        />
        <section className="panel eventsPanel">
          <div className="panelHeader">
            <h2>Server Events</h2>
            <button
              className="secondary"
              onClick={() => {
                if (events) setEvents(null);
                else void loadEvents();
              }}
            >
              {events ? 'Recent events' : 'Browse history'}
            </button>
          </div>
          <div className="list">
            {(events ?? state.events).map((event) => (
              <div className="listItem" key={event.id}>
                <div>
                  <strong>
                    {time(event.at)} · {event.kind}
                  </strong>
                  <p className={event.level === 'error' ? 'errorText' : undefined}>{event.message}</p>
                </div>
              </div>
            ))}
          </div>
          {events && eventsCursor && <button onClick={() => void loadEvents(true)}>Load older events</button>}
        </section>
      </div>
      {draft && (
        <div className="modalBackdrop" onMouseDown={() => setDraft(null)}>
          <div
            className="configDialog"
            role="dialog"
            aria-modal="true"
            aria-label="Strategy config"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="dialogHeader">
              <h2>Strategy config</h2>
              <button className="secondary" onClick={() => setDraft(null)}>
                Close
              </button>
            </div>
            <ConfigPanel
              config={draft}
              tokenLabels={state.tokenLabels}
              warnings={state.configWarnings}
              setConfig={(update) =>
                setDraft((previous) => previous && (typeof update === 'function' ? update(previous) : update))
              }
            />
            <label className="switchLabel">
              <input
                type="checkbox"
                disabled={draft.network !== 'testnet'}
                checked={draft.simulateOwnFills}
                onChange={(event) => setDraft({ ...draft, simulateOwnFills: event.target.checked })}
              />
              Testnet self-fill simulation
            </label>
            <label>
              Simulation settlement delay (seconds)
              <input
                type="number"
                min="5"
                value={draft.simulationTradeTimeoutMs / 1000}
                onChange={(event) =>
                  setDraft({ ...draft, simulationTradeTimeoutMs: Number(event.target.value) * 1000 })
                }
              />
            </label>
            <button
              disabled={pending}
              onClick={() => {
                void command({ kind: 'config', config: draft, expectedVersion: draftVersion }).then((result) => {
                  if (result) setDraft(null);
                });
              }}
            >
              Apply config
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
