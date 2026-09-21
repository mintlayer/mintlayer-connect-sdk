# Market Maker Bot (UTXO Network)

## Overview

This project is an automated market-making bot designed for a UTXO-based blockchain network.  
Unlike account-based systems (e.g. Ethereum), this bot operates on a UTXO model, meaning liquidity management, order tracking, and state reconstruction are derived from unspent transaction outputs.

The bot relies on an existing blockchain SDK to interact with the network, construct transactions, and query on-chain state.

Its primary goal is to provide continuous liquidity on selected trading pairs by maintaining bid/ask orders and dynamically rebalancing inventory.

---

## Key Features

- Automated market making on UTXO-based DEX / orderbook
- Inventory-aware quoting (risk-adjusted spread)
- Real-time order book tracking via SDK
- UTXO-aware balance management (no account abstraction)
- Auto rebalancing between assets in a pair
- Configurable spread, depth, and order size
- Fail-safe order cancellation / replacement logic
- Stateless recovery from blockchain data (rebuild from UTXO set)

---

## Architecture

### 1. Chain Layer (SDK)
Responsible for all blockchain interactions:
- Fetching UTXOs
- Broadcasting transactions
- Querying order book / DEX state
- Address management

> All interactions go strictly through the provided SDK.

### 2. Strategy Layer
Implements market-making logic:
- Spread calculation
- Mid-price estimation
- Inventory exposure control
- Order placement / cancellation decisions

### 3. Execution Layer
Handles:
- Transaction construction via SDK
- Signing & broadcasting
- Retry logic
- Conflict resolution (UTXO double-spend handling)

---

## Requirements

- Node.js >= 20
- pnpm 10.x when using Node 20. pnpm 11 requires Node 22.13+ because it uses `node:sqlite`.
- Access to the UTXO network SDK
- Running API server
- Valid wallet keys for signing transactions

---

## Installation

From the repository root:

```bash
corepack prepare pnpm@10.15.0 --activate
pnpm install
pnpm build:sdk
pnpm --filter market-maker-bot dev
```

The app is a Vite React SPA and runs entirely in the browser. It consumes `@mintlayer/sdk` from the current pnpm workspace.

If your shell still resolves to pnpm 11 on Node 20, run the command through the pinned version:

```bash
npx pnpm@10.15.0 --filter market-maker-bot build
```

---

## Configuration

Create a `.env` file:

```env
VITE_NETWORK=testnet

VITE_API_URL=
VITE_BATCH_API_URL=
VITE_API_KEY=

VITE_WALLET_SEED=your-testnet-mnemonic

VITE_PAIR=HUG/ML
VITE_BASE_TOKEN=token_id_for_HUG
VITE_QUOTE_TOKEN=Coin
VITE_ORDER_SIZE=0.01
VITE_REFERENCE_PRICE=1
VITE_SPREAD_BPS=20
VITE_INVENTORY_TARGET=0.5
VITE_REBALANCE_THRESHOLD=0.1

VITE_MAX_POSITION=1.0
VITE_MAX_ORDERS=10
VITE_MAX_UNCONFIRMED_BRANCH_DEPTH=24
VITE_ALLOW_MAINNET_BROADCAST=false
VITE_SIMULATE_OWN_FILLS=false
VITE_SIMULATION_TRADE_TIMEOUT_MS=60000
```

Important: a `VITE_WALLET_SEED` value is bundled into browser code. Use this only for testnet/demo wallets. Production unattended bots should keep signing keys outside the browser.

Token configuration uses SDK currency ids. Set `VITE_BASE_TOKEN` / `VITE_QUOTE_TOKEN` to `Coin` for ML or to the actual Mintlayer token id for tokens. Tickers such as `HUG` are display labels only and will not match balances returned by `client.getBalances()`.

`VITE_API_URL` supplies balances and market data. `VITE_BATCH_API_URL` must point to the Mojito-compatible `/batch` service for the *same chain/indexer*, because it supplies the UTXOs used to fund transactions. When using a custom API server, set both; otherwise the bot can display a large balance from one source while assembling transactions from another source's small UTXO set.

---

## Usage

### Start bot

```bash
pnpm --filter market-maker-bot start
```

### Development mode

```bash
pnpm --filter market-maker-bot dev
```

---

## Market Making Logic

The bot continuously:

1. Fetches latest order book via SDK
2. Computes mid price
3. Calculates bid/ask spread
4. Evaluates current inventory (UTXO-based balances)
5. Places or updates orders accordingly
6. Cancels stale or unfilled orders
7. Rebalances assets if exposure exceeds threshold

### UTXO-specific behavior

- Balance is derived from UTXO aggregation, not account balance
- Orders consume UTXOs when executed
- Partial fills may result in fragmented UTXO sets
- The bot maintains a local UTXO index
- State reconciliation happens on every cycle

---

## Safety Mechanisms

- Duplicate UTXO detection before transaction broadcast
- Idempotent order placement
- Automatic recovery after crash
- Circuit breaker for abnormal spreads
- Max exposure limits per asset
- Browser transaction state is persisted locally and interpreted through SDK `WalletState`
- UTXO branch depth is visualized and capped below the 30-transaction mempool chain limit
- Mainnet auto-broadcast is disabled unless explicitly overridden

---

## Current Implementation Status

- React SPA scaffold, SDK initialization, and testnet mnemonic mode are implemented.
- Wallet, balance, local UTXO, orderbook, own order, strategy proposal, transaction queue, and UTXO branch panels are implemented.
- Strategy proposals run as dry-run by default. Signing a preview does not reserve UTXOs; only a broadcast attempt reserves its selected inputs while it is pending.
- The Liquidity Simulation panel can drive a testnet lifecycle of quote, self-fill, and conclude/requote. It is disabled by default and runs only while the loop is active, Dry run is off, and broadcasting is enabled.
- UTXO branch preparation is guarded and warns when multiple branch preparation transactions should be prepared one at a time.
- Production unattended signing should move out of the browser before mainnet use.

---

## Project Structure

```text
examples/market-maker-bot/
├── PLAN.md
├── PROGRESS.md
├── ARCHITECTURE.md
├── package.json
├── vite.config.ts
├── index.html
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   ├── hooks/
│   └── lib/
```

The bot logic is split into SDK client setup, strategy calculation, execution queue, wallet transaction state, and UTXO branch management so it can later be moved to a headless runner if needed.

Pair orders are fetched from `/order/pair/{tokenId}_TML` for token/ML markets instead of filtering the global `/order` list client-side.

---

## Disclaimer

Use at your own risk. Test on testnet first.

---

## License

MIT
