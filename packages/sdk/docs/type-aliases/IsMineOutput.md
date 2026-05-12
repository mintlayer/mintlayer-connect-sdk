[**@mintlayer/sdk**](../README.md)

***

> **IsMineOutput** = (`output`, `context`) => `boolean`

Defined in: [wallet-state.ts:180](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L180)

Callback used to decide whether a transaction output belongs to this wallet.

This keeps `WalletState` account-model agnostic. A simple bot can check a set
of known receiving/change addresses; a full wallet can use derived addresses,
xpub metadata, HTLC keys, or other ownership rules.

## Parameters

### output

`unknown`

### context

#### outputIndex

`number`

#### tx

[`WalletTx`](WalletTx.md)

#### txJson

[`WalletTransactionJson`](WalletTransactionJson.md)

#### utxo

`UtxoEntry`

## Returns

`boolean`
