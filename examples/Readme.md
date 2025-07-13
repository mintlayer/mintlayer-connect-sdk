# Mintlayer Connect SDK Examples

This directory contains example applications demonstrating how to use the Mintlayer Connect SDK for various use cases.

## Available Examples

### 🌐 [Demo](./demo/)
A comprehensive web-based demo showcasing all Mintlayer Connect SDK features including:
- Wallet connection and management
- Token transfers and NFT operations
- Token issuance, minting, and burning
- DEX order creation and filling
- Delegation and staking operations
- HTLC (Hash Time Locked Contracts) for atomic swaps
- Bridge requests and transaction signing

**Tech Stack:** Vanilla JavaScript + HTML + Webpack
**Network Support:** Mainnet and Testnet

### 🔄 [P2P Swap Board](./swap-board-ml-ml/)
A peer-to-peer token swap application using HTLC atomic swaps for secure token exchanges:
- Create and browse swap offers
- Accept offers and execute atomic swaps
- Real-time swap status tracking
- Wallet integration with Mojito wallet

**Tech Stack:** Next.js 14 + React + Tailwind CSS + SQLite/Prisma
**Features:** Full-stack P2P swap marketplace with database persistence

## Getting Started

Each example includes its own setup instructions. Navigate to the specific example directory and follow the README instructions.

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Mojito wallet extension (for wallet integration examples)

### Quick Start
```bash
# Navigate to desired example
cd demo  # or swap-board-ml-ml

# Install dependencies
pnpm install

# Follow example-specific instructions in their README
```

## Example Structure

- **demo/**: Interactive web demo with all SDK features
- **swap-board-ml-ml/**: Full P2P swap application
- **nodejs/**: (Coming soon) Node.js server examples
- **react-app/**: (Coming soon) React application examples

## Documentation

For detailed SDK documentation and API reference, visit the main project documentation.
