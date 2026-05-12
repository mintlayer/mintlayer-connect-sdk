[**@mintlayer/sdk**](../README.md)

***

Defined in: [wallet-state.ts:382](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L382)

Headless wallet/account state derived from a wallet-relevant transaction log.

`WalletState` is storage-agnostic and network-agnostic. It keeps a cached
derived view of wallet-owned outputs, spent outputs, balances, and spendable
UTXOs. The caller owns syncing, persistence implementation, address ownership
rules, signing, and broadcasting.

## Methods

### applyLocalTx()

> **applyLocalTx**(`tx`): `Promise`\<[`WalletTx`](../type-aliases/WalletTx.md)\>

Defined in: [wallet-state.ts:513](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L513)

Apply a transaction created locally by the wallet/bot.

Local transactions reserve their inputs immediately as `spent_pending`, even
before broadcast succeeds, so the caller does not accidentally double-spend
them while broadcasting is in progress.

#### Parameters

##### tx

[`WalletTxInput`](../type-aliases/WalletTxInput.md)

#### Returns

`Promise`\<[`WalletTx`](../type-aliases/WalletTx.md)\>

***

### applyMempoolTx()

> **applyMempoolTx**(`tx`): `Promise`\<[`WalletTx`](../type-aliases/WalletTx.md)\>

Defined in: [wallet-state.ts:534](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L534)

Apply a transaction observed or accepted in mempool.

Use this after successful broadcast, or when a scanner reports an
unconfirmed wallet-relevant transaction.

#### Parameters

##### tx

[`WalletTxInput`](../type-aliases/WalletTxInput.md) | [`WalletTx`](../type-aliases/WalletTx.md)

#### Returns

`Promise`\<[`WalletTx`](../type-aliases/WalletTx.md)\>

***

### applySyncDiff()

> **applySyncDiff**(`diff`): `Promise`\<`void`\>

Defined in: [wallet-state.ts:586](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L586)

Apply scanner/network updates and advance the sync cursor.

This is the main integration point for a future wallet updater. It can add
wallet-relevant transactions, confirm local/mempool transactions, mark
conflicts, and mark outputs spent.

#### Parameters

##### diff

[`WalletSyncDiff`](../type-aliases/WalletSyncDiff.md)

#### Returns

`Promise`\<`void`\>

***

### ensureFresh()

> **ensureFresh**(): `Promise`\<`void`\>

Defined in: [wallet-state.ts:649](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L649)

Refresh derived state from the store.

This placeholder keeps the public API ready for later freshness checks
against a network tip.

#### Returns

`Promise`\<`void`\>

***

### getBalance()

> **getBalance**(`options`): [`WalletBalance`](../type-aliases/WalletBalance.md)

Defined in: [wallet-state.ts:479](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L479)

Return atom balances derived from visible wallet UTXOs.

#### Parameters

##### options

[`WalletUtxoFilter`](../type-aliases/WalletUtxoFilter.md) = `{}`

#### Returns

[`WalletBalance`](../type-aliases/WalletBalance.md)

***

### getSpendableUtxos()

> **getSpendableUtxos**(`policy`): [`WalletUtxo`](../type-aliases/WalletUtxo.md)[]

Defined in: [wallet-state.ts:452](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L452)

Return UTXOs that are safe to use under the provided spend policy.

The default policy only returns confirmed UTXOs.

#### Parameters

##### policy

[`SpendPolicy`](../type-aliases/SpendPolicy.md) = `{}`

#### Returns

[`WalletUtxo`](../type-aliases/WalletUtxo.md)[]

***

### getUtxos()

> **getUtxos**(`options`): [`WalletUtxo`](../type-aliases/WalletUtxo.md)[]

Defined in: [wallet-state.ts:421](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L421)

Return wallet-owned UTXOs from the current derived cache.

By default spent, conflicted, orphaned, and rejected outputs are hidden.

#### Parameters

##### options

[`WalletUtxoFilter`](../type-aliases/WalletUtxoFilter.md) = `{}`

#### Returns

[`WalletUtxo`](../type-aliases/WalletUtxo.md)[]

***

### markBroadcastRejected()

> **markBroadcastRejected**(`txId`, `options`): `Promise`\<`void`\>

Defined in: [wallet-state.ts:557](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L557)

Mark a local/mempool transaction as rejected by broadcast or policy.

Rejected transactions no longer reserve their inputs. Any local transaction
that depends on a rejected output is also rejected in derived state, allowing
callers to rebuild from valid base UTXOs.

#### Parameters

##### txId

`string`

##### options

###### reason?

`string`

###### rebuildRequired?

`boolean`

#### Returns

`Promise`\<`void`\>

***

### reload()

> **reload**(): `Promise`\<`void`\>

Defined in: [wallet-state.ts:411](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L411)

Reload all wallet transactions from the store and rebuild derived state.

Call this when another process or component may have updated the store.

#### Returns

`Promise`\<`void`\>

***

### rollbackTo()

> **rollbackTo**(`cursorOrHeight`): `Promise`\<`void`\>

Defined in: [wallet-state.ts:627](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L627)

Mark confirmed transactions above the provided height as orphaned.

Use this when the sync layer detects a chain rollback.

#### Parameters

##### cursorOrHeight

`number` | [`SyncCursor`](../type-aliases/SyncCursor.md)

#### Returns

`Promise`\<`void`\>

***

### create()

> `static` **create**(`options`): `Promise`\<`WalletState`\>

Defined in: [wallet-state.ts:400](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L400)

Load transactions from the store and build the initial derived cache.

#### Parameters

##### options

[`WalletStateOptions`](../type-aliases/WalletStateOptions.md)

#### Returns

`Promise`\<`WalletState`\>
