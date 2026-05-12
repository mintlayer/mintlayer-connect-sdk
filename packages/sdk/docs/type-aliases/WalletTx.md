[**@mintlayer/sdk**](../README.md)

***

> **WalletTx** = `object`

Defined in: [wallet-state.ts:68](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L68)

Wallet-relevant transaction stored in the wallet transaction log.

The transaction log is the source of truth. UTXOs, balances, and spendability
are derived from these entries.

## Properties

### blockHash?

> `optional` **blockHash**: `string`

Defined in: [wallet-state.ts:75](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L75)

***

### blockHeight?

> `optional` **blockHeight**: `number`

Defined in: [wallet-state.ts:74](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L74)

***

### confirmation?

> `optional` **confirmation**: `number` \| `string`

Defined in: [wallet-state.ts:72](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L72)

***

### confirmations?

> `optional` **confirmations**: `number` \| `string`

Defined in: [wallet-state.ts:73](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L73)

***

### createdByWallet?

> `optional` **createdByWallet**: `boolean`

Defined in: [wallet-state.ts:77](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L77)

***

### rebuildRequired?

> `optional` **rebuildRequired**: `boolean`

Defined in: [wallet-state.ts:79](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L79)

***

### rejectionReason?

> `optional` **rejectionReason**: `string`

Defined in: [wallet-state.ts:78](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L78)

***

### state

> **state**: [`TxState`](TxState.md)

Defined in: [wallet-state.ts:71](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L71)

***

### timestamp?

> `optional` **timestamp**: `number`

Defined in: [wallet-state.ts:76](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L76)

***

### tx

> **tx**: [`WalletTxInput`](WalletTxInput.md)

Defined in: [wallet-state.ts:70](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L70)

***

### txId

> **txId**: `string`

Defined in: [wallet-state.ts:69](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L69)
