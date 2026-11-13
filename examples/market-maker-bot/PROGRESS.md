# Server migration progress

Updated: 2026-11-12.

## Implemented

- One TypeScript/Node backend with Fastify, a serialized BotRunner and SQLite WAL.
- Existing SDK WalletState retained. SQLite WalletTxStore replaces localStorage;
  transactions still derive the wallet's UTXO state.
- Existing real CommonJS Node WASM build, adapted like the SDK Jest shim and
  copied beside the backend executable. No generated WASM bindings changed.
- Server-only mnemonic/signing/API credentials; the browser bundle contains no
  account provider, WASM or injected VITE seed. Legacy VITE settings are read only
  on the server; new configuration uses BOT_*.
- Durable, versioned config, idempotent commands, immediate Stop/mode downgrade
  fencing, normal automatic market making and separate testnet self-fill simulation.
- SQLite owner lock, atomic input/order reservations, signed bytes before submit,
  explicit first-submit rejection vs unknown outcome, exact-byte retries and
  confirmation/conflict/reorg reconciliation.
- Full pair pagination, address-history bootstrap with persisted batch progress,
  registry of own orders including fully filled/unsettled orders, and durable
  settlement flags that historical API pages cannot reopen.
- Mempool-aware unconfirmed change with same-chain/node-lag checks. Without RPC,
  spending is restricted to confirmed outputs. Shallow branches are preferred.
- Atom-based quoting/fills, token metadata decimals, worst-case open-bid exposure,
  pending/depth limits and server-configured rolling/per-transaction fee caps.
- React panels now consume HTTP snapshots, commands and SSE invalidation. Added
  own-order settlement, server event history, paginated transaction/event browsing,
  login and config drafts with explicit Apply.
- JSON runtime/request logs plus durable business events, freshness/health checks,
  SQLite Online Backup CLI, persistent data directory and Docker run instructions.
- Targeted SDK corrections: exact decimal-string amounts and create-order inputs,
  BigInt conclude proceeds, TokenV1 decimals in fill, order-independent chain depth,
  reorg state taking precedence over old confirmation metadata, and block-reward source preservation during input encoding/decoding.

## Verification completed

- SDK: 20 Jest suites, 116 tests, 17 snapshots passed; SDK TypeScript build passed.
- Bot: 37 server integration tests passed with real SQLite and Node WASM, without
  DOM/jsdom and without live broadcasts.
- Bot frontend/server TypeScript checks and production build passed.
- Frozen workspace lockfile install validated with pinned pnpm 10.15.0.
- Production smoke: launched real backend/static UI against a temporary local fake
  indexer; checked auth, readiness, assets, dry-run Start/Stop and frontend artifact
  isolation. All temporary servers were shut down.
- Browser check of production UI: login, Start, config Apply/version increment and
  Stop behaved as expected; the server remained authoritative.
- Real Node WASM create → self-fill → conclude lifecycle tested against controlled
  chain observations; a running mode downgrade prevented further submissions.
- Recovery tests include lost response, write failure after network acceptance,
  interrupted unsigned intent, dependency invalidation, preview isolation, reorg,
  same-ID create retry, old queued Start/Live fencing, owner-lock release on SIGKILL,
  backup restore and bootstrap progress.
- A synthetic 20,000-transaction SQLite in-memory journal restored/replayed in
  roughly 80–100 ms per pass locally. This measures the existing SDK derivation;
  it is not a long-duration memory or on-disk durability benchmark.

## Operational acceptance remaining

- A funded 24–72 hour testnet run against the actual target indexer/node has not
  been performed. Validate its API/RPC capabilities, fees, rate limits, long-run
  memory/WAL growth and recovery under real outages before unattended live use.
- The Dockerfile/run recipe is supplied but no Docker image build was run here.
- The existing browser wallet state is not imported as trusted reservations.
  Stop the old bot before using its wallet on the server; bootstrap uses chain data.
- Some indexers do not expose reliable input spend metadata. Such uncertain
  transactions retain reservations and remain visible; missing data is never
  treated as permission to reuse their inputs.
- Durable financial history intentionally grows on disk. Event/command retention,
  log rotation and backups are configured separately; deleting the database is
  not a transaction recovery mechanism.

## Live testnet check — 2026-11-12

- Started the production server with the operator's updated `.env`. Live wallet
  synchronization, token metadata and full pair pagination succeeded.
- Verified the create-order guard against the existing 65 active orders and a
  configured MAX_ORDERS=10. A signed preview succeeded without submission.
- After explicit operator approval, temporarily raised the cap to 66 and submitted
  exactly one ask: give 0.01 VESPA, ask 0.00522001311 TML, fee 0.443 TML.
- The transaction was accepted, observed in the mempool, then mined. The order
  endpoint returned its exact balances and the derived order ID matched the chain.
- The backend reconciled the transaction to confirmed and released both input
  reservations. The wallet now has 66 active orders; no additional order was made.
- Restored MAX_ORDERS=10 immediately after submission (config version 3). Automatic
  execution stayed stopped throughout. The server remains available on localhost.
- The detailed run record is in ignored `data/one-test-order.json`; it contains
  transaction/order identifiers and verification results, never keys or signed bytes.
- This verifies a live create/confirm cycle; it does not replace the remaining
  24–72 hour operational acceptance run or live node-RPC testing.

## Continuous testnet run — 2026-11-12

- Operator authorized continued live trading including own fills. Enabled both
  testnet self-fill simulation and own-fill eligibility; retained MAX_ORDERS=10,
  the existing fee budgets and UTXO safety limits.
- A live conclude exposed an SDK bug: a fully filled token order generated an
  invalid zero-token remainder output. Omitted empty token payouts, including
  zero ask proceeds when an order has never traded.
- The public indexer wraps this intrinsic node validation error in HTTP 500.
  Recognize that specific invalid-bytes rejection even after an earlier timeout,
  release its reservations and retain ambiguous HTTP failures for reconciliation.
  Recovered the previously reserved fee input without deleting wallet history.
- Observed an actual own fill and its follow-up conclude both confirmed, followed
  by submission of the next own fill. The loop remains running in Live mode.
- Added `start:service`: bounded crash-restart backoff, persisted running-state
  resume and 10 MiB logs with three rotated files. Started it independently of the
  terminal. A separate isolated smoke run verified crash restart, resume, rotation
  and graceful shutdown. Host shutdown/sleep still interrupts the run.
- Validation: 20 SDK suites / 118 tests / 17 snapshots, 37 backend tests, SDK and
  bot builds, production HTTP smoke and diff checks passed. A full-day soak has
  not yet completed.

## Self-fill throughput — 2026-11-12

- Removed the simulation-wide wait for all pending transactions. Different orders
  now consume accepted, unconfirmed WalletState change; order reservations still
  prevent overlapping commands on the same order. Waiting on one settlement timer
  no longer blocks other orders. Uncertain submissions, pending and depth limits
  remain enforced by the runner and spendable-UTXO policy.
- Applied a five-second interval to the active testnet run and reloaded through
  the supervisor. Observed four simultaneously broadcasted self-fills whose fee
  inputs form a parent/child chain of depth four, before block confirmation.
- Added a real-WASM regression proving two fills of different orders spend
  unconfirmed change without a block, respect the pending cap and survive restart.
  All 38 backend tests, server build and diff checks passed.

## Recovery from indexer order lag — 2026-11-12

- The live run reached 159 confirmed transactions (67 fills, 90 concludes and two
  creations), then stopped producing transactions: five pre-confirmation order
  endpoint 404s exhausted a permanent build retry cap. The order later existed,
  but its saved rejected intent could never rebuild. No submitted tx was pending.
- Removed the lifetime retry ceiling; failures retain bounded backoff. Simulation
  skips cooling-down candidates so a transient error on one order does not stop
  work on other orders. This also allows rolling fee-budget failures to recover.
- For independently observed mempool creations, the chain adapter can supply exact
  initial order data from the durable create transaction when `/order` returns 404.
  This fallback is refreshed each sync and removed if acceptance is no longer
  observable; arbitrary missing orders never receive fabricated state.
- Reloaded the supervised live process. The blocked fill rebuilt and confirmed;
  the next create also confirmed, followed by further fill/create submissions.
- All 40 backend tests passed, including more-than-five-failure recovery and real
  WASM create-to-fill without an indexed order, restart and loss of visibility.
  Server build and diff checks passed.

## Canonical conflict recovery — 2026-11-12

- A live status check exposed a falsely conflicted create that was actually mined.
  Its spent-input metadata had been treated as proof of a competing spend during
  transaction-endpoint lag. WalletState then propagated the stale rejection through
  confirmed descendants, hiding their subsequent unconfirmed change.
- Conflict detection now identifies a different transaction spending the exact
  outpoint in a verified canonical block. A spent-height flag alone is insufficient.
- Address-history sync rechecks locally rejected/conflicted transactions, restores
  canonical confirmations and attempt/order state, and renews reservations atomically
  if a previously invalidated transaction is observed back in mempool.
- WalletState no longer propagates an ancestor's local rejection through a confirmed
  descendant. Such a confirmation establishes a valid funding boundary.
- Reloaded through the supervisor. The false conflict recovered to confirmed,
  available TML recovered from 0.66 to approximately 99.75 and live fills/settlements
  resumed. At the check: 176 confirmed attempts and two broadcasted attempts.
- Validation: 42 backend tests, all 20 SDK suites / 119 tests / 17 snapshots,
  SDK/server builds and diff checks passed.

## Review follow-up and budget pause — 2026-11-12

- The next apparent stall was the configured rolling daily fee budget, not an
  unresolved submission: 250 transactions were confirmed (98 fills, 120 concludes,
  32 creations). With operator approval raised the testnet budget from 100 to 150
  TML; retained the 2 TML transaction cap and all spend/depth/pending limits.
- Review findings 1–5: replaced full pair-history polling with the active aggregated
  book plus at most 300 external fill candidates; added durable fork search/replay,
  targeted rollback and shared recovered order fences; added canonical account-race
  recovery and guarded operator reconciliation; retained sanitized node reasons;
  configured a Node 22 bot build/test/smoke job in CI.
- Also fixed ordinary-mode retry starvation (finding 7) and localhost Host-header
  validation (finding 9). Budget exhaustion is now an explicit submission pause,
  while synchronization remains fresh instead of reporting a broken chain sync.
- Active-book side semantics and rational atom prices checked against the actual
  public indexer, local core implementation and official API contract. Own liquidity
  is excluded from reference pricing; UI shows aggregate levels and can still show
  individual owned orders. Incomplete active-book responses fail closed.
- Canonical account recovery searches a bounded number of blocks per pass with a
  persisted cursor. It finds our mined candidate before concluding that another
  canonical order command invalidated it; neither a 404 nor a timeout frees inputs.
- Validation: all 54 backend tests, all 20 SDK suites / 119 tests / 17 snapshots,
  production build and HTTP smoke passed. Added regressions for the three reorg
  cases, restart during >200-tx replay, shared recovered locks, ordinary-mode progress,
  budget pause/resume, active-book scaling/precision, node diagnostics, DNS rebinding,
  account races and guarded abandonment. CI is configured; no hosted run claimed.
- Backed up live SQLite to ignored `data/pre-review-recovery.sqlite`, then reloaded
  the supervisor. The live process resumed creating and self-filling orders under
  the approved budget; snapshots are fresh with no pause.
- UTXO inventory check: 558 available (384 token, 174 coin), mostly small fill/conclude
  payouts. The bot had consumed 291 unique inputs across its confirmed transactions.
  The SDK still prefers large inputs; no unsolicited consolidation was broadcast.
- Remaining before a mainnet deployment: external price anchoring/bands (finding 6),
  incremental long-history scanning/storage performance (finding 8), SDK release/PR
  separation and the remaining operational soak. These are not marked complete by
  passing local recovery regressions.
