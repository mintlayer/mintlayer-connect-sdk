[**@mintlayer/sdk**](../README.md)

***

Defined in: [mintlayer-connect-sdk.ts:419](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L419)

A standalone account provider that derives addresses and private keys from a
BIP39 mnemonic seed phrase.

Derivation path: `44'/mintlayer_coin_type'/0'/0/<index>` for receiving and
`44'/mintlayer_coin_type'/0'/1/<index>` for change addresses.

Suitable for Node.js scripts, tests, and faucets where the wallet extension
is not available.

## Example

```typescript
const provider = new MnemonicAccountProvider(
  'word1 word2 ... word12',
  'testnet',
  { receivingAddressCount: 5, changeAddressCount: 2 },
);

const client = await Client.create({ network: 'testnet', accountProvider: provider });
```

## Implements

- [`AccountProvider`](../interfaces/AccountProvider.md)

## Constructors

### Constructor

> **new MnemonicAccountProvider**(`mnemonic`, `network`, `options`): `MnemonicAccountProvider`

Defined in: [mintlayer-connect-sdk.ts:424](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L424)

#### Parameters

##### mnemonic

`string`

##### network

`"mainnet"` | `"testnet"`

##### options

[`MnemonicAccountProviderOptions`](../interfaces/MnemonicAccountProviderOptions.md) = `{}`

#### Returns

`MnemonicAccountProvider`

## Methods

### connect()

> **connect**(): `Promise`\<`Address`\>

Defined in: [mintlayer-connect-sdk.ts:461](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L461)

#### Returns

`Promise`\<`Address`\>

#### Implementation of

[`AccountProvider`](../interfaces/AccountProvider.md).[`connect`](../interfaces/AccountProvider.md#connect)

***

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

Defined in: [mintlayer-connect-sdk.ts:469](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L469)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`AccountProvider`](../interfaces/AccountProvider.md).[`disconnect`](../interfaces/AccountProvider.md#disconnect)

***

### request()

> **request**(`method`, `params`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:471](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L471)

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

Defined in: [mintlayer-connect-sdk.ts:465](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L465)

#### Returns

`Promise`\<`Address`\>

#### Implementation of

[`AccountProvider`](../interfaces/AccountProvider.md).[`restore`](../interfaces/AccountProvider.md#restore)
