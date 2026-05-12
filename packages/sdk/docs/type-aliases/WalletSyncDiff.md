[**@mintlayer/sdk**](../README.md)

***

> **WalletSyncDiff** = `object`

Defined in: [wallet-state.ts:164](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L164)

Wallet-oriented sync update produced by a scanner/network layer.

This diff intentionally does not require raw blocks. A scanner can feed only
wallet-relevant transactions, spent outpoints, and state transitions.

## Properties

### confirmedTxIds?

> `optional` **confirmedTxIds**: `string`[]

Defined in: [wallet-state.ts:169](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L169)

***

### conflictedTxIds?

> `optional` **conflictedTxIds**: `string`[]

Defined in: [wallet-state.ts:170](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L170)

***

### fromCursor?

> `optional` **fromCursor**: [`SyncCursor`](SyncCursor.md)

Defined in: [wallet-state.ts:165](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L165)

***

### spent?

> `optional` **spent**: [`OutPoint`](OutPoint.md)[]

Defined in: [wallet-state.ts:168](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L168)

***

### toCursor

> **toCursor**: [`SyncCursor`](SyncCursor.md)

Defined in: [wallet-state.ts:166](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L166)

***

### transactions

> **transactions**: [`WalletTx`](WalletTx.md)[]

Defined in: [wallet-state.ts:167](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L167)
