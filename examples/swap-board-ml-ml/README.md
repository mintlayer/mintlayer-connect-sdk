# Mintlayer P2P Swap Board

A minimal peer-to-peer token swap board for Mintlayer tokens using HTLC (Hash Time Locked Contracts) atomic swaps.

## Features

- **Create Swap Offers**: Post your intent to swap one Mintlayer token for another
- **Browse & Accept Offers**: View available offers and accept the ones that interest you
- **Atomic Swaps**: Secure token exchanges using HTLC contracts via mintlayer-connect-sdk
- **Status Tracking**: Real-time monitoring of swap progress with clear status indicators
- **Wallet Integration**: Connect with Mojito wallet for seamless transactions

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + React + Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: SQLite with Prisma ORM
- **Blockchain**: Mintlayer Connect SDK for HTLC operations
- **Package Manager**: pnpm (workspace integration)

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm
- Mojito wallet extension

### Installation

1. Install dependencies:
```bash
cd examples/swap-board-ml-ml
pnpm install
```

2. Set up the database:
```bash
pnpm db:generate
pnpm db:push
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Start the development server:
```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Creating an Offer

1. Navigate to `/create`
2. Connect your Mojito wallet
3. Fill in the swap details:
   - Token to give (Token ID)
   - Amount to give
   - Token to receive (Token ID)
   - Amount to receive
   - Optional contact information
4. Submit the offer

### Accepting an Offer

1. Browse offers at `/offers`
2. Connect your wallet
3. Click "Accept Offer" on any available offer
4. You'll be redirected to the swap progress page

### Monitoring Swaps

1. Visit `/swap/[id]` to track swap progress
2. The page shows:
   - Current swap status
   - Progress steps
   - Next actions required
   - HTLC details when available

## Swap Process

1. **Offer Created**: User posts swap intention
2. **Offer Accepted**: Another user accepts the offer
3. **HTLC Creation**: Creator creates initial HTLC with secret hash
4. **Counterparty HTLC**: Taker creates matching HTLC
5. **Token Claiming**: Both parties reveal secrets to claim tokens
6. **Completion**: Swap finalized or manually refunded after timelock expires

## Database Schema

### Offer Model
- Stores swap offers with token details and creator information
- Tracks offer status (open, taken, completed, cancelled)

### Swap Model
- Manages active swaps linked to offers
- Stores HTLC secrets, transaction hashes, and status updates
- Tracks swap progress from pending to completion

## API Endpoints

- `GET/POST /api/offers` - List and create swap offers
- `POST /api/swaps` - Accept an offer (creates new swap)
- `GET/POST /api/swaps/[id]` - Get and update swap status

## Development

### Database Operations

```bash
# Generate Prisma client
pnpm db:generate

# Push schema changes
pnpm db:push

# Open database browser
pnpm db:studio
```

### Building

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Security Considerations

- HTLC contracts provide atomic swap guarantees
- Timelock mechanisms prevent indefinite locks - users must manually refund after expiry
- No private keys are stored in the database
- All transactions require wallet confirmation

## Contributing

This is a minimal example implementation. For production use, consider:

- Enhanced error handling and validation
- Comprehensive testing suite
- Rate limiting and spam protection
- Advanced UI/UX improvements
- Mobile responsiveness optimization
- Real-time notifications

## License

This project is part of the Mintlayer Connect SDK examples.
