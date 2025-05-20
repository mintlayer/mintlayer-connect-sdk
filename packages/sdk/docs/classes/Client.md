[**@mintlayer/sdk**](../README.md)

---

Defined in: [mintlayer-connect-sdk.ts:155](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L155)

## Constructors

### Constructor

> **new Client**(`options`): `Client`

Defined in: [mintlayer-connect-sdk.ts:160](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L160)

#### Parameters

##### options

`ClientOptions` = `{}`

#### Returns

`Client`

## Properties

### isMintlayer

> `readonly` **isMintlayer**: `boolean` = `true`

Defined in: [mintlayer-connect-sdk.ts:410](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L410)

## Methods

### bridgeRequest()

> **bridgeRequest**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1780](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1780)

#### Parameters

##### \_\_namedParameters

###### amount

`number`

###### destination

`string`

###### intent

`string`

###### token_id

`string`

#### Returns

`Promise`\<`any`\>

---

### broadcastTx()

> **broadcastTx**(`tx`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1851](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1851)

#### Parameters

##### tx

`string`

#### Returns

`Promise`\<`any`\>

---

### buildTransaction()

> **buildTransaction**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:715](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L715)

#### Parameters

##### \_\_namedParameters

###### params

`BuildTransactionParams`

###### type?

`string` = `'Transfer'`

#### Returns

`Promise`\<`Transaction`\>

---

### burn()

> **burn**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1797](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1797)

#### Parameters

##### \_\_namedParameters

###### amount

`number`

###### token_id

`string`

#### Returns

`Promise`\<`any`\>

---

### changeMetadataUri()

> **changeMetadataUri**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1686](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1686)

#### Parameters

##### \_\_namedParameters

###### new_metadata_uri

`string`

###### token_id

`string`

#### Returns

`Promise`\<`any`\>

---

### changeTokenAuthority()

> **changeTokenAuthority**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1673](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1673)

#### Parameters

##### \_\_namedParameters

###### new_authority

`string`

###### token_id

`string`

#### Returns

`Promise`\<`any`\>

---

### concludeOrder()

> **concludeOrder**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1767](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1767)

#### Parameters

##### \_\_namedParameters

###### order_id

`string`

#### Returns

`Promise`\<`any`\>

---

### connect()

> **connect**(): `Promise`\<`string`[]\>

Defined in: [mintlayer-connect-sdk.ts:429](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L429)

#### Returns

`Promise`\<`string`[]\>

---

### createOrder()

> **createOrder**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1725](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1725)

#### Parameters

##### \_\_namedParameters

###### ask_amount

`number`

###### ask_token

`string`

###### conclude_destination

`string`

###### give_amount

`number`

###### give_token

`string`

#### Returns

`Promise`\<`any`\>

---

### dataDeposit()

> **dataDeposit**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1813](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1813)

#### Parameters

##### \_\_namedParameters

###### data

`string`

#### Returns

`Promise`\<`any`\>

---

### delegate()

> **delegate**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1584](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1584)

#### Parameters

##### \_\_namedParameters

###### amount

`number`

###### poolId

`string`

#### Returns

`Promise`\<`any`\>

---

### delegationCreate()

> **delegationCreate**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1819](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1819)

#### Parameters

##### \_\_namedParameters

###### destination

`string`

###### pool_id

`string`

#### Returns

`Promise`\<`any`\>

---

### delegationStake()

> **delegationStake**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1825](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1825)

#### Parameters

##### \_\_namedParameters

###### amount

`number`

###### delegation_id

`string`

###### pool_id

`string`

#### Returns

`Promise`\<`any`\>

---

### delegationWithdraw()

> **delegationWithdraw**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1831](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1831)

#### Parameters

##### \_\_namedParameters

###### amount

`number`

###### delegation_id

`string`

###### pool_id

`string`

#### Returns

`Promise`\<`any`\>

---

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

Defined in: [mintlayer-connect-sdk.ts:440](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L440)

#### Returns

`Promise`\<`void`\>

---

### fillOrder()

> **fillOrder**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1743](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1743)

#### Parameters

##### \_\_namedParameters

###### amount

`number`

###### destination

`string`

###### order_id

`string`

#### Returns

`Promise`\<`any`\>

---

### freezeToken()

> **freezeToken**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1699](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1699)

#### Parameters

##### \_\_namedParameters

###### is_unfreezable

`boolean`

###### token_id

`string`

#### Returns

`Promise`\<`any`\>

---

### getAccountOrders()

> **getAccountOrders**(): `Promise`\<`any`[]\>

Defined in: [mintlayer-connect-sdk.ts:1755](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1755)

#### Returns

`Promise`\<`any`[]\>

---

### getAddresses()

> **getAddresses**(): `Promise`\<`string`[]\>

Defined in: [mintlayer-connect-sdk.ts:485](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L485)

#### Returns

`Promise`\<`string`[]\>

---

### getAvailableOrders()

> **getAvailableOrders**(): `Promise`\<`any`[]\>

Defined in: [mintlayer-connect-sdk.ts:1881](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1881)

#### Returns

`Promise`\<`any`[]\>

---

### getBalance()

> **getBalance**(): `Promise`\<`number`\>

Defined in: [mintlayer-connect-sdk.ts:493](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L493)

#### Returns

`Promise`\<`number`\>

---

### getBalances()

> **getBalances**(): `Promise`\<\{ `coin`: `number`; `token`: `Record`\<`string`, `number`\>; \}\>

Defined in: [mintlayer-connect-sdk.ts:527](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L527)

#### Returns

`Promise`\<\{ `coin`: `number`; `token`: `Record`\<`string`, `number`\>; \}\>

---

### getDelegations()

> **getDelegations**(): `Promise`\<`any`[]\>

Defined in: [mintlayer-connect-sdk.ts:588](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L588)

#### Returns

`Promise`\<`any`[]\>

---

### getDelegationsTotal()

> **getDelegationsTotal**(): `Promise`\<`number`\>

Defined in: [mintlayer-connect-sdk.ts:654](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L654)

#### Returns

`Promise`\<`number`\>

---

### getFeeForType()

> **getFeeForType**(`type`): `bigint`

Defined in: [mintlayer-connect-sdk.ts:663](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L663)

#### Parameters

##### type

`string`

#### Returns

`bigint`

---

### getNetwork()

> **getNetwork**(): `"mainnet"` \| `"testnet"`

Defined in: [mintlayer-connect-sdk.ts:420](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L420)

#### Returns

`"mainnet"` \| `"testnet"`

---

### getTokensOwned()

> **getTokensOwned**(): `Promise`\<`any`[]\>

Defined in: [mintlayer-connect-sdk.ts:621](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L621)

#### Returns

`Promise`\<`any`[]\>

---

### getTransactionBINrepresentation()

> **getTransactionBINrepresentation**(`transactionJSONrepresentation`, `_network`): `object`

Defined in: [mintlayer-connect-sdk.ts:1295](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1295)

#### Parameters

##### transactionJSONrepresentation

`any`

##### \_network

`any`

#### Returns

`object`

##### inputs

> **inputs**: `any`[] = `inputsArray`

##### outputs

> **outputs**: `any` = `outputsArray`

##### transactionsize

> **transactionsize**: `number`

---

### getXPub()

> **getXPub**(): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:1845](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1845)

#### Returns

`Promise`\<`string`\>

---

### isConnected()

> **isConnected**(): `boolean`

Defined in: [mintlayer-connect-sdk.ts:424](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L424)

#### Returns

`boolean`

---

### issueNft()

> **issueNft**(`tokenData`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1590](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1590)

#### Parameters

##### tokenData

`Record`\<`string`, `any`\>

#### Returns

`Promise`\<`any`\>

---

### issueToken()

> **issueToken**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1609](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1609)

#### Parameters

##### \_\_namedParameters

###### authority

`string`

###### is_freezable

`boolean`

###### metadata_uri

`string`

###### number_of_decimals

`number`

###### supply_amount?

`number`

###### supply_type

`"Unlimited"` \| `"Lockable"` \| `"Fixed"`

###### token_ticker

`string`

#### Returns

`Promise`\<`any`\>

---

### lockTokenSupply()

> **lockTokenSupply**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1660](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1660)

#### Parameters

##### \_\_namedParameters

###### token_id

`string`

#### Returns

`Promise`\<`any`\>

---

### mintToken()

> **mintToken**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1634](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1634)

#### Parameters

##### \_\_namedParameters

###### amount

`number`

###### destination

`string`

###### token_id

`string`

#### Returns

`Promise`\<`any`\>

---

### on()

> **on**(`eventName`, `callback`): `void`

Defined in: [mintlayer-connect-sdk.ts:1872](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1872)

#### Parameters

##### eventName

`string`

##### callback

(`data`) => `void`

#### Returns

`void`

---

### request()

> **request**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:475](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L475)

#### Parameters

##### \_\_namedParameters

###### method

`string`

###### params?

`Record`\<`string`, `any`\>

#### Returns

`Promise`\<`any`\>

---

### restore()

> **restore**(): `Promise`\<`boolean`\>

Defined in: [mintlayer-connect-sdk.ts:450](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L450)

#### Returns

`Promise`\<`boolean`\>

---

### setNetwork()

> **setNetwork**(`net`): `void`

Defined in: [mintlayer-connect-sdk.ts:412](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L412)

#### Parameters

##### net

`"mainnet"` | `"testnet"`

#### Returns

`void`

---

### signTransaction()

> **signTransaction**(`tx`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1837](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1837)

#### Parameters

##### tx

`Transaction`

#### Returns

`Promise`\<`any`\>

---

### transfer()

> **transfer**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1552](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1552)

#### Parameters

##### \_\_namedParameters

###### amount

`number`

###### to

`string`

###### token_id?

`string`

#### Returns

`Promise`\<`any`\>

---

### transferNft()

> **transferNft**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1567](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1567)

#### Parameters

##### \_\_namedParameters

###### to

`string`

###### token_id

`string`

#### Returns

`Promise`\<`any`\>

---

### unfreezeToken()

> **unfreezeToken**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1712](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1712)

#### Parameters

##### \_\_namedParameters

###### token_id

`string`

#### Returns

`Promise`\<`any`\>

---

### unmintToken()

> **unmintToken**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1647](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L1647)

#### Parameters

##### \_\_namedParameters

###### amount

`number`

###### token_id

`string`

#### Returns

`Promise`\<`any`\>

---

### create()

> `static` **create**(`options`): `Promise`\<`Client`\>

Defined in: [mintlayer-connect-sdk.ts:166](https://github.com/mintlayer/mintlayer-connect-sdk/blob/0929d70e005e7fd16373bf0d634ccbec4470fc4a/packages/sdk/src/mintlayer-connect-sdk.ts#L166)

#### Parameters

##### options

`ClientOptions` = `...`

#### Returns

`Promise`\<`Client`\>
