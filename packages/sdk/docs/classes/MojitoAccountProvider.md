[**@mintlayer/sdk**](../README.md)

***

Defined in: [mintlayer-connect-sdk.ts:261](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L261)

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

Defined in: [mintlayer-connect-sdk.ts:266](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L266)

Connects to the Mojito wallet extension.

#### Returns

`Promise`\<`any`\>

Promise that resolves to the connected addresses

#### Implementation of

[`AccountProvider`](../interfaces/AccountProvider.md).[`connect`](../interfaces/AccountProvider.md#connect)

***

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

Defined in: [mintlayer-connect-sdk.ts:290](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L290)

Disconnects from the Mojito wallet extension.

#### Returns

`Promise`\<`void`\>

Promise that resolves when disconnection is complete

#### Implementation of

[`AccountProvider`](../interfaces/AccountProvider.md).[`disconnect`](../interfaces/AccountProvider.md#disconnect)

***

### request()

> **request**(`method`, `params`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:304](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L304)

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

Defined in: [mintlayer-connect-sdk.ts:278](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L278)

Restores the session from the Mojito wallet extension.

#### Returns

`Promise`\<`any`\>

Promise that resolves to the restored addresses

#### Implementation of

[`AccountProvider`](../interfaces/AccountProvider.md).[`restore`](../interfaces/AccountProvider.md#restore)
