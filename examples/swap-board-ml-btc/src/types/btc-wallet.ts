/**
 * BTC wallet integration types for HTLC atomic swaps
 */

export interface BTCHTLCCreateRequest {
  amount: string // in satoshis
  secretHash: string // hex format
  recipientPublicKey: string // recipient's BTC public key (for claiming with secret)
  refundPublicKey: string // refund public key (for timeout refund)
  timeoutBlocks: number // BTC blocks
}

export interface BTCHTLCCreateResponse {
  signedTxHex: string // ready to broadcast
  transactionId: string // transaction ID of the funding transaction
  htlcAddress: string // generated HTLC contract address
  redeemScript: string // for spending operations
}

export interface BTCHTLCSpendRequest {
  htlcTxId: string
  redeemScript: string
  secret: string // to claim
  destinationAddress: string
}

export interface BTCHTLCRefundRequest {
  htlcTxId: string
  redeemScript: string
  destinationAddress: string
}

export interface BTCHTLCSpendResponse {
  signedTxHex: string
  transactionId: string
}

export interface BTCBroadcastResponse {
  txId: string
}

/**
 * Extended wallet interface for BTC operations
 */
export interface BTCWalletMethods {
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
