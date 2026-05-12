[**@mintlayer/sdk**](../README.md)

***

> **SpendPolicy** = `object`

Defined in: [wallet-state.ts:100](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L100)

Policy used when selecting spendable UTXOs from derived wallet state.

## Properties

### allowOwnChangeOnly?

> `optional` **allowOwnChangeOnly**: `boolean`

Defined in: [wallet-state.ts:104](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L104)

If unconfirmed spending is enabled, only allow wallet-created change. Defaults to `true`.

***

### allowUnconfirmed?

> `optional` **allowUnconfirmed**: `boolean`

Defined in: [wallet-state.ts:102](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L102)

Allow spending unconfirmed outputs. Defaults to `false`.

***

### maxUnconfirmedChainDepth?

> `optional` **maxUnconfirmedChainDepth**: `number`

Defined in: [wallet-state.ts:106](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/wallet-state.ts#L106)

Maximum unconfirmed parent chain depth allowed for spendable outputs.
