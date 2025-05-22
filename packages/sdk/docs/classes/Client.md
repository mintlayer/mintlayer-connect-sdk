[**@mintlayer/sdk**](../README.md)

***

Defined in: [mintlayer-connect-sdk.ts:525](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L525)

## Constructors

### Constructor

> **new Client**(`options`): `Client`

Defined in: [mintlayer-connect-sdk.ts:539](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L539)

Creates a new Client instance.

#### Parameters

##### options

`ClientOptions` = `{}`

#### Returns

`Client`

## Properties

### isMintlayer

> `readonly` **isMintlayer**: `boolean` = `true`

Defined in: [mintlayer-connect-sdk.ts:822](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L822)

Returns the transaction ID.

## Methods

### bridgeRequest()

> **bridgeRequest**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:2252](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2252)

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

***

### broadcastTx()

> **broadcastTx**(`tx`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:2352](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2352)

#### Parameters

##### tx

`string`

#### Returns

`Promise`\<`any`\>

***

### buildTransaction()

> **buildTransaction**(`arg`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:1181](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L1181)

Builds a transaction based on the provided parameters.

#### Parameters

##### arg

`BuildTransactionParams`

#### Returns

`Promise`\<`Transaction`\>

***

### burn()

> **burn**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:2282](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2282)

#### Parameters

##### \_\_namedParameters

###### amount

`number`

###### token_id

`string`

#### Returns

`Promise`\<`any`\>

***

### changeMetadataUri()

> **changeMetadataUri**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:2133](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2133)

#### Parameters

##### \_\_namedParameters

###### new_metadata_uri

`string`

###### token_id

`string`

#### Returns

`Promise`\<`any`\>

***

### changeTokenAuthority()

> **changeTokenAuthority**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:2117](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2117)

#### Parameters

##### \_\_namedParameters

###### new_authority

`string`

###### token_id

`string`

#### Returns

`Promise`\<`any`\>

***

### concludeOrder()

> **concludeOrder**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:2240](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2240)

#### Parameters

##### \_\_namedParameters

###### order_id

`string`

#### Returns

`Promise`\<`any`\>

***

### connect()

> **connect**(): `Promise`\<`string`[]\>

Defined in: [mintlayer-connect-sdk.ts:856](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L856)

Connects to the wallet and retrieves the connected addresses.

#### Returns

`Promise`\<`string`[]\>

***

### createOrder()

> **createOrder**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:2184](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2184)

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

***

### dataDeposit()

> **dataDeposit**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:2298](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2298)

#### Parameters

##### \_\_namedParameters

###### data

`string`

#### Returns

`Promise`\<`any`\>

***

### delegate()

> **delegate**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:2017](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2017)

#### Parameters

##### \_\_namedParameters

###### destination

`string`

###### pool_id

`string`

#### Returns

`Promise`\<`any`\>

***

### delegationCreate()

> **delegationCreate**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:2304](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2304)

#### Parameters

##### \_\_namedParameters

###### destination

`string`

###### pool_id

`string`

#### Returns

`Promise`\<`any`\>

***

### delegationStake()

> **delegationStake**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:2310](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2310)

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

***

### delegationWithdraw()

> **delegationWithdraw**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:2324](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2324)

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

***

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

Defined in: [mintlayer-connect-sdk.ts:870](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L870)

Disconnects from the wallet and clears the connected addresses.

#### Returns

`Promise`\<`void`\>

***

### fillOrder()

> **fillOrder**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:2205](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2205)

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

***

### freezeToken()

> **freezeToken**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:2155](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2155)

#### Parameters

##### \_\_namedParameters

###### is_unfreezable

`boolean`

###### token_id

`string`

#### Returns

`Promise`\<`any`\>

***

### getAccountOrders()

> **getAccountOrders**(): `Promise`\<`any`[]\>

Defined in: [mintlayer-connect-sdk.ts:2228](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2228)

#### Returns

`Promise`\<`any`[]\>

***

### getAddresses()

> **getAddresses**(): `object`

Defined in: [mintlayer-connect-sdk.ts:926](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L926)

Returns the connected addresses.

#### Returns

`object`

##### change

> **change**: `string`[]

##### receiving

> **receiving**: `string`[]

***

### getAvailableOrders()

> **getAvailableOrders**(): `Promise`\<`any`[]\>

Defined in: [mintlayer-connect-sdk.ts:2382](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2382)

#### Returns

`Promise`\<`any`[]\>

***

### getBalance()

> **getBalance**(): `Promise`\<`number`\>

Defined in: [mintlayer-connect-sdk.ts:938](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L938)

Returns the connected address for the current network.

#### Returns

`Promise`\<`number`\>

Balance.

***

### getBalances()

> **getBalances**(): `Promise`\<\{ `coin`: `number`; `token`: `Record`\<`string`, `number`\>; \}\>

Defined in: [mintlayer-connect-sdk.ts:975](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L975)

Returns the balances for coin and all tokens of the connected addresses.

#### Returns

`Promise`\<\{ `coin`: `number`; `token`: `Record`\<`string`, `number`\>; \}\>

***

### getDelegations()

> **getDelegations**(): `Promise`\<`any`[]\>

Defined in: [mintlayer-connect-sdk.ts:1039](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L1039)

Returns the delegations for the connected addresses.

#### Returns

`Promise`\<`any`[]\>

***

### getDelegationsTotal()

> **getDelegationsTotal**(): `Promise`\<`number`\>

Defined in: [mintlayer-connect-sdk.ts:1111](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L1111)

Returns the total amount of delegations for the connected addresses.

#### Returns

`Promise`\<`number`\>

***

### getFeeForType()

> **getFeeForType**(`type`): `bigint`

Defined in: [mintlayer-connect-sdk.ts:1125](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L1125)

Returns the fee for a specific transaction type.

#### Parameters

##### type

`string`

#### Returns

`bigint`

Fee in atoms.

***

### getNetwork()

> **getNetwork**(): `"mainnet"` \| `"testnet"`

Defined in: [mintlayer-connect-sdk.ts:840](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L840)

Returns the current network.

#### Returns

`"mainnet"` \| `"testnet"`

The current network.

***

### getTokensOwned()

> **getTokensOwned**(): `Promise`\<`any`[]\>

Defined in: [mintlayer-connect-sdk.ts:1075](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L1075)

Returns the tokens owned by the connected addresses.

#### Returns

`Promise`\<`any`[]\>

***

### getTransactionBINrepresentation()

> **getTransactionBINrepresentation**(`transactionJSONrepresentation`, `_network`): `object`

Defined in: [mintlayer-connect-sdk.ts:1770](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L1770)

Returns the transaction binary representation.

#### Parameters

##### transactionJSONrepresentation

[`TransactionJSONRepresentation`](../interfaces/TransactionJSONRepresentation.md)

##### \_network

`Network`

#### Returns

`object`

##### inputs

> **inputs**: (`undefined` \| `Uint8Array`\<`ArrayBufferLike`\>)[] = `inputsArray`

##### outputs

> **outputs**: (`undefined` \| `Uint8Array`\<`ArrayBufferLike`\>)[] = `outputsArray`

##### transactionsize

> **transactionsize**: `number`

***

### getXPub()

> **getXPub**(): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:2346](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2346)

#### Returns

`Promise`\<`string`\>

***

### isConnected()

> **isConnected**(): `boolean`

Defined in: [mintlayer-connect-sdk.ts:848](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L848)

Checks if the client is connected to the wallet.

#### Returns

`boolean`

True if connected, false otherwise.

***

### issueNft()

> **issueNft**(`tokenData`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:2023](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2023)

#### Parameters

##### tokenData

`any`

#### Returns

`Promise`\<`any`\>

***

### issueToken()

> **issueToken**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:2042](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2042)

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

***

### lockTokenSupply()

> **lockTokenSupply**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:2104](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2104)

#### Parameters

##### \_\_namedParameters

###### token_id

`string`

#### Returns

`Promise`\<`any`\>

***

### mintToken()

> **mintToken**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:2067](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2067)

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

***

### on()

> **on**(`eventName`, `callback`): `void`

Defined in: [mintlayer-connect-sdk.ts:2373](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2373)

#### Parameters

##### eventName

`string`

##### callback

(`data`) => `void`

#### Returns

`void`

***

### request()

> **request**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:913](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L913)

Requests a method from the wallet.

#### Parameters

##### \_\_namedParameters

###### method

`string`

###### params?

`Record`\<`string`, `any`\>

#### Returns

`Promise`\<`any`\>

***

### restore()

> **restore**(): `Promise`\<`boolean`\>

Defined in: [mintlayer-connect-sdk.ts:883](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L883)

Restores the session from the wallet.

#### Returns

`Promise`\<`boolean`\>

***

### setNetwork()

> **setNetwork**(`net`): `void`

Defined in: [mintlayer-connect-sdk.ts:828](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L828)

Sets the network for the client.

#### Parameters

##### net

`"mainnet"` | `"testnet"`

#### Returns

`void`

***

### signTransaction()

> **signTransaction**(`tx`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:2338](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2338)

#### Parameters

##### tx

`Transaction`

#### Returns

`Promise`\<`any`\>

***

### transfer()

> **transfer**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1976](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L1976)

Transfers coin or token to a given address.

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

***

### transferNft()

> **transferNft**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1998](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L1998)

Transfers NFT to a given address.

#### Parameters

##### \_\_namedParameters

###### to

`string`

###### token_id

`string`

#### Returns

`Promise`\<`any`\>

***

### unfreezeToken()

> **unfreezeToken**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:2171](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2171)

#### Parameters

##### \_\_namedParameters

###### token_id

`string`

#### Returns

`Promise`\<`any`\>

***

### unmintToken()

> **unmintToken**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:2091](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L2091)

#### Parameters

##### \_\_namedParameters

###### amount

`number`

###### token_id

`string`

#### Returns

`Promise`\<`any`\>

***

### create()

> `static` **create**(`options`): `Promise`\<`Client`\>

Defined in: [mintlayer-connect-sdk.ts:557](https://github.com/mintlayer/mintlayer-connect-sdk/blob/f3e67f2b3330631860f5784e009aabab34b27988/packages/sdk/src/mintlayer-connect-sdk.ts#L557)

Creates a new Client instance and initializes it.

#### Parameters

##### options

`ClientOptions` = `...`

#### Returns

`Promise`\<`Client`\>
