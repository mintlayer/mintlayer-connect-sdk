# Mintlayer Connect SDK — Development Guide

## Monorepo structure

```
packages/
  sdk/        ← main SDK package (@mintlayer/sdk) — primary work target
  react/      ← React wrapper (@mintlayer/react)
  wasm-lib/   ← pre-built WASM bindings (@mintlayer/wasm-lib, not edited here)
examples/
```

Package manager: **pnpm** (workspace). Lock file: `pnpm-lock.yaml`.

---

## Running tests (SDK)

```bash
cd packages/sdk

pnpm test              # run all tests once
pnpm test:watch        # watch mode
pnpm test -- --testPathPattern=transfer   # run a single suite
```

All 15 test suites must pass before merging. Tests run with Jest + ts-jest in a jsdom environment.

### How tests work

- `jest.config.js` maps `@mintlayer/wasm-lib` → `tests/__mocks__/@mintlayer/wasm-lib.ts`.
  That shim re-exports from `tests/__mocks__/pkg-node/` which is a real compiled Node.js WASM build,
  so tests exercise actual encoding logic — they're integration-style, not pure unit tests.
- `jest.setup.ts` replaces `fetch` with `jest-fetch-mock` so HTTP calls can be intercepted per-test.
- Snapshots live in `tests/__snapshots__/`. Regenerate with `pnpm test -- -u`.

When a new wasm-lib export is needed in tests, add it to the shim's re-export in
`tests/__mocks__/@mintlayer/wasm-lib.ts` (and update `pkg-node` if needed).

---

## Building

```bash
# from repo root
pnpm build:sdk     # builds packages/sdk only (tsc → dist/)
pnpm build         # builds all packages

# or from inside packages/sdk
pnpm build
```

Output lands in `packages/sdk/dist/`.

---

## SDK source layout (`packages/sdk/src/`)

| File | Purpose |
|------|---------|
| `mintlayer-connect-sdk.ts` | Main `Client` class — all public API, network calls, transaction orchestration |
| `transaction.ts` | `TransactionBuilder` — constructs raw transactions using wasm-lib primitives |
| `utils.ts` | Shared helpers (`mergeUint8Arrays`, `atomsToDecimal`, `stringToUint8Array`, …) |
| `types/transaction.ts` | All TypeScript types for UTXOs, inputs, outputs, amounts, etc. |
| `types/global.d.ts` | Global ambient declarations |

---

## Key architectural notes

- **WASM dependency**: All low-level encoding (inputs, outputs, signing, hashing) goes through `@mintlayer/wasm-lib`. Import from there; never re-implement encoding logic in TypeScript.
- **Atoms vs decimal**: The chain uses integer atoms internally. `atomsToDecimal()` converts for display; amounts passed to wasm functions must be atoms strings.
- **Networks**: `mainnet` / `testnet` — set at `Client.init()`. Network affects address encoding and fee logic.
- **Transaction flow**: `Client.buildTransaction()` → `TransactionBuilder` → wasm encode → signed tx bytes.

---

## Versioning & publishing

Version is in `packages/sdk/package.json`. Publishing is manual:

```bash
pnpm publish:sdk    # from repo root
```

---

## TypeScript config

- Target: `es2020`, module: `esnext`, strict mode on.
- `skipLibCheck: true` (wasm-lib types ship pre-built).
- Source in `src/`, output in `dist/`.
