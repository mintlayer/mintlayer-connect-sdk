# Market Maker Bot

A server-run Mintlayer market maker with a React control panel, SQLite persistence,
and real Node.js WASM signing through `@mintlayer/sdk`.

The server owns the wallet, strategy, transaction lifecycle and polling loop. The
browser displays server state and sends commands; closing a tab does not stop the bot.

## Run locally

Use Node.js 24 and the workspace's pinned pnpm 10.15.0. From the repository root:

```sh
pnpm install
pnpm build:sdk
cp examples/market-maker-bot/.env.example examples/market-maker-bot/.env
# Set BOT_WALLET_SEED and the actual BOT_BASE_TOKEN ID in that file.
pnpm --filter market-maker-bot build
pnpm --filter market-maker-bot start
```

Open http://127.0.0.1:3001. A fresh database starts **stopped, in Dry run**.
Sign in if `BOT_ADMIN_PASSWORD` is configured. Wait for synchronization, review
proposals, select an execution mode and press Start.

For development, `pnpm --filter market-maker-bot dev` builds the backend once,
starts it on port 3001, and starts Vite on port 5173 with an API/SSE proxy. Frontend
HMR works normally; restart this command after backend changes.

The server loads `.env` relative to its working directory. Workspace filter commands
run in `examples/market-maker-bot`. If launching the executable directly, use that
working directory or provide all settings through the process environment.

## Node WASM

The build uses the existing real CommonJS WASM build in
`packages/sdk/tests/__mocks__/pkg-node`, with the same no-op default initializer as
`packages/sdk/tests/__mocks__/@mintlayer/wasm-lib.ts`. There is no fake encoding.

`BOT_NODE_WASM_DIR=/path/to/pkg-node pnpm --filter market-maker-bot build` selects
an alternative compatible Node build. It must contain `package.json`,
`wasm_wrappers.js` and `wasm_wrappers_bg.wasm` and export the functions required by
the SDK. The build copies these files into `dist-server/wasm-node`; the deployed
executable does not read from the tests directory. Generated WASM bindings are not
modified. Keep this artifact beside the backend executable.

## Modes and controls

- **Observe:** synchronize and display state; do not build or send new transactions.
- **Dry run:** build/sign previews on the server without submitting or reserving funds.
- **Live:** execute proposals and recover submissions while running.
- **Start/Stop:** control automatic execution. Stop immediately fences in-flight
  builds before submission. Transactions already submitted remain tracked.
- **Sync now:** refresh chain/wallet state without starting automatic execution.
- Manual operations use the same serialized executor and risk limits as the loop.

Strategy settings are edited as a draft and applied with a version check. Changing
assets requires stopping and settling open orders. The server's network, mnemonic,
credentials and mainnet broadcast policy cannot be changed through the UI.

The ordinary strategy maintains bid/ask levels, skews quotes toward the configured
inventory target, fills external orders when rebalancing is enabled, and concludes
filled/excess or displaced orders before replacing them. Limits include worst-case
base acquisition by open bids, pending transactions, branch depth and fee budgets.
Quote and fill amounts are computed in atoms with per-token decimals. Self-fill
simulation is an explicit testnet-only option with a settlement delay. Different
orders can trade consecutively using accepted unconfirmed WalletState change;
settling one order does not block fills of other orders.
For a creation observed in mempool, exact initial order data from its durable
transaction also permits a fill before the indexer publishes the order endpoint.

## Persistence and recovery

One local SQLite file stores SDK `WalletTx` records, sync cursors, trading settings,
commands, signed transaction attempts, reservations, owned orders and events.
`WalletState` remains the SDK implementation that derives UTXOs from transactions;
there is no separate UTXO database model.

SQLite uses WAL, FULL synchronous commits and short transactions. A separate
SQLite owner-lock file prevents two executors from running against the same DB.
The OS releases that lock after exit or SIGKILL. Store DB files on a local
persistent filesystem. Do not remove DB/WAL files to recover an uncertain tx.

Signed bytes and reservations are committed before sending. A timeout or a failed
result write leaves an `unknown`/`submitting` attempt with its inputs reserved.
Recovery checks the transaction ID and resends **the same signed bytes**, with
bounded backoff, rather than building a second order. Recovery sends only while
Start is active and execution mode is Live; other modes continue observing.

On restart `BOT_AUTO_RESUME=false` keeps automatic execution stopped. With
`BOT_AUTO_RESUME=true`, a previously running mode resumes after successful sync.
A changed mainnet policy still blocks live broadcasting.

Without `BOT_RPC_URL`, the bot can submit through an indexer with POST routes enabled.
Own change is usable when that indexer also exposes the transaction in its mempool;
otherwise only confirmed funding is available. With RPC, the bot also verifies the
node/indexer chain and lag and checks the normal/orphan mempool directly.
Missing indexer data alone never releases a reservation. A different canonical
transaction spending the same input invalidates dependent attempts. For order
commands, bounded and checkpointed block scans distinguish an actual competing
conclusion/insufficient remaining balance from our own mined transaction while
the transaction endpoint lags. Node validation reasons are retained with secrets
and reflected signed bytes removed.
Unsupported spend-status endpoints leave the attempt unresolved, visible in UI;
the bot will not guess that funds are free. Transiently dropped transactions are
rebroadcast from their original bytes.

The first sync scans address history in batches to recover prior own orders,
including filled orders no longer visible in the market listing. Prices and the
displayed book use the active aggregated book, with exact ratios and our own
liquidity excluded from the reference price. External fill candidates use at most
three 100-order pages; they are an opportunistic subset, not the entire market.
An incomplete/truncated active book pauses quoting. See the indexer's
[book contract](https://docs.mintlayer.org/docs/api/endpoints/order/).

Reorg recovery finds a verified common ancestor, persists its progress and
rechecks only affected confirmations. Bootstrap continues across ticks/restarts;
cancelled/rejected creations are not resurrected. Recovered fill/conclude chains
keep their order locked until all pending commands settle.

The Transactions panel's reconcile/abandon action can cancel never-submitted
bytes or finish an attempt resolved by canonical evidence. It refuses to release
an uncertain submission merely because it is old or missing from an endpoint.
Ordinary and simulation modes skip proposals in retry backoff. Exhausting the
rolling fee budget pauses submissions while synchronization stays fresh, and
retries resume automatically when the budget becomes available.

Diagnostic events/finished commands have configurable retention; transaction
history and unresolved attempts do not expire. UI history uses bounded pages.
SQLite WAL checkpoints run periodically; log files should be rotated by the process
supervisor. A synthetic 20,000-transaction replay test measures the existing SDK
model before considering any performance changes.

## Configuration

See `.env.example` for all defaults. Important server settings:

| Setting | Purpose |
| --- | --- |
| `BOT_WALLET_SEED` | Mnemonic available only to the server |
| `BOT_API_URL`, `BOT_API_KEY` | Indexer; address UTXOs are queried from this same source |
| `BOT_RPC_URL`, `BOT_RPC_USER`, `BOT_RPC_PASSWORD` | Optional node RPC for mempool and submission |
| `BOT_DB_PATH` | Persistent local SQLite file; use separate files for different wallets/networks |
| `BOT_ADMIN_PASSWORD` | UI password; required when binding beyond loopback |
| `BOT_COOKIE_SECURE` | Set true when serving UI over HTTPS |
| `BOT_AUTO_RESUME` | Resume the saved running state after restart; default false |
| `BOT_DAILY_FEE_LIMIT`, `BOT_MAX_TX_FEE` | Rolling 24-hour and per-tx fee caps in coin units |
| `BOT_MAX_PENDING` | Cap on unresolved/unconfirmed submissions |
| `BOT_EVENT_RETENTION_DAYS` | Diagnostic history retention; default 14 days |

Trading parameters initialize a new DB. Later UI edits are persisted in SQLite.
Operational settings and secrets are read on every server start. Legacy `VITE_*`
trading/seed/API variables are accepted **only by the backend** for migration;
rename them to `BOT_*`. Vite exposes only `PUBLIC_*`, and the frontend never
imports the signing client or network provider. `VITE_BATCH_API_URL` is no longer
needed: direct address UTXO requests use the configured indexer.

Before moving an existing wallet, stop the old browser loop and wait for in-flight
operations to finish. Avoid running both implementations with the same wallet.
The server rebuilds confirmed history from the network; it does not blindly import
old browser reservations or broadcast unsigned/localStorage records.

## Logs and health

Fastify/Pino writes structured runtime/request logs to stdout. The SQLite event
journal records state changes and command errors. Signed bytes, seeds and
credentials are not included in public API state; signing previews stay server-side.
SDK initialization also emits its existing startup diagnostics.

- `GET /health/live`: process liveness.
- `GET /health/ready`: successful initialization and fresh sync; 503 otherwise.
- UI: last sync/cycle, data freshness, execution mode, config version, own orders,
  pending/unknown/confirmed attempts, events and paginated history.

For a local long-running process, `pnpm --filter market-maker-bot start:service`
restarts the server after a crash with bounded backoff and keeps runtime logs in
`data/runtime.log` (10 MiB per file, three rotated files). It resumes the persisted
running flag; a UI Stop remains stopped after restart. Run it independently of
your terminal session when leaving it unattended. Stop leaves on-chain orders open;
use their Conclude action to settle them. The host still needs to remain awake.

## Backup and restore

While the server is running:

```sh
pnpm --filter market-maker-bot backup /absolute/path/to/backup.sqlite
```

This uses SQLite Online Backup and works with active WAL. Keep the backup private:
it contains signed transaction bytes and trading history. The seed is not stored
in the database. To restore, stop the server, choose a new `BOT_DB_PATH` pointing
to the backup, then restart and inspect reconciliation before enabling Live.

## Docker

Build from the repository root with the example's Dockerfile:

```sh
docker build -f examples/market-maker-bot/Dockerfile -t mintlayer-market-maker .
docker run --env-file examples/market-maker-bot/.env \
  -e BOT_HOST=0.0.0.0 -e BOT_ADMIN_PASSWORD=replace-with-a-long-password \
  -e BOT_DB_PATH=/data/bot.sqlite \
  -v mintlayer-market-maker:/data -p 127.0.0.1:3001:3001 \
  --restart unless-stopped --log-opt max-size=10m --log-opt max-file=3 \
  mintlayer-market-maker
```

For remote access put the UI behind HTTPS and set `BOT_COOKIE_SECURE=true`.
The repository `.dockerignore` excludes environment files, wallet data and builds.

## Verification

```sh
pnpm --filter market-maker-bot test
pnpm --filter market-maker-bot test:smoke # after build; uses an isolated fake chain
pnpm --filter @mintlayer/sdk exec jest --runInBand
pnpm build:sdk
pnpm --filter market-maker-bot build
```

Server tests use real SQLite and Node WASM. They cover crash/timeout recovery,
atomic reservations, preview isolation, control races, API authentication, full
pagination, owned-order discovery/settlement, reorg, backup, branch selection,
precise amounts and a 20,000-transaction journal. These tests make no live broadcasts.
A 24–72 hour funded testnet run remains a separate operational acceptance step;
local recovery tests do not establish that it has been completed.

The GitHub Actions bot job runs the build, backend suite and production smoke on
Node 22. External price anchoring/price bands and long-history incremental scanner
optimization remain separate work before treating this example as a mainnet bot.
