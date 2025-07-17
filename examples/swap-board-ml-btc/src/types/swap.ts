export interface Offer {
  id: number
  direction: string
  tokenA: string
  tokenB: string
  amountA: string
  amountB: string
  price: number
  creatorMLAddress: string
  creatorBTCAddress?: string      // Creator's BTC address (when offering BTC)
  creatorBTCPublicKey?: string    // Creator's BTC public key (when offering BTC)
  contact?: string
  status: 'open' | 'taken' | 'completed' | 'cancelled'
  createdAt: Date
}

export type SwapStatus =
  | 'pending'
  | 'htlc_created'
  | 'btc_htlc_created'     // BTC HTLC has been created
  | 'both_htlcs_created'   // Both ML and BTC HTLCs exist
  | 'in_progress'
  | 'completed'
  | 'fully_completed'
  | 'refunded'
  | 'btc_refunded'         // BTC side was refunded

export interface Swap {
  id: number
  offerId: number
  takerMLAddress: string
  takerBTCAddress?: string        // Taker's BTC address (when accepting BTC offer)
  takerBTCPublicKey?: string      // Taker's BTC public key (when accepting BTC offer)
  status: SwapStatus
  secretHash?: string
  secret?: string

  // Mintlayer HTLC fields
  creatorHtlcTxHash?: string
  creatorHtlcTxHex?: string
  takerHtlcTxHash?: string
  takerHtlcTxHex?: string
  claimTxHash?: string
  claimTxHex?: string

  // BTC HTLC contract details
  btcHtlcAddress?: string         // Generated BTC HTLC contract address
  btcRedeemScript?: string        // BTC HTLC redeem script

  // BTC transaction tracking
  btcHtlcTxId?: string           // BTC HTLC funding transaction ID
  btcHtlcTxHex?: string          // BTC HTLC signed transaction hex
  btcClaimTxId?: string          // BTC claim transaction ID
  btcClaimTxHex?: string         // BTC claim signed transaction hex
  btcRefundTxId?: string         // BTC refund transaction ID
  btcRefundTxHex?: string        // BTC refund signed transaction hex

  createdAt: Date
  offer?: Offer
}

export interface CreateOfferRequest {
  tokenA: string
  tokenB: string
  amountA: string
  amountB: string
  creatorMLAddress: string
  creatorBTCAddress?: string      // Creator's BTC address (when offering BTC)
  creatorBTCPublicKey?: string    // Creator's BTC public key (when offering BTC)
  contact?: string
}

export interface AcceptOfferRequest {
  offerId: number
  takerMLAddress: string
  takerBTCAddress?: string        // Taker's BTC address (when accepting BTC offer)
  takerBTCPublicKey?: string      // Taker's BTC public key (when accepting BTC offer)
}

export interface UpdateSwapRequest {
  status?: SwapStatus
  secretHash?: string
  secret?: string

  // Mintlayer HTLC updates
  creatorHtlcTxHash?: string
  creatorHtlcTxHex?: string
  takerHtlcTxHash?: string
  takerHtlcTxHex?: string
  claimTxHash?: string
  claimTxHex?: string

  // BTC HTLC updates
  btcHtlcAddress?: string
  btcRedeemScript?: string
  btcHtlcTxId?: string
  btcHtlcTxHex?: string
  btcClaimTxId?: string
  btcClaimTxHex?: string
  btcRefundTxId?: string
  btcRefundTxHex?: string
}
