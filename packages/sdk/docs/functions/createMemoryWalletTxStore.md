[**@mintlayer/sdk**](../README.md)

***

> **createMemoryWalletTxStore**(`initial?`): [`WalletTxStore`](../interfaces/WalletTxStore.md)

Defined in: [wallet-state.ts:334](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L334)

Create an in-memory `WalletTxStore`.

Useful for tests, examples, and simple bots that do not need persistence
across process restarts.

## Parameters

### initial?

#### cursors?

`Record`\<`string`, [`SyncCursor`](../type-aliases/SyncCursor.md)\>

#### transactions?

`Record`\<`string`, [`WalletTx`](../type-aliases/WalletTx.md)[]\>

## Returns

[`WalletTxStore`](../interfaces/WalletTxStore.md)
