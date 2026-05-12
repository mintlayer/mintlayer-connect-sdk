[**@mintlayer/sdk**](../README.md)

***

Defined in: [mintlayer-connect-sdk.ts:266](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/mintlayer-connect-sdk.ts#L266)

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

Defined in: [mintlayer-connect-sdk.ts:271](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/mintlayer-connect-sdk.ts#L271)

Connects to the Mojito wallet extension.

#### Returns

`Promise`\<`any`\>

Promise that resolves to the connected addresses

#### Implementation of

[`AccountProvider`](../interfaces/AccountProvider.md).[`connect`](../interfaces/AccountProvider.md#connect)

***

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

Defined in: [mintlayer-connect-sdk.ts:295](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/mintlayer-connect-sdk.ts#L295)

Disconnects from the Mojito wallet extension.

#### Returns

`Promise`\<`void`\>

Promise that resolves when disconnection is complete

#### Implementation of

[`AccountProvider`](../interfaces/AccountProvider.md).[`disconnect`](../interfaces/AccountProvider.md#disconnect)

***

### request()

> **request**(`method`, `params`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:309](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/mintlayer-connect-sdk.ts#L309)

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

Defined in: [mintlayer-connect-sdk.ts:283](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/mintlayer-connect-sdk.ts#L283)

Restores the session from the Mojito wallet extension.

#### Returns

`Promise`\<`any`\>

Promise that resolves to the restored addresses

#### Implementation of

[`AccountProvider`](../interfaces/AccountProvider.md).[`restore`](../interfaces/AccountProvider.md#restore)
