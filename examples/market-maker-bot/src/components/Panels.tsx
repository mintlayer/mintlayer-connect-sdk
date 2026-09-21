import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { isActiveOrder } from '../lib/orderBook';
import { getPairOrdersPath } from '../lib/orders';
import { actionToText, calculateInventory, getTokenBalance } from '../lib/strategy';
import { formatPairLabel, formatTokenLabel, shortenTokenId, type TokenLabelMap } from '../lib/tokens';
import type {
  BranchInfo,
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

function actionKindLabel(action: StrategyAction): string {
  if (action.kind === 'fill-order') {
    return action.isOwnOrder ? 'FILL SELF' : 'FILL';
  }

  if (action.kind === 'conclude-order') {
    return 'CONCLUDE';
  }

  return 'QUOTE';
}

type ConfigPanelProps = {
  config: MarketMakerConfig;
  tokenLabels: TokenLabelMap;
  warnings: string[];
  broadcastEnabled: boolean;
  dryRun: boolean;
  setConfig: Dispatch<SetStateAction<MarketMakerConfig>>;
  setBroadcastEnabled: (enabled: boolean) => void;
  setDryRun: (enabled: boolean) => void;
};

function setNumber(config: MarketMakerConfig, key: keyof MarketMakerConfig, value: string): MarketMakerConfig {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { ...config, [key]: parsed } : config;
}

export function ConfigPanel(props: ConfigPanelProps) {
  const { config, tokenLabels, warnings, broadcastEnabled, dryRun, setConfig, setBroadcastEnabled, setDryRun } = props;

  return (
    <section className="panel configPanel">
      <div className="panelHeader">
        <h2>Strategy Config</h2>
        <span className="badge">{formatPairLabel(config, tokenLabels)}</span>
      </div>
      <div className="grid two">
        <label>
          Pair
          <input value={config.pair} onChange={(event) => setConfig({ ...config, pair: event.target.value })} />
        </label>
        <label>
          Base Token ID
          <input value={config.baseToken} onChange={(event) => setConfig({ ...config, baseToken: event.target.value })} />
          <small className="fieldHint">Ticker: {formatTokenLabel(config.baseToken, tokenLabels)}</small>
        </label>
        <label>
          Quote Token ID
          <input value={config.quoteToken} onChange={(event) => setConfig({ ...config, quoteToken: event.target.value })} />
          <small className="fieldHint">Ticker: {formatTokenLabel(config.quoteToken, tokenLabels)}</small>
        </label>
        <label>
          Order Size
          <input
            type="number"
            min="0"
            step="0.00000001"
            value={config.orderSize}
            onChange={(event) => setConfig(setNumber(config, 'orderSize', event.target.value))}
          />
        </label>
        <label>
          Spread BPS
          <input
            type="number"
            min="1"
            value={config.spreadBps}
            onChange={(event) => setConfig(setNumber(config, 'spreadBps', event.target.value))}
          />
        </label>
        <label>
          Max Orders
          <input
            type="number"
            min="1"
            value={config.maxOrders}
            onChange={(event) => setConfig(setNumber(config, 'maxOrders', event.target.value))}
          />
        </label>
        <label>
          Inventory Target
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={config.inventoryTarget}
            onChange={(event) => setConfig(setNumber(config, 'inventoryTarget', event.target.value))}
          />
        </label>
        <label>
          Max Branch Depth
          <input
            type="number"
            min="1"
            max="29"
            value={config.maxUnconfirmedBranchDepth}
            onChange={(event) => setConfig(setNumber(config, 'maxUnconfirmedBranchDepth', event.target.value))}
          />
        </label>
      </div>
      <div className="switchRow">
        <label className="switchLabel">
          <input type="checkbox" checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} />
          Dry run
        </label>
        <label className="switchLabel">
          <input
            type="checkbox"
            checked={broadcastEnabled}
            disabled={dryRun}
            onChange={(event) => setBroadcastEnabled(event.target.checked)}
          />
          Broadcast signed transactions
        </label>
        <label className="switchLabel">
          <input
            type="checkbox"
            checked={config.enableFillTrading}
            onChange={(event) => setConfig({ ...config, enableFillTrading: event.target.checked })}
          />
          Enable fill trading (taker)
        </label>
        <label className="switchLabel">
          <input
            type="checkbox"
            checked={config.allowSelfFills}
            disabled={!config.enableFillTrading}
            onChange={(event) => setConfig({ ...config, allowSelfFills: event.target.checked })}
          />
          Allow self-fills (test only)
        </label>
      </div>
      {warnings.length > 0 && (
        <ul className="warningList">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function WalletPanel(props: {
  wallet: WalletSnapshot | null;
  config: MarketMakerConfig;
  tokenLabels: TokenLabelMap;
  midPrice: number | null;
}) {
  const { wallet, config, tokenLabels, midPrice } = props;
  const inventory = calculateInventory(wallet, config, midPrice);
  const tokenBalances = Object.entries(wallet?.sdkBalances?.token ?? {});
  const configuredTokenBalance = getTokenBalance(wallet, config.baseToken);
  const configuredTokenMissing =
    wallet && config.baseToken !== 'Coin' && configuredTokenBalance === 0 && tokenBalances.length > 0;

  return (
    <section className="panel walletPanel">
      <div className="panelHeader">
        <h2>Wallet State</h2>
        <span className="badge">{wallet ? 'loaded' : 'not loaded'}</span>
      </div>
      <div className="stats">
        <div>
          <span>ML Balance</span>
          <strong>{wallet?.sdkBalances?.coin.toFixed(8) ?? '0.00000000'}</strong>
        </div>
        <div>
          <span>{formatTokenLabel(config.baseToken, tokenLabels)} Balance</span>
          <strong>{inventory.baseBalance.toFixed(8)}</strong>
        </div>
        <div>
          <span>Base Share</span>
          <strong>{(inventory.baseShare * 100).toFixed(2)}%</strong>
        </div>
        <div>
          <span>Local UTXOs</span>
          <strong>{wallet?.utxos.length ?? 0}</strong>
        </div>
      </div>
      <div className="addressBlock">
        <span>Receiving</span>
        <code>{wallet?.addresses.receiving.join(', ') || 'Initialize wallet'}</code>
      </div>
      <div className="addressBlock">
        <span>Token Balances</span>
        {tokenBalances.length > 0 ? (
          <div className="tokenList">
            {tokenBalances.map(([tokenId, balance]) => (
              <div key={tokenId}>
                <strong>{formatTokenLabel(tokenId, tokenLabels)}</strong>
                <span>{balance.toFixed(8)}</span>
                <code className="tokenIdHint">{shortenTokenId(tokenId)}</code>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No token balances returned by the SDK for the connected addresses.</p>
        )}
        {configuredTokenMissing && (
          <p className="warningText">
            Configured base token `{formatTokenLabel(config.baseToken, tokenLabels)}` did not match any SDK balance. Check the token id value.
          </p>
        )}
      </div>
    </section>
  );
}

export function OrderBookPanel(props: {
  book: SyntheticBook;
  orders: MarketOrder[];
  ownOrders: MarketOrder[];
  config: MarketMakerConfig;
  tokenLabels: TokenLabelMap;
  canConclude: boolean;
  onConclude: (orderId: string) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { book, orders, ownOrders, config, tokenLabels, canConclude, onConclude } = props;
  const activeOrders = orders.filter(isActiveOrder);
  const pairPath = getPairOrdersPath(config);
  const baseLabel = formatTokenLabel(config.baseToken, tokenLabels);
  const quoteLabel = formatTokenLabel(config.quoteToken, tokenLabels);

  return (
    <section className="panel orderBookPanel">
      <button
        className="panelHeader orderBookHeader"
        aria-expanded={detailsOpen}
        aria-controls="order-book-dialog"
        onClick={() => setDetailsOpen(true)}
      >
        <h2>Order Book</h2>
        <span className="badge">{activeOrders.length} active · details</span>
      </button>
      <div className="bookGrid compactBook">
        <OrderSide title="Bids" rows={book.bids.slice(0, 5)} baseLabel={baseLabel} quoteLabel={quoteLabel} />
        <OrderSide title="Asks" rows={book.asks.slice(0, 5)} baseLabel={baseLabel} quoteLabel={quoteLabel} />
      </div>

      {detailsOpen && (
        <div className="modalBackdrop" onMouseDown={() => setDetailsOpen(false)}>
          <div
            className="orderBookDialog"
            id="order-book-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-book-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="dialogHeader">
              <h2 id="order-book-title">Order Book</h2>
              <button className="secondary" onClick={() => setDetailsOpen(false)}>Close</button>
            </div>
            <div className="addressBlock">
              <span>Pair</span>
              <strong>{formatPairLabel(config, tokenLabels)}</strong>
              <code>{pairPath ?? 'Only token/Coin pairs are supported right now'}</code>
            </div>
            <div className="stats">
              <div>
                <span>Best Bid</span>
                <strong>{book.bestBid?.toFixed(8) ?? '-'}</strong>
              </div>
              <div>
                <span>Best Ask</span>
                <strong>{book.bestAsk?.toFixed(8) ?? '-'}</strong>
              </div>
              <div>
                <span>Mid</span>
                <strong>{book.midPrice?.toFixed(8) ?? '-'}</strong>
              </div>
              <div>
                <span>Own Orders</span>
                <strong>{ownOrders.length}</strong>
              </div>
            </div>
            <div className="bookGrid">
              <OrderSide
                title="Bids"
                rows={book.bids.slice(0, 8)}
                baseLabel={baseLabel}
                quoteLabel={quoteLabel}
                canConclude={canConclude}
                onConclude={onConclude}
              />
              <OrderSide
                title="Asks"
                rows={book.asks.slice(0, 8)}
                baseLabel={baseLabel}
                quoteLabel={quoteLabel}
                canConclude={canConclude}
                onConclude={onConclude}
              />
            </div>
            {!canConclude && (
              <p className="muted">Initialize the SDK and turn off Dry Run in Strategy config to conclude and broadcast an order.</p>
            )}
            {activeOrders.length === 0 && (
              <p className="muted">No active orders returned for this pair. Filled or zero-balance orders are ignored.</p>
            )}
            {book.midPrice === null && activeOrders.length > 0 && (
              <p className="warningText">
                Orders were fetched, but none matched the configured base/quote token ids for book construction.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function OrderSide(props: {
  title: string;
  rows: SyntheticBook['bids'];
  baseLabel: string;
  quoteLabel: string;
  canConclude?: boolean;
  onConclude?: (orderId: string) => void;
}) {
  return (
    <div>
      <h3>{props.title}</h3>
      <table>
        <thead>
          <tr>
            <th>Price ({props.quoteLabel}/{props.baseLabel})</th>
            <th>{props.baseLabel}</th>
            <th>{props.quoteLabel}</th>
            {props.onConclude && <th aria-label="Order action" />}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <tr key={row.orderId}>
              <td>{row.price.toFixed(8)}</td>
              <td>{row.baseAmount.toFixed(8)}</td>
              <td>{row.quoteAmount.toFixed(8)}</td>
              {props.onConclude && (
                <td className="orderAction">
                  <button
                    className="secondary"
                    disabled={!props.canConclude}
                    onClick={() => props.onConclude?.(row.orderId)}
                  >
                    Conclude
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StrategyPanel(props: {
  actions: StrategyAction[];
  tokenLabels: TokenLabelMap;
  onExecute: (action: StrategyAction) => void;
  dryRun: boolean;
}) {
  return (
    <section className="panel strategyPanel">
      <div className="panelHeader">
        <h2>Strategy Proposals</h2>
        <span className="badge">{props.actions.length} actions</span>
      </div>
      <div className="list">
        {props.actions.map((action) => (
          <div className="listItem" key={action.id}>
            <div>
              <strong>
                <span className="actionKind">{actionKindLabel(action)}</span> {actionToText(action, props.tokenLabels)}
              </strong>
              <p>{action.reason}</p>
            </div>
            <button onClick={() => props.onExecute(action)}>{props.dryRun ? 'Sign Preview' : 'Execute'}</button>
          </div>
        ))}
        {props.actions.length === 0 && <p className="muted">No strategy actions. Initialize and refresh market data.</p>}
      </div>
    </section>
  );
}

export function TransactionPanel(props: { records: ExecutionRecord[] }) {
  return (
    <section className="panel transactionPanel">
      <div className="panelHeader">
        <h2>Transactions</h2>
        <span className="badge">{props.records.length} tracked</span>
      </div>
      <div className="list">
        {props.records.map((record) => (
          <div className="listItem" key={record.id}>
            <div>
              <strong>{record.kind} - {record.status}</strong>
              <p>{record.description}</p>
              {record.txId && <code>{record.txId}</code>}
              {record.error && <p className="errorText">{record.error}</p>}
            </div>
          </div>
        ))}
        {props.records.length === 0 && <p className="muted">No local, pending, or broadcasted transactions yet.</p>}
      </div>
    </section>
  );
}

export function TradesPanel(props: { trades: TradeRecord[]; tokenLabels: TokenLabelMap; baseToken: string }) {
  const baseLabel = formatTokenLabel(props.baseToken, props.tokenLabels);

  return (
    <section className="panel tradesPanel">
      <div className="panelHeader">
        <h2>Trades (Fills)</h2>
        <span className="badge">{props.trades.length} recorded</span>
      </div>
      <p className="muted">
        Only fill-order transactions create on-chain trade volume and candles. Quote creation alone does not.
      </p>
      <div className="list">
        {props.trades.map((trade) => (
          <div className="listItem" key={trade.id}>
            <div>
              <strong>
                {trade.side.toUpperCase()} {trade.expectedBaseAmount.toFixed(8)} {baseLabel} @ {trade.price.toFixed(8)}
              </strong>
              <p>
                {trade.description} {trade.isOwnOrder ? '(self-fill)' : '(external)'}
              </p>
              <p className="muted">
                Paid/received leg: {trade.fillAmount.toFixed(8)} | status: {trade.status}
              </p>
              {trade.txId && <code>{trade.txId}</code>}
            </div>
          </div>
        ))}
        {props.trades.length === 0 && (
          <p className="muted">No fills yet. Enable fill trading and execute a FILL proposal with broadcast enabled.</p>
        )}
      </div>
    </section>
  );
}

export function BranchPanel(props: {
  branches: BranchInfo[];
  plan: BranchPreparationPlan;
  tokenLabels: TokenLabelMap;
  onExecute: (request: ExecutionRequest) => void;
}) {
  return (
    <section className="panel branchPanel">
      <div className="panelHeader">
        <h2>UTXO Branches</h2>
        <span className="badge">{props.branches.length} branches</span>
      </div>
      <div className="branchGrid">
        {props.branches.map((branch) => (
          <div className="branchCard" key={branch.outpoint}>
            <strong>{branch.id}</strong>
            <span>{formatTokenLabel(branch.asset, props.tokenLabels)}</span>
            <code>{branch.outpoint}</code>
            <div className="depthBar">
              <span style={{ width: `${Math.min(100, branch.depth * 3.33)}%` }} />
            </div>
            <p>Depth {branch.depth}, remaining {branch.remainingDepth}</p>
            {branch.warning && <p className="warningText">{branch.warning}</p>}
          </div>
        ))}
      </div>
      <div className="prepBox">
        <h3>Preparation Plan</h3>
        <p className="muted">
          Source asset: {formatTokenLabel(props.plan.sourceAsset, props.tokenLabels)} ({props.plan.perBranchAmount} per branch)
        </p>
        {props.plan.warnings.map((warning) => (
          <p className="warningText" key={warning}>{warning}</p>
        ))}
        <div className="list">
          {props.plan.actions.map((request) => (
            <div className="listItem" key={request.id}>
              <div>
                <strong>
                  Prepare branch with {props.plan.perBranchAmount}{' '}
                  {formatTokenLabel(props.plan.sourceAsset, props.tokenLabels)}
                </strong>
                <p>Destination: {props.plan.destination || 'wallet not initialized'}</p>
              </div>
              <button onClick={() => props.onExecute(request)}>Prepare</button>
            </div>
          ))}
          {props.plan.actions.length === 0 && <p className="muted">No branch preparation needed from the current local state.</p>}
        </div>
      </div>
    </section>
  );
}
