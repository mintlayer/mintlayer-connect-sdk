# Market Maker SPA Implementation Plan

This file is the workspace handoff copy of the approved plan. Keep it current when the implementation changes so another agent can continue without reading the chat.

## Scope

- Build `examples/market-maker-bot` as a Vite React TypeScript SPA.
- Use `@mintlayer/sdk` from the pnpm workspace.
- Run the first bot implementation in the browser with `MnemonicAccountProvider`.
- Treat browser mnemonics as testnet/demo-only and keep mainnet broadcasting disabled by default.
- Visualize wallet state, orders, proposed strategy actions, pending transactions, broadcasted transactions, rejected transactions, and UTXO transaction chains.
- Include a guarded special-purpose UTXO preparation workflow so order transactions can be spread across branches instead of extending one mempool chain toward the 30-transaction limit.

## SDK Constraints

- Use existing order methods: `getAvailableOrders()`, `getAccountOrders()`, `createOrder()`, `fillOrder()`, `concludeOrder()`, and `broadcastTx()`.
- The SDK exposes a flat order list, so the app builds a synthetic book for the configured pair.
- Use exported wallet-state primitives from `@mintlayer/sdk` for local transaction lifecycle, balance derivation, and unconfirmed chain depth.
- The browser app can only recover state from local transaction persistence plus chain polling available through the SDK.

## Milestones

1. Scaffold the Vite React app and workspace package.
2. Implement SDK mnemonic initialization and testnet guardrails.
3. Add browser transaction persistence and wallet-state derived views.
4. Implement pair order polling and synthetic book visualization.
5. Implement dry-run strategy proposals.
6. Add guarded transaction execution and broadcast tracking.
7. Add UTXO branch preparation and branch-aware transaction selection.
8. Run builds/tests and update `PROGRESS.md`.

## Safety Defaults

- `VITE_NETWORK=testnet`.
- Broadcasts are disabled until explicitly enabled in the UI.
- Mainnet auto-broadcast requires an explicit environment override.
- Max unconfirmed branch depth defaults below 30 to preserve recovery room.
- Mnemonics are never logged or persisted by the app.
