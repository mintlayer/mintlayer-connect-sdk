# Market Maker SPA Architecture

## Overview

The app is a browser-run market-maker control panel and execution surface. It uses React for visualization and control, while the SDK performs all wallet, transaction, signing, broadcast, and chain/order queries.

```mermaid
flowchart LR
  user["User"] --> ui["React SPA"]
  ui --> hook["useMarketMakerBot"]
  hook --> sdkClient["SDK Client"]
  hook --> strategy["Strategy Engine"]
  hook --> execution["Execution Queue"]
  execution --> walletState["WalletState"]
  execution --> branches["UTXO Branch Manager"]
  sdkClient --> api["Mintlayer API"]
  walletState --> graph["Chain Visualizer"]
  branches --> graph
```

## State Model

- SDK state: client instance, network, addresses, balances, available orders, and account orders.
- Strategy state: configured pair, spread, order size, max orders, inventory target, max position, and circuit breaker status.
- Execution state: draft, signed, broadcasted, mempool, confirmed, rejected, and rebuild-required transaction records.
- Wallet state: local transaction log persisted in the browser and interpreted by SDK `WalletState`.
- Branch state: branch labels over wallet UTXOs, unconfirmed depth, remaining depth budget, and reservation status.

## Transaction Lifecycle

1. A strategy or branch action creates an execution request.
2. The execution queue signs/builds the transaction through the SDK.
3. The transaction is inserted into `WalletState` as local so its inputs are reserved.
4. If broadcasting is enabled, `broadcastTx()` submits it and the local record moves to mempool.
5. If broadcast fails, the transaction is marked rejected and dependent local transactions require rebuild.
6. Chain polling reconciles visible orders, balances, and transaction state where the SDK exposes enough information.

## UTXO Branch Policy

- The app warns before any branch approaches the network mempool chain limit of 30.
- The default branch spend policy allows only wallet-created unconfirmed outputs and caps depth below 30.
- Branch preparation creates multiple self-transfer outputs from a selected funding asset and address.
- Strategy execution prefers the branch with the most remaining depth budget and no local reservation.

## Browser Storage

The first implementation uses a localStorage-backed `WalletTxStore` because it is dependency-free and easy to inspect. The storage adapter is isolated so it can be replaced with IndexedDB without changing wallet logic.
