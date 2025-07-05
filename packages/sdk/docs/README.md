**@mintlayer/sdk**

***

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

Since version 1.0.17 the SDK supports signing transactions using class Signer:

```ts
import { Signer } from '@mintlayer/sdk';
 
const private_keys = {
    'tmt1qxyz...': new Uint8Array([0,0,0,...]) // Replace with actual private key bytes
};

const signer = new Signer(private_keys);

const transaction = await client.buildTransaction({
  type: 'Transfer',
  params: {
    to: 'tmt1qxyz...', // recipient address
    amount: 10,        // in human-readable units
  },
});

const signed_transaction = await signer.signTransaction(transaction);
```

To use helper methods, you have to implement AccountProvider interface that will handle connection and signing requests. By default, SDK communicates to Mojito Account Provider. Here's an example implementation:

```ts
class MyAccountProvider implements AccountProvider {
  async connect() {
    return addresses; // Replace with actual addresses
  }

  async restore() {
    return addresses;
  }

  async disconnect() {
    return Promise.resolve()
  }

  async request(method, params) {
    if( method === 'signTransaction') {
      const signer = new Signer(private_keys);
      const transaction_signed = signer.sign(params.txData);

      return Promise.resolve(transaction_signed);
    }
    throw new Error(`Method ${method} not implemented`);
  }
}

const client = await Client.create({
  network: 'testnet',
  autoRestore: false,
  accountProvider: new MyAccountProvider()
});

await client.connect();

const signed_transaction = await client.transfer({
  to: 'tmt1q9mfg7d6ul2nt5yhmm7l7r6wwyqkd822rymr83uc',
  amount: 10,
});
```

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
