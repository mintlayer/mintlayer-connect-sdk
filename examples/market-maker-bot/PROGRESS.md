# Market Maker SPA Progress

## Current Status

- The Vite React TypeScript SPA implementation is complete for the approved first version.
- The app builds successfully with `pnpm --filter market-maker-bot build`.
- The repository now pins `pnpm@10.15.0` for Node 20 compatibility.
- Token balances are shown by SDK `token_id`; configured token values must use token ids rather than tickers.

## Completed

- Created persistent planning memory in `PLAN.md`.
- Created this progress log.
- Added `ARCHITECTURE.md` with the app state model and UTXO branch policy.
- Updated `Readme.md` with installation, env vars, usage, structure, and safety notes.
- Scaffolded a workspace Vite React app with `@mintlayer/sdk`.
- Implemented browser mnemonic SDK initialization with default testnet guardrails.
- Implemented localStorage-backed `WalletState` persistence and wallet snapshots.
- Implemented synthetic orderbook construction from SDK order lists.
- Implemented inventory-aware dry-run strategy proposals.
- Implemented a transaction execution queue for build, sign, local reserve, broadcast, and rejection tracking.
- Implemented UTXO branch visualization and guarded branch preparation requests.

## In Progress

- No implementation task is currently in progress.

## Next

- Manual test with a funded testnet mnemonic and broadcast disabled first.
- Fix the existing SDK TypeScript error in `packages/sdk/src/mintlayer-connect-sdk.ts` before relying on `pnpm build:sdk` as a green verification step.

## Verification Log

- `pnpm --filter market-maker-bot build` passed.
- `pnpm install` passed and repaired workspace dependency links.
- `pnpm build:sdk` failed in existing SDK code at `packages/sdk/src/mintlayer-connect-sdk.ts` where `params.token_id` is `string | undefined` but the HTLC build params require `string`.
- User-reported pnpm 11 failure on Node 20 is an environment/toolchain mismatch; pnpm 11 requires Node 22.13+ and imports `node:sqlite`.
- Token balance display was clarified: the SDK returns `sdkBalances.token` as `Record<token_id, number>`, so `VITE_BASE_TOKEN=HUG` will display zero unless `HUG` is the actual token id.
- Order book fetching now uses `/order/pair/{tokenId}_TML` for token/ML pairs and ignores zero-balance orders when building bids/asks.
