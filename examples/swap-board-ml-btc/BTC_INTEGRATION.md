# BTC Integration for Mintlayer P2P Swap Board

This document describes the Bitcoin (BTC) integration added to the swap board, enabling atomic swaps between Mintlayer tokens and native Bitcoin.

## Overview

The BTC integration allows users to:
- Create offers involving BTC (BTC → ML tokens or ML tokens → BTC)
- Accept BTC offers by providing BTC credentials
- Create BTC HTLCs for atomic swaps
- Claim and refund BTC HTLCs
- Track BTC transactions on blockchain explorers

## Architecture

### Wallet-Centric Design
- **Web App**: Builds requests and manages UI/coordination
- **Wallet Extension**: Handles all BTC cryptographic operations
- **No Private Keys**: Web app never handles BTC private keys

### Key Components

#### 1. Database Schema (`prisma/schema.prisma`)
**Offer Model Additions:**
- `creatorBTCAddress`: Creator's BTC address
- `creatorBTCPublicKey`: Creator's BTC public key for HTLC creation

**Swap Model Additions:**
- `takerBTCAddress`: Taker's BTC address  
- `takerBTCPublicKey`: Taker's BTC public key for HTLC creation
- `btcHtlcAddress`: Generated BTC HTLC contract address
- `btcRedeemScript`: BTC HTLC redeem script
- `btcHtlcTxId`: BTC HTLC funding transaction ID
- `btcHtlcTxHex`: BTC HTLC signed transaction hex
- `btcClaimTxId`: BTC claim transaction ID
- `btcClaimTxHex`: BTC claim signed transaction hex
- `btcRefundTxId`: BTC refund transaction ID
- `btcRefundTxHex`: BTC refund signed transaction hex

#### 2. Type Definitions (`src/types/`)
- `btc-wallet.ts`: Wallet interface definitions
- `swap.ts`: Updated with BTC fields and new status types

#### 3. BTC Utilities (`src/lib/btc-request-builder.ts`)
- Amount conversion (BTC ↔ satoshis)
- Address and public key validation
- HTLC request builders
- Explorer URL generators

#### 4. API Endpoints
- **POST /api/offers**: Validates BTC credentials for BTC offers
- **POST /api/swaps**: Handles BTC credentials during offer acceptance
- **POST /api/swaps/[id]**: Updates swaps with BTC transaction data

#### 5. Frontend Components
- **Create Offer**: Requests BTC credentials when BTC is involved
- **Offers List**: Handles BTC credential exchange during acceptance
- **Swap Detail**: Full BTC HTLC management interface

## Wallet Integration Requirements

The wallet extension must implement these methods:

```typescript
interface BTCWalletMethods {
  // Get user's BTC receiving address
  getBTCAddress(): Promise<string>
  
  // Get user's BTC public key for HTLC creation
  getBTCPublicKey(): Promise<string>
  
  // Create BTC HTLC transaction
  createBTCHTLC(request: BTCHTLCCreateRequest): Promise<BTCHTLCCreateResponse>
  
  // Spend/claim BTC HTLC
  spendBTCHTLC(request: BTCHTLCSpendRequest): Promise<BTCHTLCSpendResponse>
  
  // Refund BTC HTLC after timeout
  refundBTCHTLC(request: BTCHTLCRefundRequest): Promise<BTCHTLCSpendResponse>
  
  // Broadcast BTC transaction to network
  broadcastBTCTransaction(txHex: string): Promise<BTCBroadcastResponse>
}
```

### Request/Response Types

```typescript
interface BTCHTLCCreateRequest {
  amount: string // in satoshis
  secretHash: string // hex format
  recipientPublicKey: string // who can claim with secret
  refundPublicKey: string // who can refund after timeout
  timeoutBlocks: number // BTC blocks
}

interface BTCHTLCCreateResponse {
  signedTxHex: string // ready to broadcast
  transactionId: string // transaction ID
  htlcAddress: string // HTLC contract address
  redeemScript: string // for spending operations
}
```

## Swap Flow

### ML → BTC Swap
1. **Creator creates offer**: Provides BTC address + public key
2. **Taker accepts**: Provides their BTC address + public key  
3. **Creator creates ML HTLC**: Standard Mintlayer HTLC
4. **Taker creates BTC HTLC**: Using creator's public key as recipient
5. **Creator claims BTC**: Uses secret to spend BTC HTLC
6. **Taker claims ML**: Uses revealed secret to claim ML HTLC

### BTC → ML Swap
1. **Creator creates offer**: Provides BTC address + public key
2. **Taker accepts**: Provides their BTC address + public key
3. **Creator creates BTC HTLC**: Using taker's public key as recipient
4. **Taker creates ML HTLC**: Standard Mintlayer HTLC
5. **Taker claims BTC**: Uses secret to spend BTC HTLC
6. **Creator claims ML**: Uses revealed secret to claim ML HTLC

## Status Tracking

New swap statuses:
- `btc_htlc_created`: BTC HTLC has been created
- `both_htlcs_created`: Both ML and BTC HTLCs exist
- `btc_refunded`: BTC side was refunded

## Security Considerations

### Public Key Exchange
- Public keys are required for HTLC script generation
- Keys are stored in database (consider privacy implications)
- Keys are visible to counterparty (required for HTLC creation)

### Timelock Coordination
- BTC timelock should be shorter than ML timelock
- Ensures proper claim ordering for security

### Atomic Guarantees
- Same secret hash used for both chains
- Standard HTLC atomic swap properties maintained
- Manual refund available after timelock expiry

## Testing

Run the integration test:
```bash
node test-btc-integration.js
```

## Development Status

### ✅ Completed
- Database schema with BTC fields
- Type definitions and interfaces
- BTC utility functions
- API endpoint updates
- Frontend BTC integration
- Status tracking and UI

### 🔄 Pending (Wallet Extension)
- BTC wallet method implementations
- BTC HTLC script generation
- BTC transaction building and signing
- BTC network integration
- Secret extraction from BTC claims

### 🧪 Testing Needed
- End-to-end BTC swap testing
- Error handling and edge cases
- Network compatibility (testnet/mainnet)
- Performance optimization

## Next Steps

1. **Implement wallet BTC methods** in browser extension
2. **Test with actual BTC transactions** on testnet
3. **Add comprehensive error handling**
4. **Optimize user experience** and add loading states
5. **Add transaction monitoring** and confirmation tracking
6. **Security audit** of BTC integration

## Support

For questions about the BTC integration:
- Check the test file for usage examples
- Review the utility functions in `btc-request-builder.ts`
- Examine the swap detail page for UI implementation
- Test with the provided mock data structures
