[**@mintlayer/sdk**](../README.md)

***

> **WalletTxInput** = [`WalletTransactionJson`](WalletTransactionJson.md) \| \{ `JSONRepresentation`: [`WalletTransactionJson`](WalletTransactionJson.md); `transaction_id?`: `string`; \}

Defined in: [wallet-state.ts:55](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L55)

Transaction object accepted by `WalletState`.

You can pass either raw transaction JSON or an SDK `Transaction`-like object
containing `JSONRepresentation`.
