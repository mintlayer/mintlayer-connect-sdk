[**@mintlayer/sdk**](../README.md)

***

Defined in: [mintlayer-connect-sdk.ts:860](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L860)

## Constructors

### Constructor

> **new Client**(`options`): `Client`

Defined in: [mintlayer-connect-sdk.ts:875](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L875)

Creates a new Client instance.

#### Parameters

##### options

`ClientOptions` = `{}`

#### Returns

`Client`

## Properties

### isMintlayer

> `readonly` **isMintlayer**: `boolean` = `true`

Defined in: [mintlayer-connect-sdk.ts:1132](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L1132)

Returns the transaction ID.

## Methods

### bridgeRequest()

> **bridgeRequest**(`__namedParameters`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:3131](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3131)

Creates a bridge request transaction and signs it.

#### Parameters

##### \_\_namedParameters

[`BridgeRequestArgs`](../type-aliases/BridgeRequestArgs.md)

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### broadcastTx()

> **broadcastTx**(`tx`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:3720](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3720)

Broadcasts a signed transaction to the network.

#### Parameters

##### tx

The transaction to broadcast (hex string or object with hex and json)

`string` | \{ `hex`: `string`; `json`: [`TransactionJSONRepresentation`](../interfaces/TransactionJSONRepresentation.md); \}

#### Returns

`Promise`\<`any`\>

Promise that resolves to the broadcast response

***

### buildBridgeRequest()

> **buildBridgeRequest**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3103](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3103)

Builds a bridge request transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`BridgeRequestArgs`](../type-aliases/BridgeRequestArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildBurn()

> **buildBurn**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3139](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3139)

Builds a burn transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`BurnArgs`](../type-aliases/BurnArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildChangeMetadataUri()

> **buildChangeMetadataUri**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:2858](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2858)

Builds a token metadata URI change transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`ChangeMetadataUriArgs`](../type-aliases/ChangeMetadataUriArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildChangeTokenAuthority()

> **buildChangeTokenAuthority**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:2829](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2829)

Builds a token authority change transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`ChangeTokenAuthorityArgs`](../type-aliases/ChangeTokenAuthorityArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildConcludeOrder()

> **buildConcludeOrder**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3079](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3079)

Builds an order conclusion transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`ConcludeOrderArgs`](../type-aliases/ConcludeOrderArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildCreateHtlc()

> **buildCreateHtlc**(`params`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3339](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3339)

Builds an HTLC creation transaction without signing it.

#### Parameters

##### params

`any`

#### Returns

`Promise`\<`Transaction`\>

***

### buildCreateOrder()

> **buildCreateOrder**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:2941](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2941)

Builds an order creation transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`CreateOrderArgs`](../type-aliases/CreateOrderArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildDataDeposit()

> **buildDataDeposit**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3168](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3168)

Builds a data deposit transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`DataDepositArgs`](../type-aliases/DataDepositArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildDelegate()

> **buildDelegate**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:2647](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2647)

Builds a delegation creation transaction without signing it.

#### Parameters

##### \_\_namedParameters

###### destination

`string`

###### pool_id

`string`

#### Returns

`Promise`\<`Transaction`\>

***

### buildDelegationCreate()

> **buildDelegationCreate**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3186](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3186)

Builds a delegation creation transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`DelegationCreateArgs`](../type-aliases/DelegationCreateArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildDelegationStake()

> **buildDelegationStake**(`params`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3205](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3205)

Builds a delegation staking transaction without signing it.

#### Parameters

##### params

[`DelegationStakeArgs`](../type-aliases/DelegationStakeArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildDelegationWithdraw()

> **buildDelegationWithdraw**(`params`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3268](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3268)

Builds a delegation withdrawal transaction without signing it.

#### Parameters

##### params

[`DelegationWithdrawArgs`](../type-aliases/DelegationWithdrawArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildFillOrder()

> **buildFillOrder**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3012](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3012)

Builds an order fill transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`FillOrderArgs`](../type-aliases/FillOrderArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildFreezeToken()

> **buildFreezeToken**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:2887](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2887)

Builds a token freezing transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`FreezeTokenArgs`](../type-aliases/FreezeTokenArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildIssueNft()

> **buildIssueNft**(`tokenData`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:2666](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2666)

Builds an NFT issuance transaction without signing it.

#### Parameters

##### tokenData

[`IssueNftArgs`](../type-aliases/IssueNftArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildIssueToken()

> **buildIssueToken**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:2697](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2697)

Builds a fungible token issuance transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`IssueTokenArgs`](../type-aliases/IssueTokenArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildLockTokenSupply()

> **buildLockTokenSupply**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:2804](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2804)

Builds a token supply locking transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`LockTokenSupplyArgs`](../type-aliases/LockTokenSupplyArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildMintToken()

> **buildMintToken**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:2748](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2748)

Builds a token minting transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`MintTokenArgs`](../type-aliases/MintTokenArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildRefundHtlc()

> **buildRefundHtlc**(`params`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3381](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3381)

Builds an HTLC refund transaction without signing it.

#### Parameters

##### params

`any`

#### Returns

`Promise`\<`Transaction`\>

***

### buildSpendHtlc()

> **buildSpendHtlc**(`params`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3425](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3425)

Builds an HTLC spend transaction without signing it.

#### Parameters

##### params

`any`

#### Returns

`Promise`\<`Transaction`\>

***

### buildTransaction()

> **buildTransaction**(`arg`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:2073](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2073)

Builds a transaction based on the provided parameters.
@param{BuildTransactionParams} arg

#### Parameters

##### arg

`BuildTransactionParams`

#### Returns

`Promise`\<`Transaction`\>

***

### buildTransfer()

> **buildTransfer**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:2579](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2579)

Builds a transfer transaction without signing it.
If a token_id is provided, token will be transferred instead of base coin.

#### Parameters

##### \_\_namedParameters

[`TransferArgs`](../type-aliases/TransferArgs.md)

#### Returns

`Promise`\<`Transaction`\>

A transaction ready to be signed

***

### buildTransferNft()

> **buildTransferNft**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:2614](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2614)

Builds an NFT transfer transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`TransferNftArgs`](../type-aliases/TransferNftArgs.md)

#### Returns

`Promise`\<`Transaction`\>

A transaction ready to be signed

***

### buildUnfreezeToken()

> **buildUnfreezeToken**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:2916](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2916)

Builds a token unfreezing transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`UnfreezeTokenArgs`](../type-aliases/UnfreezeTokenArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildUnmintToken()

> **buildUnmintToken**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:2778](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2778)

Builds a token unminting transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`UnmintTokenArgs`](../type-aliases/UnmintTokenArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### burn()

> **burn**(`__namedParameters`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:3160](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3160)

Burns tokens or coins and signs the transaction.

#### Parameters

##### \_\_namedParameters

[`BurnArgs`](../type-aliases/BurnArgs.md)

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### changeMetadataUri()

> **changeMetadataUri**(`__namedParameters`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:2879](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2879)

Changes the metadata URI of a token and signs the transaction.

#### Parameters

##### \_\_namedParameters

[`ChangeMetadataUriArgs`](../type-aliases/ChangeMetadataUriArgs.md)

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### changeTokenAuthority()

> **changeTokenAuthority**(`__namedParameters`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:2850](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2850)

Changes the authority of a token and signs the transaction.

#### Parameters

##### \_\_namedParameters

[`ChangeTokenAuthorityArgs`](../type-aliases/ChangeTokenAuthorityArgs.md)

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### concludeOrder()

> **concludeOrder**(`order_id`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:3095](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3095)

Concludes a trading order and signs the transaction.

#### Parameters

##### order\_id

[`ConcludeOrderArgs`](../type-aliases/ConcludeOrderArgs.md)

The ID of the order to conclude

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### connect()

> **connect**(): `Promise`\<`Address`\>

Defined in: [mintlayer-connect-sdk.ts:1166](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L1166)

Connects to the wallet and retrieves the connected addresses.

#### Returns

`Promise`\<`Address`\>

***

### createHtlc()

> **createHtlc**(`params`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:3373](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3373)

Creates a Hash Time Locked Contract (HTLC) and signs the transaction.

#### Parameters

##### params

`any`

The HTLC parameters including amount, addresses, and timelock

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### createOrder()

> **createOrder**(`__namedParameters`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:2992](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2992)

Creates a trading order and signs the transaction.

#### Parameters

##### \_\_namedParameters

[`CreateOrderArgs`](../type-aliases/CreateOrderArgs.md)

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### dataDeposit()

> **dataDeposit**(`data`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:3178](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3178)

Creates a data deposit transaction and signs it.

#### Parameters

##### data

[`DataDepositArgs`](../type-aliases/DataDepositArgs.md)

The data to deposit on the blockchain

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### decorateWithUtxoFetch()

> **decorateWithUtxoFetch**\<`T`\>(`func`): `Promise`\<\{ `result`: `T`; `utxo`: \{ `created`: `any`; `spent`: `any`; \}; \}\>

Defined in: [mintlayer-connect-sdk.ts:3666](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3666)

Decorates a function with UTXO fetching logic.
⚠️ Not thread-safe.
Do not use in parallel for the same client instance.
Intended to get utxo changes for transactions one by one.

#### Type Parameters

##### T

`T`

#### Parameters

##### func

() => `Promise`\<`T`\>

The function to decorate.

#### Returns

`Promise`\<\{ `result`: `T`; `utxo`: \{ `created`: `any`; `spent`: `any`; \}; \}\>

A promise that resolves to an object containing the result of the function **and** UTXO changes.

***

### delegate()

> **delegate**(`__namedParameters`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:2658](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2658)

Creates a delegation and signs the transaction.

#### Parameters

##### \_\_namedParameters

###### destination

`string`

###### pool_id

`string`

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### delegationCreate()

> **delegationCreate**(`__namedParameters`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:3197](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3197)

Creates a delegation ID and signs the transaction.

#### Parameters

##### \_\_namedParameters

[`DelegationCreateArgs`](../type-aliases/DelegationCreateArgs.md)

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### delegationStake()

> **delegationStake**(`params`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:3260](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3260)

Stakes tokens to a delegation and signs the transaction.

#### Parameters

##### params

[`DelegationStakeArgs`](../type-aliases/DelegationStakeArgs.md)

The delegation staking parameters including amount and delegation/pool ID

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### delegationWithdraw()

> **delegationWithdraw**(`params`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:3331](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3331)

Withdraws tokens from a delegation and signs the transaction.

#### Parameters

##### params

[`DelegationWithdrawArgs`](../type-aliases/DelegationWithdrawArgs.md)

The delegation withdrawal parameters including amount and delegation/pool ID

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

Defined in: [mintlayer-connect-sdk.ts:1176](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L1176)

Disconnects from the wallet and clears the connected addresses.

#### Returns

`Promise`\<`void`\>

***

### extractHtlcSecret()

> **extractHtlcSecret**(`arg`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:3474](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3474)

Extracts the secret from an HTLC spend transaction.

#### Parameters

##### arg

`any`

Object containing transaction_id, transaction_hex, and optional format

#### Returns

`Promise`\<`any`\>

Promise that resolves to the extracted secret

***

### fillOrder()

> **fillOrder**(`__namedParameters`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:3055](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3055)

Fills an existing trading order and signs the transaction.

#### Parameters

##### \_\_namedParameters

[`FillOrderArgs`](../type-aliases/FillOrderArgs.md)

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### freezeToken()

> **freezeToken**(`__namedParameters`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:2908](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2908)

Freezes a token to prevent transfers and signs the transaction.

#### Parameters

##### \_\_namedParameters

[`FreezeTokenArgs`](../type-aliases/FreezeTokenArgs.md)

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### getAccountOrders()

> **getAccountOrders**(): `Promise`\<`OrderData`[]\>

Defined in: [mintlayer-connect-sdk.ts:3064](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3064)

Gets all orders created by the connected account.

#### Returns

`Promise`\<`OrderData`[]\>

Promise that resolves to an array of order data

***

### getAddresses()

> **getAddresses**(): `object`

Defined in: [mintlayer-connect-sdk.ts:1223](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L1223)

Returns the connected addresses.

#### Returns

`object`

##### change

> **change**: `string`[]

##### receiving

> **receiving**: `string`[]

***

### getAvailableOrders()

> **getAvailableOrders**(): `Promise`\<`OrderData`[]\>

Defined in: [mintlayer-connect-sdk.ts:3761](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3761)

Gets all available trading orders from the network.

#### Returns

`Promise`\<`OrderData`[]\>

Promise that resolves to an array of order data

***

### getBalance()

> **getBalance**(): `Promise`\<`number`\>

Defined in: [mintlayer-connect-sdk.ts:1235](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L1235)

Returns the connected address for the current network.

#### Returns

`Promise`\<`number`\>

Balance.

***

### getBalances()

> **getBalances**(): `Promise`\<\{ `coin`: `number`; `token`: `Record`\<`string`, `number`\>; \}\>

Defined in: [mintlayer-connect-sdk.ts:1272](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L1272)

Returns the balances for coin and all tokens of the connected addresses.

#### Returns

`Promise`\<\{ `coin`: `number`; `token`: `Record`\<`string`, `number`\>; \}\>

***

### getDelegations()

> **getDelegations**(): `Promise`\<`DelegationDetails`[]\>

Defined in: [mintlayer-connect-sdk.ts:1336](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L1336)

Returns the delegations for the connected addresses.

#### Returns

`Promise`\<`DelegationDetails`[]\>

***

### getDelegationsTotal()

> **getDelegationsTotal**(): `Promise`\<`number`\>

Defined in: [mintlayer-connect-sdk.ts:1408](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L1408)

Returns the total amount of delegations for the connected addresses.

#### Returns

`Promise`\<`number`\>

***

### getFeeForType()

> **getFeeForType**(`type`): `bigint`

Defined in: [mintlayer-connect-sdk.ts:1422](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L1422)

Returns the fee for a specific transaction type.

#### Parameters

##### type

`string`

#### Returns

`bigint`

Fee in atoms.

***

### getNetwork()

> **getNetwork**(): `"testnet"` \| `"mainnet"`

Defined in: [mintlayer-connect-sdk.ts:1150](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L1150)

Returns the current network.

#### Returns

`"testnet"` \| `"mainnet"`

The current network.

***

### getTokensOwned()

> **getTokensOwned**(): `Promise`\<`string`[]\>

Defined in: [mintlayer-connect-sdk.ts:1372](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L1372)

Returns the tokens owned by the connected addresses.

#### Returns

`Promise`\<`string`[]\>

***

### getTransactionBINrepresentation()

> **getTransactionBINrepresentation**(`transactionJSONrepresentation`, `_network`): `object`

Defined in: [mintlayer-connect-sdk.ts:2266](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2266)

Returns the transaction binary representation.

#### Parameters

##### transactionJSONrepresentation

[`TransactionJSONRepresentation`](../interfaces/TransactionJSONRepresentation.md)

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

### getXPub()

> **getXPub**(): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:3709](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3709)

Gets the extended public key (xpub) from the connected wallet.

#### Returns

`Promise`\<`string`\>

Promise that resolves to the extended public key string

#### Warning

Sharing xPub exposes all derived addresses. Use with caution.

***

### isConnected()

> **isConnected**(): `boolean`

Defined in: [mintlayer-connect-sdk.ts:1158](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L1158)

Checks if the client is connected to the wallet.

#### Returns

`boolean`

True if connected, false otherwise.

***

### issueNft()

> **issueNft**(`tokenData`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:2689](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2689)

Issues an NFT and signs the transaction.

#### Parameters

##### tokenData

[`IssueNftArgs`](../type-aliases/IssueNftArgs.md)

The NFT data including metadata

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### issueToken()

> **issueToken**(`__namedParameters`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:2724](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2724)

Issues a fungible token and signs the transaction.

#### Parameters

##### \_\_namedParameters

[`IssueTokenArgs`](../type-aliases/IssueTokenArgs.md)

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### lockTokenSupply()

> **lockTokenSupply**(`token_id`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:2821](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2821)

Locks the token supply to prevent further minting and signs the transaction.

#### Parameters

##### token\_id

[`LockTokenSupplyArgs`](../type-aliases/LockTokenSupplyArgs.md)

The ID of the token to lock supply for

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### mintToken()

> **mintToken**(`__namedParameters`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:2770](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2770)

Mints tokens to a specified destination and signs the transaction.

#### Parameters

##### \_\_namedParameters

[`MintTokenArgs`](../type-aliases/MintTokenArgs.md)

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### on()

> **on**(`eventName`, `callback`): `void`

Defined in: [mintlayer-connect-sdk.ts:3748](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3748)

Registers an event listener for wallet events.

#### Parameters

##### eventName

`string`

The name of the event to listen for

##### callback

(`data`) => `void`

The callback function to execute when the event occurs

#### Returns

`void`

***

### previewUtxoChange()

> **previewUtxoChange**(`tx`): `object`

Defined in: [mintlayer-connect-sdk.ts:3571](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3571)

Returns a preview of UTXO changes (spent/created) for a built transaction.

⚠️ WARNING: This is *only* a local simulation based on the unsigned transaction.
If the transaction is not successfully broadcast to the network, these changes are NOT real.

Use this method very carefully.

#### Parameters

##### tx

`Transaction`

The transaction to preview.

#### Returns

`object`

An object containing arrays of spent and created UTXOs.

##### created

> **created**: `UtxoEntry`[]

##### spent

> **spent**: `UtxoEntry`[]

***

### refundHtlc()

> **refundHtlc**(`params`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:3417](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3417)

Refunds an HTLC after the timelock expires and signs the transaction.

#### Parameters

##### params

`any`

The refund parameters including transaction ID or UTXO

#### Returns

`Promise`\<`any`\>

Promise that resolves to a signed transaction

***

### request()

> **request**(`__namedParameters`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:1210](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L1210)

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

### requestSecretHash()

> **requestSecretHash**(`args`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:3552](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3552)

Requests a secret hash from the wallet for HTLC operations.

#### Parameters

##### args

`any`

Additional arguments (currently unused)

#### Returns

`Promise`\<`any`\>

Promise that resolves to the secret hash

***

### restore()

> **restore**(): `Promise`\<`boolean`\>

Defined in: [mintlayer-connect-sdk.ts:1184](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L1184)

Restores the session from the wallet.

#### Returns

`Promise`\<`boolean`\>

***

### setNetwork()

> **setNetwork**(`net`): `void`

Defined in: [mintlayer-connect-sdk.ts:1138](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L1138)

Sets the network for the client.

#### Parameters

##### net

`"testnet"` | `"mainnet"`

#### Returns

`void`

***

### signChallenge()

> **signChallenge**(`args`): `Promise`\<[`SignChallengeResponse`](../type-aliases/SignChallengeResponse.md)\>

Defined in: [mintlayer-connect-sdk.ts:3536](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3536)

Signs a challenge message with the given address.
Used to prove ownership of the address.

#### Parameters

##### args

[`SignChallengeArgs`](../type-aliases/SignChallengeArgs.md)

#### Returns

`Promise`\<[`SignChallengeResponse`](../type-aliases/SignChallengeResponse.md)\>

***

### signTransaction()

> **signTransaction**(`tx`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:3523](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3523)

Signs a transaction using the connected wallet.

#### Parameters

##### tx

`Transaction`

The transaction to sign

#### Returns

`Promise`\<`string`\>

Promise that resolves to the signed transaction hex

***

### spendHtlc()

> **spendHtlc**(`params`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:3461](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L3461)

Spends an HTLC by providing the secret and signs the transaction.

#### Parameters

##### params

`any`

The spend parameters including transaction ID or UTXO

#### Returns

`Promise`\<`any`\>

Promise that resolves to a signed transaction

***

### transfer()

> **transfer**(`__namedParameters`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:2603](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2603)

Transfers coins or tokens to a specified address.
If a token_id is provided, token will be transferred instead of base coin.

#### Parameters

##### \_\_namedParameters

[`TransferArgs`](../type-aliases/TransferArgs.md)

#### Returns

`Promise`\<`string`\>

A signed transaction

***

### transferNft()

> **transferNft**(`__namedParameters`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:2638](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2638)

Transfers NFT to a given address.

#### Parameters

##### \_\_namedParameters

[`TransferNftArgs`](../type-aliases/TransferNftArgs.md)

#### Returns

`Promise`\<`string`\>

A signed transaction

***

### unfreezeToken()

> **unfreezeToken**(`token_id`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:2933](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2933)

Unfreezes a previously frozen token and signs the transaction.

#### Parameters

##### token\_id

[`UnfreezeTokenArgs`](../type-aliases/UnfreezeTokenArgs.md)

The ID of the token to unfreeze

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### unmintToken()

> **unmintToken**(`__namedParameters`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:2796](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L2796)

Unmints (burns) tokens from circulation and signs the transaction.

#### Parameters

##### \_\_namedParameters

[`UnmintTokenArgs`](../type-aliases/UnmintTokenArgs.md)

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### create()

> `static` **create**(`options`): `Promise`\<`Client`\>

Defined in: [mintlayer-connect-sdk.ts:930](https://github.com/mintlayer/mintlayer-connect-sdk/blob/18f92ef844c9ea3c1db66b69d7478d674343954b/packages/sdk/src/mintlayer-connect-sdk.ts#L930)

Creates a new Client instance and initializes it.

example custom accountProvider:

```typescript
export class InMemoryAccountProvider implements AccountProvider {
  constructor(private addresses: Address[]) {}

  async connect() {
    return this.addresses;
  }

  async restore() {
    return this.addresses;
  }

  async disconnect() {
    return;
  }

  async request(params: MojitoRequest) {
    throw new Error('Signing not supported in InMemoryAccountProvider');
  }
}
```

to use:
```typescript
const client = await Client.create({
  network: 'testnet',
  autoRestore: true,
  accountProvider: new InMemoryAccountProvider({
    receiving: ['tmt1receiving'], change: ['tmt1change'],
  })
});
```

#### Parameters

##### options

`ClientOptions` = `...`

#### Returns

`Promise`\<`Client`\>
