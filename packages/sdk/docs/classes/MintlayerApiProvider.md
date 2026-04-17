[**@mintlayer/sdk**](../README.md)

***

Defined in: [mintlayer-connect-sdk.ts:162](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L162)

## Implements

- [`ApiProvider`](../interfaces/ApiProvider.md)

## Constructors

### Constructor

> **new MintlayerApiProvider**(`baseUrl`, `utxoUrl`): `MintlayerApiProvider`

Defined in: [mintlayer-connect-sdk.ts:166](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L166)

#### Parameters

##### baseUrl

`string`

##### utxoUrl

`string` = `'https://api.mintini.app'`

#### Returns

`MintlayerApiProvider`

## Methods

### broadcastTransaction()

> **broadcastTransaction**(`tx`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:226](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L226)

#### Parameters

##### tx

`string` | \{ `hex`: `string`; `json`: `any`; \}

#### Returns

`Promise`\<`any`\>

#### Implementation of

[`ApiProvider`](../interfaces/ApiProvider.md).[`broadcastTransaction`](../interfaces/ApiProvider.md#broadcasttransaction)

***

### getAccountUtxos()

> **getAccountUtxos**(`addresses`, `network`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:241](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L241)

#### Parameters

##### addresses

`string`[]

##### network

`number`

#### Returns

`Promise`\<`any`\>

#### Implementation of

[`ApiProvider`](../interfaces/ApiProvider.md).[`getAccountUtxos`](../interfaces/ApiProvider.md#getaccountutxos)

***

### getAddress()

> **getAddress**(`addr`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:186](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L186)

#### Parameters

##### addr

`string`

#### Returns

`Promise`\<`any`\>

#### Implementation of

[`ApiProvider`](../interfaces/ApiProvider.md).[`getAddress`](../interfaces/ApiProvider.md#getaddress)

***

### getAddressDelegations()

> **getAddressDelegations**(`addr`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:190](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L190)

#### Parameters

##### addr

`string`

#### Returns

`Promise`\<`any`\>

#### Implementation of

[`ApiProvider`](../interfaces/ApiProvider.md).[`getAddressDelegations`](../interfaces/ApiProvider.md#getaddressdelegations)

***

### getAddressTokenAuthority()

> **getAddressTokenAuthority**(`addr`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:194](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L194)

#### Parameters

##### addr

`string`

#### Returns

`Promise`\<`any`\>

#### Implementation of

[`ApiProvider`](../interfaces/ApiProvider.md).[`getAddressTokenAuthority`](../interfaces/ApiProvider.md#getaddresstokenauthority)

***

### getChainTip()

> **getChainTip**(): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:182](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L182)

#### Returns

`Promise`\<`any`\>

#### Implementation of

[`ApiProvider`](../interfaces/ApiProvider.md).[`getChainTip`](../interfaces/ApiProvider.md#getchaintip)

***

### getDelegation()

> **getDelegation**(`delegation_id`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:218](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L218)

#### Parameters

##### delegation\_id

`string`

#### Returns

`Promise`\<`any`\>

#### Implementation of

[`ApiProvider`](../interfaces/ApiProvider.md).[`getDelegation`](../interfaces/ApiProvider.md#getdelegation)

***

### getNft()

> **getNft**(`token_id`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:202](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L202)

#### Parameters

##### token\_id

`string`

#### Returns

`Promise`\<`any`\>

#### Implementation of

[`ApiProvider`](../interfaces/ApiProvider.md).[`getNft`](../interfaces/ApiProvider.md#getnft)

***

### getOrder()

> **getOrder**(`order_id`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:206](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L206)

#### Parameters

##### order\_id

`string`

#### Returns

`Promise`\<`any`\>

#### Implementation of

[`ApiProvider`](../interfaces/ApiProvider.md).[`getOrder`](../interfaces/ApiProvider.md#getorder)

***

### getOrders()

> **getOrders**(): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:210](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L210)

#### Returns

`Promise`\<`any`\>

#### Implementation of

[`ApiProvider`](../interfaces/ApiProvider.md).[`getOrders`](../interfaces/ApiProvider.md#getorders)

***

### getPoolDelegations()

> **getPoolDelegations**(`pool_id`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:214](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L214)

#### Parameters

##### pool\_id

`string`

#### Returns

`Promise`\<`any`\>

#### Implementation of

[`ApiProvider`](../interfaces/ApiProvider.md).[`getPoolDelegations`](../interfaces/ApiProvider.md#getpooldelegations)

***

### getToken()

> **getToken**(`token_id`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:198](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L198)

#### Parameters

##### token\_id

`string`

#### Returns

`Promise`\<`any`\>

#### Implementation of

[`ApiProvider`](../interfaces/ApiProvider.md).[`getToken`](../interfaces/ApiProvider.md#gettoken)

***

### getTransaction()

> **getTransaction**(`transaction_id`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:222](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L222)

#### Parameters

##### transaction\_id

`string`

#### Returns

`Promise`\<`any`\>

#### Implementation of

[`ApiProvider`](../interfaces/ApiProvider.md).[`getTransaction`](../interfaces/ApiProvider.md#gettransaction)
