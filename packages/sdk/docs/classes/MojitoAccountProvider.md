[**@mintlayer/sdk**](../README.md)

***

Defined in: [mintlayer-connect-sdk.ts:134](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L134)

## Implements

- [`AccountProvider`](../interfaces/AccountProvider.md)

## Constructors

### Constructor

> **new MojitoAccountProvider**(): `MojitoAccountProvider`

#### Returns

`MojitoAccountProvider`

## Methods

### connect()

> **connect**(): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:139](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L139)

Connects to the Mojito wallet extension.

#### Returns

`Promise`\<`any`\>

Promise that resolves to the connected addresses

#### Implementation of

[`AccountProvider`](../interfaces/AccountProvider.md).[`connect`](../interfaces/AccountProvider.md#connect)

***

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

Defined in: [mintlayer-connect-sdk.ts:163](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L163)

Disconnects from the Mojito wallet extension.

#### Returns

`Promise`\<`void`\>

Promise that resolves when disconnection is complete

#### Implementation of

[`AccountProvider`](../interfaces/AccountProvider.md).[`disconnect`](../interfaces/AccountProvider.md#disconnect)

***

### request()

> **request**(`method`, `params`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:177](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L177)

Makes a request to the Mojito wallet extension.

#### Parameters

##### method

`any`

The method to call

##### params

`any`

The parameters for the method

#### Returns

`Promise`\<`any`\>

Promise that resolves to the response from the wallet

#### Implementation of

[`AccountProvider`](../interfaces/AccountProvider.md).[`request`](../interfaces/AccountProvider.md#request)

***

### restore()

> **restore**(): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:151](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L151)

Restores the session from the Mojito wallet extension.

#### Returns

`Promise`\<`any`\>

Promise that resolves to the restored addresses

#### Implementation of

[`AccountProvider`](../interfaces/AccountProvider.md).[`restore`](../interfaces/AccountProvider.md#restore)
