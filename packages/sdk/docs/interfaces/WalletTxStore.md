[**@mintlayer/sdk**](../README.md)

***

Defined in: [wallet-state.ts:89](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L89)

Storage adapter used by `WalletState`.

Implement this interface with IndexedDB, SQLite, Postgres, files, or any other
storage engine. `WalletState` intentionally does not perform network or disk
access except through this adapter.

## Methods

### getCursor()

> **getCursor**(`accountId`): `Promise`\<`null` \| [`SyncCursor`](../type-aliases/SyncCursor.md)\>

Defined in: [wallet-state.ts:93](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L93)

#### Parameters

##### accountId

`string`

#### Returns

`Promise`\<`null` \| [`SyncCursor`](../type-aliases/SyncCursor.md)\>

***

### getTransactions()

> **getTransactions**(`accountId`): `Promise`\<[`WalletTx`](../type-aliases/WalletTx.md)[]\>

Defined in: [wallet-state.ts:90](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L90)

#### Parameters

##### accountId

`string`

#### Returns

`Promise`\<[`WalletTx`](../type-aliases/WalletTx.md)[]\>

***

### putTransaction()

> **putTransaction**(`accountId`, `tx`): `Promise`\<`void`\>

Defined in: [wallet-state.ts:91](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L91)

#### Parameters

##### accountId

`string`

##### tx

[`WalletTx`](../type-aliases/WalletTx.md)

#### Returns

`Promise`\<`void`\>

***

### removeTransaction()?

> `optional` **removeTransaction**(`accountId`, `txId`): `Promise`\<`void`\>

Defined in: [wallet-state.ts:92](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L92)

#### Parameters

##### accountId

`string`

##### txId

`string`

#### Returns

`Promise`\<`void`\>

***

### setCursor()

> **setCursor**(`accountId`, `cursor`): `Promise`\<`void`\>

Defined in: [wallet-state.ts:94](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L94)

#### Parameters

##### accountId

`string`

##### cursor

[`SyncCursor`](../type-aliases/SyncCursor.md)

#### Returns

`Promise`\<`void`\>
