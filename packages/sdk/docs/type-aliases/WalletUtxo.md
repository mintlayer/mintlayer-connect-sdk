[**@mintlayer/sdk**](../README.md)

***

> **WalletUtxo** = `UtxoEntry` & `object`

Defined in: [wallet-state.ts:124](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L124)

Wallet-owned UTXO with derived state metadata.

## Type declaration

### blockHash?

> `optional` **blockHash**: `string`

### blockHeight?

> `optional` **blockHeight**: `number`

### createdByWallet?

> `optional` **createdByWallet**: `boolean`

### outputIndex

> **outputIndex**: `number`

### status

> **status**: [`WalletUtxoStatus`](WalletUtxoStatus.md)

### txId

> **txId**: `string`

### txState

> **txState**: [`TxState`](TxState.md)

### unconfirmedChainDepth

> **unconfirmedChainDepth**: `number`
