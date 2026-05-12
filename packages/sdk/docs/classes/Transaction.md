[**@mintlayer/sdk**](../README.md)

***

Defined in: [transaction.ts:61](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L61)

## Constructors

### Constructor

> **new Transaction**(`__namedParameters`): `Transaction`

Defined in: [transaction.ts:75](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L75)

#### Parameters

##### \_\_namedParameters

###### client?

`any`

###### currentBlockHeight?

`string` \| `number` \| `bigint`

###### network?

`"mainnet"` \| `"testnet"`

#### Returns

`Transaction`

## Accessors

### BINRepresentation

#### Get Signature

> **get** **BINRepresentation**(): `null` \| \{ `inputs`: `Uint8Array`\<`ArrayBufferLike`\>[]; `outputs`: `Uint8Array`\<`ArrayBufferLike`\>[]; `transactionsize`: `number`; \}

Defined in: [transaction.ts:147](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L147)

##### Returns

`null` \| \{ `inputs`: `Uint8Array`\<`ArrayBufferLike`\>[]; `outputs`: `Uint8Array`\<`ArrayBufferLike`\>[]; `transactionsize`: `number`; \}

***

### HEXRepresentation\_unsigned

#### Get Signature

> **get** **HEXRepresentation\_unsigned**(): `string`

Defined in: [transaction.ts:150](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L150)

##### Returns

`string`

***

### JSONRepresentation

#### Get Signature

> **get** **JSONRepresentation**(): `any`

Defined in: [transaction.ts:144](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L144)

##### Returns

`any`

***

### transaction\_id

#### Get Signature

> **get** **transaction\_id**(): `string`

Defined in: [transaction.ts:153](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L153)

##### Returns

`string`

## Methods

### addAction()

> **addAction**(`action`): `Transaction`

Defined in: [transaction.ts:126](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L126)

#### Parameters

##### action

`any`

#### Returns

`Transaction`

***

### addInput()

> **addInput**(`input`): `Transaction`

Defined in: [transaction.ts:116](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L116)

#### Parameters

##### input

`Input`

#### Returns

`Transaction`

***

### addOutput()

> **addOutput**(`output`): `Transaction`

Defined in: [transaction.ts:121](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L121)

#### Parameters

##### output

`any`

#### Returns

`Transaction`

***

### build()

> **build**(): `Transaction`

Defined in: [transaction.ts:157](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L157)

#### Returns

`Transaction`

***

### fromHEX()

> **fromHEX**(`hex`): `Transaction`

Defined in: [transaction.ts:135](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L135)

#### Parameters

##### hex

`string`

#### Returns

`Transaction`

***

### getFee()

> **getFee**(): `object`

Defined in: [transaction.ts:301](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L301)

#### Returns

`object`

##### atoms

> **atoms**: `string`

##### decimal

> **decimal**: `string`

***

### getTransactionBINrepresentation()

> **getTransactionBINrepresentation**(`transactionJSONrepresentation`, `_network`): `object`

Defined in: [transaction.ts:393](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L393)

Returns the transaction binary representation.

#### Parameters

##### transactionJSONrepresentation

`any`

##### \_network

`Network`

#### Returns

`object`

##### inputs

> **inputs**: `Uint8Array`\<`ArrayBufferLike`\>[]

##### outputs

> **outputs**: `Uint8Array`\<`ArrayBufferLike`\>[]

##### transactionsize

> **transactionsize**: `number`

***

### getTransactionId()

> **getTransactionId**(): `string`

Defined in: [transaction.ts:139](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L139)

#### Returns

`string`

***

### hex()

> **hex**(): `string`

Defined in: [transaction.ts:293](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L293)

#### Returns

`string`

***

### json()

> **json**(): `any`

Defined in: [transaction.ts:297](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L297)

#### Returns

`any`

***

### setChangeAddress()

> **setChangeAddress**(`address`): `Transaction`

Defined in: [transaction.ts:101](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L101)

#### Parameters

##### address

`string`

#### Returns

`Transaction`

***

### setCurrentBlockHeight()

> **setCurrentBlockHeight**(`height`): `Transaction`

Defined in: [transaction.ts:111](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L111)

#### Parameters

##### height

`string` | `number` | `bigint`

#### Returns

`Transaction`

***

### setNetwork()

> **setNetwork**(`network`): `Transaction`

Defined in: [transaction.ts:106](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L106)

#### Parameters

##### network

`"mainnet"` | `"testnet"`

#### Returns

`Transaction`

***

### stakingWithdraw()

> **stakingWithdraw**(): `object`

Defined in: [transaction.ts:738](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L738)

#### Returns

`object`

##### params

> **params**: `object`

###### params.amount

> **amount**: `number` = `0`

###### params.delegation\_id

> **delegation\_id**: `string` = `''`

##### type

> **type**: `string` = `'StakingWithdraw'`

***

### transfer()

> **transfer**(`destination`, `amount`): `any`

Defined in: [transaction.ts:704](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L704)

#### Parameters

##### destination

`string`

##### amount

`string`

#### Returns

`any`

***

### transferNft()

> **transferNft**(`destination`, `token_id`): `any`

Defined in: [transaction.ts:733](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L733)

#### Parameters

##### destination

`string`

##### token\_id

`string`

#### Returns

`any`

***

### transferToken()

> **transferToken**(`destination`, `amount`, `token_id`): `any`

Defined in: [transaction.ts:718](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L718)

#### Parameters

##### destination

`string`

##### amount

`string`

##### token\_id

`string`

#### Returns

`any`

***

### withUTXO()

> **withUTXO**(`utxos`): `Transaction`

Defined in: [transaction.ts:130](https://github.com/mintlayer/mintlayer-connect-sdk/blob/e5da6dd553558de82047535da674569c83acf075/packages/sdk/src/transaction.ts#L130)

#### Parameters

##### utxos

`any`

#### Returns

`Transaction`
