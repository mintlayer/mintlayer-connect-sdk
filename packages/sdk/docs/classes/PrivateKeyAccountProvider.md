[**@mintlayer/sdk**](../README.md)

***

Defined in: [mintlayer-connect-sdk.ts:335](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L335)

A standalone account provider backed by explicit addresses and private keys.

Suitable for Node.js scripts, tests, and faucets where the wallet extension
is not available. Signing is performed locally using the [Signer](Signer.md) class.

## Example

```typescript
const provider = new PrivateKeyAccountProvider(
  {
    receiving: ['tmt1q...'],
    change:    ['tmt1q...'],
  },
  {
    'tmt1q...': new Uint8Array([...]),
  },
  'testnet',
);

const client = await Client.create({ network: 'testnet', accountProvider: provider });
```

## Implements

- [`AccountProvider`](../interfaces/AccountProvider.md)

## Constructors

### Constructor

> **new PrivateKeyAccountProvider**(`addresses`, `privateKeys`, `network`): `PrivateKeyAccountProvider`

Defined in: [mintlayer-connect-sdk.ts:340](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L340)

#### Parameters

##### addresses

###### change

`string`[]

###### receiving

`string`[]

##### privateKeys

`Record`\<`string`, `Uint8Array`\<`ArrayBufferLike`\>\>

##### network

`"mainnet"` | `"testnet"`

#### Returns

`PrivateKeyAccountProvider`

## Methods

### connect()

> **connect**(): `Promise`\<`Address`\>

Defined in: [mintlayer-connect-sdk.ts:354](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L354)

#### Returns

`Promise`\<`Address`\>

#### Implementation of

[`AccountProvider`](../interfaces/AccountProvider.md).[`connect`](../interfaces/AccountProvider.md#connect)

***

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

Defined in: [mintlayer-connect-sdk.ts:362](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L362)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`AccountProvider`](../interfaces/AccountProvider.md).[`disconnect`](../interfaces/AccountProvider.md#disconnect)

***

### request()

> **request**(`method`, `params`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:364](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L364)

#### Parameters

##### method

`string`

##### params

`any`

#### Returns

`Promise`\<`any`\>

#### Implementation of

[`AccountProvider`](../interfaces/AccountProvider.md).[`request`](../interfaces/AccountProvider.md#request)

***

### restore()

> **restore**(): `Promise`\<`Address`\>

Defined in: [mintlayer-connect-sdk.ts:358](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L358)

#### Returns

`Promise`\<`Address`\>

#### Implementation of

[`AccountProvider`](../interfaces/AccountProvider.md).[`restore`](../interfaces/AccountProvider.md#restore)
