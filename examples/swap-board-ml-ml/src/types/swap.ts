export interface Offer {
  id: number
  direction: string
  tokenA: string
  tokenB: string
  amountA: string
  amountB: string
  price: number
  creatorMLAddress: string
  contact?: string
  status: 'open' | 'taken' | 'completed' | 'cancelled'
  createdAt: Date
}

export interface Swap {
  id: number
  offerId: number
  takerMLAddress: string
  status: 'pending' | 'htlc_created' | 'in_progress' | 'completed' | 'refunded'
  secretHash?: string
  secret?: string
  creatorHtlcTxHash?: string
  creatorHtlcTxHex?: string
  takerHtlcTxHash?: string
  takerHtlcTxHex?: string
  claimTxHash?: string
  claimTxHex?: string
  createdAt: Date
  offer?: Offer
}

export interface CreateOfferRequest {
  tokenA: string
  tokenB: string
  amountA: string
  amountB: string
  creatorMLAddress: string
  contact?: string
}

export interface AcceptOfferRequest {
  offerId: number
  takerMLAddress: string
}

export interface UpdateSwapRequest {
  status?: Swap['status']
  secretHash?: string
  secret?: string
  creatorHtlcTxHash?: string
  creatorHtlcTxHex?: string
  takerHtlcTxHash?: string
  takerHtlcTxHex?: string
  claimTxHash?: string
  claimTxHex?: string
}
