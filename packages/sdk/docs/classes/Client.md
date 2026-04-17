[**@mintlayer/sdk**](../README.md)

***

Defined in: [mintlayer-connect-sdk.ts:1201](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L1201)

## Constructors

### Constructor

> **new Client**(`options`): `Client`

Defined in: [mintlayer-connect-sdk.ts:1219](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L1219)

Creates a new Client instance.

#### Parameters

##### options

`ClientOptions` = `{}`

#### Returns

`Client`

## Properties

### isMintlayer

> `readonly` **isMintlayer**: `boolean` = `true`

Defined in: [mintlayer-connect-sdk.ts:1475](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L1475)

Returns the transaction ID.

## Methods

### bridgeRequest()

> **bridgeRequest**(`__namedParameters`): `Promise`\<`SignedIntentTransaction`\>

Defined in: [mintlayer-connect-sdk.ts:3402](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3402)

Creates a bridge request transaction and signs it.

#### Parameters

##### \_\_namedParameters

[`BridgeRequestArgs`](../type-aliases/BridgeRequestArgs.md)

#### Returns

`Promise`\<`SignedIntentTransaction`\>

Promise that resolves to a signed transaction

***

### broadcastTx()

> **broadcastTx**(`tx`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:4011](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L4011)

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

Defined in: [mintlayer-connect-sdk.ts:3378](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3378)

Builds a bridge request transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`BridgeRequestArgs`](../type-aliases/BridgeRequestArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildBurn()

> **buildBurn**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3410](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3410)

Builds a burn transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`BurnArgs`](../type-aliases/BurnArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildChangeMetadataUri()

> **buildChangeMetadataUri**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3169](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3169)

Builds a token metadata URI change transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`ChangeMetadataUriArgs`](../type-aliases/ChangeMetadataUriArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildChangeTokenAuthority()

> **buildChangeTokenAuthority**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3144](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3144)

Builds a token authority change transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`ChangeTokenAuthorityArgs`](../type-aliases/ChangeTokenAuthorityArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildConcludeOrder()

> **buildConcludeOrder**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3358](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3358)

Builds an order conclusion transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`ConcludeOrderArgs`](../type-aliases/ConcludeOrderArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildCreateHtlc()

> **buildCreateHtlc**(`params`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3593](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3593)

Builds an HTLC creation transaction without signing it.

#### Parameters

##### params

`CreateHtlcArgs`

#### Returns

`Promise`\<`Transaction`\>

***

### buildCreateOrder()

> **buildCreateOrder**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3240](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3240)

Builds an order creation transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`CreateOrderArgs`](../type-aliases/CreateOrderArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildDataDeposit()

> **buildDataDeposit**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3435](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3435)

Builds a data deposit transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`DataDepositArgs`](../type-aliases/DataDepositArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildDelegate()

> **buildDelegate**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:2974](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L2974)

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

Defined in: [mintlayer-connect-sdk.ts:3453](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3453)

Builds a delegation creation transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`DelegationCreateArgs`](../type-aliases/DelegationCreateArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildDelegationStake()

> **buildDelegationStake**(`params`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3472](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3472)

Builds a delegation staking transaction without signing it.

#### Parameters

##### params

[`DelegationStakeArgs`](../type-aliases/DelegationStakeArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildDelegationWithdraw()

> **buildDelegationWithdraw**(`params`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3532](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3532)

Builds a delegation withdrawal transaction without signing it.

#### Parameters

##### params

[`DelegationWithdrawArgs`](../type-aliases/DelegationWithdrawArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildFillOrder()

> **buildFillOrder**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3303](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3303)

Builds an order fill transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`FillOrderArgs`](../type-aliases/FillOrderArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildFreezeToken()

> **buildFreezeToken**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3194](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3194)

Builds a token freezing transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`FreezeTokenArgs`](../type-aliases/FreezeTokenArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildIssueNft()

> **buildIssueNft**(`tokenData`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:2993](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L2993)

Builds an NFT issuance transaction without signing it.

#### Parameters

##### tokenData

[`IssueNftArgs`](../type-aliases/IssueNftArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildIssueToken()

> **buildIssueToken**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3024](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3024)

Builds a fungible token issuance transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`IssueTokenArgs`](../type-aliases/IssueTokenArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildLockTokenSupply()

> **buildLockTokenSupply**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3123](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3123)

Builds a token supply locking transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`LockTokenSupplyArgs`](../type-aliases/LockTokenSupplyArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildMintToken()

> **buildMintToken**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3075](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3075)

Builds a token minting transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`MintTokenArgs`](../type-aliases/MintTokenArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildRefundHtlc()

> **buildRefundHtlc**(`params`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3633](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3633)

Builds an HTLC refund transaction without signing it.

#### Parameters

##### params

`any`

#### Returns

`Promise`\<`Transaction`\>

***

### buildSpendHtlc()

> **buildSpendHtlc**(`params`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3685](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3685)

Builds an HTLC spend transaction without signing it.

#### Parameters

##### params

`any`

#### Returns

`Promise`\<`Transaction`\>

***

### buildTransaction()

> **buildTransaction**(`arg`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:2410](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L2410)

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

Defined in: [mintlayer-connect-sdk.ts:2914](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L2914)

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

Defined in: [mintlayer-connect-sdk.ts:2945](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L2945)

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

Defined in: [mintlayer-connect-sdk.ts:3219](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3219)

Builds a token unfreezing transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`UnfreezeTokenArgs`](../type-aliases/UnfreezeTokenArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### buildUnmintToken()

> **buildUnmintToken**(`__namedParameters`): `Promise`\<`Transaction`\>

Defined in: [mintlayer-connect-sdk.ts:3101](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3101)

Builds a token unminting transaction without signing it.

#### Parameters

##### \_\_namedParameters

[`UnmintTokenArgs`](../type-aliases/UnmintTokenArgs.md)

#### Returns

`Promise`\<`Transaction`\>

***

### burn()

> **burn**(`__namedParameters`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:3427](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3427)

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

Defined in: [mintlayer-connect-sdk.ts:3186](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3186)

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

Defined in: [mintlayer-connect-sdk.ts:3161](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3161)

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

Defined in: [mintlayer-connect-sdk.ts:3370](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3370)

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

Defined in: [mintlayer-connect-sdk.ts:1509](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L1509)

Connects to the wallet and retrieves the connected addresses.

#### Returns

`Promise`\<`Address`\>

***

### createHtlc()

> **createHtlc**(`params`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:3625](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3625)

Creates a Hash Time Locked Contract (HTLC) and signs the transaction.

#### Parameters

##### params

`CreateHtlcArgs`

The HTLC parameters including amount, addresses, and timelock

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### createOrder()

> **createOrder**(`__namedParameters`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:3283](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3283)

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

Defined in: [mintlayer-connect-sdk.ts:3445](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3445)

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

Defined in: [mintlayer-connect-sdk.ts:3957](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3957)

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

Defined in: [mintlayer-connect-sdk.ts:2985](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L2985)

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

Defined in: [mintlayer-connect-sdk.ts:3464](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3464)

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

Defined in: [mintlayer-connect-sdk.ts:3524](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3524)

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

Defined in: [mintlayer-connect-sdk.ts:3585](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3585)

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

Defined in: [mintlayer-connect-sdk.ts:1520](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L1520)

Disconnects from the wallet and clears the connected addresses.

#### Returns

`Promise`\<`void`\>

***

### extractHtlcSecret()

> **extractHtlcSecret**(`arg`): `Promise`\<`any`\>

Defined in: [mintlayer-connect-sdk.ts:3742](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3742)

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

Defined in: [mintlayer-connect-sdk.ts:3334](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3334)

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

Defined in: [mintlayer-connect-sdk.ts:3211](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3211)

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

Defined in: [mintlayer-connect-sdk.ts:3343](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3343)

Gets all orders created by the connected account.

#### Returns

`Promise`\<`OrderData`[]\>

Promise that resolves to an array of order data

***

### getAddresses()

> **getAddresses**(): `object`

Defined in: [mintlayer-connect-sdk.ts:1567](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L1567)

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

Defined in: [mintlayer-connect-sdk.ts:4034](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L4034)

Gets all available trading orders from the network.

#### Returns

`Promise`\<`OrderData`[]\>

Promise that resolves to an array of order data

***

### getBalance()

> **getBalance**(): `Promise`\<`number`\>

Defined in: [mintlayer-connect-sdk.ts:1579](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L1579)

Returns the connected address for the current network.

#### Returns

`Promise`\<`number`\>

Balance.

***

### getBalances()

> **getBalances**(): `Promise`\<\{ `coin`: `number`; `token`: `Record`\<`string`, `number`\>; \}\>

Defined in: [mintlayer-connect-sdk.ts:1616](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L1616)

Returns the balances for coin and all tokens of the connected addresses.

#### Returns

`Promise`\<\{ `coin`: `number`; `token`: `Record`\<`string`, `number`\>; \}\>

***

### getDelegations()

> **getDelegations**(): `Promise`\<`DelegationDetails`[]\>

Defined in: [mintlayer-connect-sdk.ts:1679](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L1679)

Returns the delegations for the connected addresses.

#### Returns

`Promise`\<`DelegationDetails`[]\>

***

### getDelegationsTotal()

> **getDelegationsTotal**(): `Promise`\<`number`\>

Defined in: [mintlayer-connect-sdk.ts:1749](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L1749)

Returns the total amount of delegations for the connected addresses.

#### Returns

`Promise`\<`number`\>

***

### getFeeForType()

> **getFeeForType**(`type`): `bigint`

Defined in: [mintlayer-connect-sdk.ts:1763](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L1763)

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

Defined in: [mintlayer-connect-sdk.ts:1493](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L1493)

Returns the current network.

#### Returns

`"mainnet"` \| `"testnet"`

The current network.

***

### getTokensOwned()

> **getTokensOwned**(): `Promise`\<`string`[]\>

Defined in: [mintlayer-connect-sdk.ts:1714](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L1714)

Returns the tokens owned by the connected addresses.

#### Returns

`Promise`\<`string`[]\>

***

### getTransactionBINrepresentation()

> **getTransactionBINrepresentation**(`transactionJSONrepresentation`, `_network`): `object`

Defined in: [mintlayer-connect-sdk.ts:2601](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L2601)

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

Defined in: [mintlayer-connect-sdk.ts:4000](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L4000)

Gets the extended public key (xpub) from the connected wallet.

#### Returns

`Promise`\<`string`\>

Promise that resolves to the extended public key string

#### Warning

Sharing xPub exposes all derived addresses. Use with caution.

***

### isConnected()

> **isConnected**(): `boolean`

Defined in: [mintlayer-connect-sdk.ts:1501](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L1501)

Checks if the client is connected to the wallet.

#### Returns

`boolean`

True if connected, false otherwise.

***

### issueNft()

> **issueNft**(`tokenData`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:3016](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3016)

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

Defined in: [mintlayer-connect-sdk.ts:3051](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3051)

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

Defined in: [mintlayer-connect-sdk.ts:3136](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3136)

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

Defined in: [mintlayer-connect-sdk.ts:3093](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3093)

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

Defined in: [mintlayer-connect-sdk.ts:4021](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L4021)

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

Defined in: [mintlayer-connect-sdk.ts:3862](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3862)

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

Defined in: [mintlayer-connect-sdk.ts:3677](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3677)

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

Defined in: [mintlayer-connect-sdk.ts:1554](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L1554)

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

Defined in: [mintlayer-connect-sdk.ts:3843](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3843)

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

Defined in: [mintlayer-connect-sdk.ts:1528](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L1528)

Restores the session from the wallet.

#### Returns

`Promise`\<`boolean`\>

***

### setNetwork()

> **setNetwork**(`net`): `void`

Defined in: [mintlayer-connect-sdk.ts:1481](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L1481)

Sets the network for the client.

#### Parameters

##### net

`"mainnet"` | `"testnet"`

#### Returns

`void`

***

### signChallenge()

> **signChallenge**(`args`): `Promise`\<[`SignChallengeResponse`](../type-aliases/SignChallengeResponse.md)\>

Defined in: [mintlayer-connect-sdk.ts:3808](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3808)

Signs a challenge message with the given address.
Used to prove ownership of the address.

#### Parameters

##### args

[`SignChallengeArgs`](../type-aliases/SignChallengeArgs.md)

#### Returns

`Promise`\<[`SignChallengeResponse`](../type-aliases/SignChallengeResponse.md)\>

***

### signIntentTransaction()

> **signIntentTransaction**(`tx`): `Promise`\<`SignedIntentTransaction`\>

Defined in: [mintlayer-connect-sdk.ts:3795](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3795)

#### Parameters

##### tx

`Transaction`

#### Returns

`Promise`\<`SignedIntentTransaction`\>

***

### signTransaction()

> **signTransaction**(`tx`): `Promise`\<`string`\>

Defined in: [mintlayer-connect-sdk.ts:3787](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3787)

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

Defined in: [mintlayer-connect-sdk.ts:3729](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3729)

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

Defined in: [mintlayer-connect-sdk.ts:2934](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L2934)

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

Defined in: [mintlayer-connect-sdk.ts:2965](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L2965)

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

Defined in: [mintlayer-connect-sdk.ts:3232](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3232)

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

Defined in: [mintlayer-connect-sdk.ts:3115](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3115)

Unmints (burns) tokens from circulation and signs the transaction.

#### Parameters

##### \_\_namedParameters

[`UnmintTokenArgs`](../type-aliases/UnmintTokenArgs.md)

#### Returns

`Promise`\<`string`\>

Promise that resolves to a signed transaction

***

### verifyChallenge()

> **verifyChallenge**(`args`): `Promise`\<`boolean`\>

Defined in: [mintlayer-connect-sdk.ts:3828](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L3828)

Verifies a signed challenge message.
Used to verify that a signature was produced by the private key corresponding to the given address.

Note: The provided address must be a 'pubkeyhash' address.

#### Parameters

##### args

[`VerifyChallengeArgs`](../type-aliases/VerifyChallengeArgs.md)

Object containing message, address, and signature

#### Returns

`Promise`\<`boolean`\>

Promise that resolves to true if the signature is valid, throws an error otherwise

***

### create()

> `static` **create**(`options`): `Promise`\<`Client`\>

Defined in: [mintlayer-connect-sdk.ts:1276](https://github.com/mintlayer/mintlayer-connect-sdk/blob/c2e3af8c362a53736f94c0d91571f12868b57f86/packages/sdk/src/mintlayer-connect-sdk.ts#L1276)

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
