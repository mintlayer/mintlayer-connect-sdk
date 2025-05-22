# Mintlayer Connect SDK

A lightweight JavaScript/TypeScript SDK to connect your dApp to the [Mintlayer](https://www.mintlayer.org/) blockchain. It allows you to build and request to sign transactions using a compatible wallet like Mojito.

---

## Features

* 🔐 Secure connection to Mintlayer wallets
* 📦 Transaction builder for all major transaction types
* 🧮 Type-safe interfaces (TypeScript support)
* 🔄 UTXO-based transaction handling
* 🪙 Token minting, burning, and NFT issuance

---

## Installation

```bash
npm install @mintlayer/sdk
```

or with yarn:

```bash
yarn add @mintlayer/sdk
```

---

## Usage

### 1. Connect to wallet

```ts
import { Client } from '@mintlayer/sdk';

const client = new Client();
await client.connect(); // Opens wallet connection prompt
```

---

### 2. Send Transfer

```ts
await client.transfer({
  to: 'tmt1qxyz...',            // recipient address
  amount: 10,                   // in human-readable units
  token_id: 'tmltk1...',        // optional, omit for base coin
});
```

---

### 3. Build transaction manually

```ts
const tx = await client.buildTransaction({
  type: 'BurnToken',
  params: {
    amount: 10,
    token_id: 'tmltk1...',
    token_details: {
      authority: 'tmt1q...',
      number_of_decimals: 8,
      // ... other metadata
    },
  },
});
```

---

### 4. Sign transaction

TODO

---

## Supported transaction types

* `Transfer`
* `BurnToken`
* `IssueFungibleToken`
* `IssueNft`
* `MintToken`
* `UnmintToken`
* `LockTokenSupply`
* `ChangeMetadataUri`
* `ChangeTokenAuthority`
* `FreezeToken`
* `UnfreezeToken`
* `DataDeposit`
* `CreateDelegationId`
* `DelegationStake`
* `DelegationWithdraw`
* `CreateOrder`
* `ConcludeOrder`
* `FillOrder`

---

## Development & Testing

* Clone the repo and run `npm install`
* More tests coming soon (Jest + mocks)
* Contributions welcome!

---

## Security

All sensitive actions (signing, wallet access) require user approval via the wallet. Private keys are never exposed.

---

## License

MIT

---

## Need help?

Join the community or open an issue on [GitHub](https://github.com/mintlayer/mintlayer-connect-sdk).
