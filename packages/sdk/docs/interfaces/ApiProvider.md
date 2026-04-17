[**@mintlayer/sdk**](../README.md)

***

Defined in: [mintlayer-connect-sdk.ts:146](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L146)

## Methods

### broadcastTransaction()

> **broadcastTransaction**(`tx`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:158](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L158)

#### Parameters

##### tx

`string` | \{ `hex`: `string`; `json`: `any`; \}

#### Returns

`Promise`\<`any`\>

***

### getAccountUtxos()

> **getAccountUtxos**(`addresses`, `network`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:159](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L159)

#### Parameters

##### addresses

`string`[]

##### network

`number`

#### Returns

`Promise`\<`any`\>

***

### getAddress()

> **getAddress**(`addr`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:148](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L148)

#### Parameters

##### addr

`string`

#### Returns

`Promise`\<`any`\>

***

### getAddressDelegations()

> **getAddressDelegations**(`addr`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:149](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L149)

#### Parameters

##### addr

`string`

#### Returns

`Promise`\<`any`\>

***

### getAddressTokenAuthority()

> **getAddressTokenAuthority**(`addr`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:150](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L150)

#### Parameters

##### addr

`string`

#### Returns

`Promise`\<`any`\>

***

### getChainTip()

> **getChainTip**(): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:147](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L147)

#### Returns

`Promise`\<`any`\>

***

### getDelegation()

> **getDelegation**(`delegation_id`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:156](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L156)

#### Parameters

##### delegation\_id

`string`

#### Returns

`Promise`\<`any`\>

***

### getNft()

> **getNft**(`token_id`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:152](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L152)

#### Parameters

##### token\_id

`string`

#### Returns

`Promise`\<`any`\>

***

### getOrder()

> **getOrder**(`order_id`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:153](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L153)

#### Parameters

##### order\_id

`string`

#### Returns

`Promise`\<`any`\>

***

### getOrders()

> **getOrders**(): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:154](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L154)

#### Returns

`Promise`\<`any`\>

***

### getPoolDelegations()

> **getPoolDelegations**(`pool_id`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:155](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L155)

#### Parameters

##### pool\_id

`string`

#### Returns

`Promise`\<`any`\>

***

### getToken()

> **getToken**(`token_id`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:151](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L151)

#### Parameters

##### token\_id

`string`

#### Returns

`Promise`\<`any`\>

***

### getTransaction()

> **getTransaction**(`transaction_id`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:157](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L157)

#### Parameters

##### transaction\_id

`string`

#### Returns

`Promise`\<`any`\>
