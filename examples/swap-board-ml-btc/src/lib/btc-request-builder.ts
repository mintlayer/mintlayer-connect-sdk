import { Client } from '@mintlayer/sdk'
import { BTCHTLCCreateRequest, BTCHTLCSpendRequest, BTCHTLCRefundRequest } from '../types/btc-wallet'
import { Offer, Swap } from '../types/swap'

/**
 * Convert BTC amount to satoshis
 */
export function convertToBTCSatoshis(btcAmount: string): string {
  const btc = parseFloat(btcAmount)
  const satoshis = Math.round(btc * 100000000) // 1 BTC = 100,000,000 satoshis
  return satoshis.toString()
}

/**
 * Convert satoshis to BTC
 */
export function convertFromBTCSatoshis(satoshis: string): string {
  const sats = parseInt(satoshis)
  const btc = sats / 100000000
  return btc.toString()
}

/**
 * Validate BTC address format (basic validation)
 */
export function isValidBTCAddress(address: string): boolean {
  // Basic validation - starts with 1, 3, or bc1 for mainnet, or m, 2, tb1 for testnet
  const mainnetRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/
  const testnetRegex = /^[mn2][a-km-zA-HJ-NP-Z1-9]{25,34}$|^tb1[a-z0-9]{39,59}$/
  
  return mainnetRegex.test(address) || testnetRegex.test(address)
}

/**
 * Validate BTC public key format
 */
export function isValidBTCPublicKey(publicKey: string): boolean {
  // Compressed public key: 33 bytes (66 hex chars), starts with 02 or 03
  // Uncompressed public key: 65 bytes (130 hex chars), starts with 04
  const compressedRegex = /^0[23][0-9a-fA-F]{64}$/
  const uncompressedRegex = /^04[0-9a-fA-F]{128}$/
  
  return compressedRegex.test(publicKey) || uncompressedRegex.test(publicKey)
}

/**
 * Get BTC amount from offer based on swap direction
 */
export function getBTCAmountFromOffer(offer: Offer, isCreatorSide: boolean): string {
  if (offer.tokenA === 'BTC') {
    return isCreatorSide ? offer.amountA : offer.amountB
  } else if (offer.tokenB === 'BTC') {
    return isCreatorSide ? offer.amountB : offer.amountA
  }
  throw new Error('No BTC amount found in offer')
}

/**
 * Check if offer involves BTC
 */
export function offerInvolvesBTC(offer: Offer): boolean {
  return offer.tokenA === 'BTC' || offer.tokenB === 'BTC'
}

/**
 * Check if creator is offering BTC
 */
export function isCreatorOfferingBTC(offer: Offer): boolean {
  return offer.tokenA === 'BTC'
}

/**
 * Check if taker is offering BTC (creator wants BTC)
 */
export function isTakerOfferingBTC(offer: Offer): boolean {
  return offer.tokenB === 'BTC'
}

/**
 * Build BTC HTLC create request for creator
 */
export function buildCreatorBTCHTLCRequest(
  swap: Swap,
  offer: Offer,
  secretHash: string,
  timeoutBlocks: number = 144 // ~24 hours
): BTCHTLCCreateRequest {
  if (!isCreatorOfferingBTC(offer)) {
    throw new Error('Creator is not offering BTC')
  }
  
  if (!swap.takerBTCPublicKey || !offer.creatorBTCPublicKey) {
    throw new Error('Missing required BTC public keys')
  }
  
  return {
    amount: convertToBTCSatoshis(offer.amountA),
    secretHash: secretHash,
    recipientPublicKey: swap.takerBTCPublicKey, // Taker can claim with secret
    refundPublicKey: offer.creatorBTCPublicKey, // Creator can refund after timeout
    timeoutBlocks: timeoutBlocks
  }
}

/**
 * Build BTC HTLC create request for taker
 */
export function buildTakerBTCHTLCRequest(
  swap: Swap,
  offer: Offer,
  secretHash: string,
  timeoutBlocks: number = 144 // ~24 hours
): BTCHTLCCreateRequest {
  if (!isTakerOfferingBTC(offer)) {
    throw new Error('Taker is not offering BTC')
  }
  
  if (!offer.creatorBTCPublicKey || !swap.takerBTCPublicKey) {
    throw new Error('Missing required BTC public keys')
  }
  
  return {
    amount: convertToBTCSatoshis(offer.amountB),
    secretHash: secretHash,
    recipientPublicKey: offer.creatorBTCPublicKey, // Creator can claim with secret
    refundPublicKey: swap.takerBTCPublicKey, // Taker can refund after timeout
    timeoutBlocks: timeoutBlocks
  }
}

/**
 * Build BTC HTLC spend request
 */
export function buildBTCHTLCSpendRequest(
  swap: Swap,
  secret: string,
  destinationAddress: string
): BTCHTLCSpendRequest {
  if (!swap.btcHtlcTxId || !swap.btcRedeemScript) {
    throw new Error('Missing BTC HTLC transaction ID or redeem script')
  }
  
  return {
    htlcTxId: swap.btcHtlcTxId,
    redeemScript: swap.btcRedeemScript,
    secret: secret,
    destinationAddress: destinationAddress
  }
}

/**
 * Build BTC HTLC refund request
 */
export function buildBTCHTLCRefundRequest(
  swap: Swap,
  destinationAddress: string
): BTCHTLCRefundRequest {
  if (!swap.btcHtlcTxId || !swap.btcRedeemScript) {
    throw new Error('Missing BTC HTLC transaction ID or redeem script')
  }
  
  return {
    htlcTxId: swap.btcHtlcTxId,
    redeemScript: swap.btcRedeemScript,
    destinationAddress: destinationAddress
  }
}

/**
 * Get timeout blocks for BTC HTLC based on role
 * Creator should have longer timeout than taker for security
 */
export function getBTCTimeoutBlocks(isCreator: boolean): number {
  // Creator gets longer timeout (48 hours), taker gets shorter (24 hours)
  // This ensures taker claims first, then creator can claim ML side
  return isCreator ? 288 : 144
}

/**
 * Validate swap has required BTC data for HTLC creation
 */
export function validateSwapForBTCHTLC(swap: Swap, offer: Offer): void {
  if (!offerInvolvesBTC(offer)) {
    throw new Error('Offer does not involve BTC')
  }
  
  if (isCreatorOfferingBTC(offer)) {
    if (!offer.creatorBTCAddress || !offer.creatorBTCPublicKey) {
      throw new Error('Missing creator BTC credentials')
    }
    if (!swap.takerBTCAddress || !swap.takerBTCPublicKey) {
      throw new Error('Missing taker BTC credentials')
    }
  } else {
    if (!offer.creatorBTCAddress || !offer.creatorBTCPublicKey) {
      throw new Error('Missing creator BTC credentials')
    }
    if (!swap.takerBTCAddress || !swap.takerBTCPublicKey) {
      throw new Error('Missing taker BTC credentials')
    }
  }
  
  if (!swap.secretHash) {
    throw new Error('Missing secret hash')
  }
}

/**
 * Get BTC block explorer URL for transaction
 */
export function getBTCExplorerURL(txId: string, isTestnet: boolean = true): string {
  const baseUrl = isTestnet 
    ? 'https://blockstream.info/testnet/tx/' 
    : 'https://blockstream.info/tx/'
  return `${baseUrl}${txId}`
}

/**
 * Get BTC block explorer URL for address
 */
export function getBTCAddressExplorerURL(address: string, isTestnet: boolean = true): string {
  const baseUrl = isTestnet 
    ? 'https://blockstream.info/testnet/address/' 
    : 'https://blockstream.info/address/'
  return `${baseUrl}${address}`
}
