[**@mintlayer/sdk**](../README.md)

***

> **WalletTransactionJson** = `TransactionJSONRepresentation` \| \{ `fee?`: `unknown`; `id`: `string`; `inputs`: `unknown`[]; `outputs`: `unknown`[]; \}

Defined in: [wallet-state.ts:40](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L40)

Transaction JSON accepted by `WalletState`.

This accepts the SDK transaction JSON representation, plus a looser structural
shape for scanner/bot integrations that only need inputs, outputs, and id.
