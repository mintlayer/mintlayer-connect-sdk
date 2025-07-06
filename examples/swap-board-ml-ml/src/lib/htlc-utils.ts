import { Client } from '@mintlayer/sdk'

export interface HTLCParams {
  amount: string
  token_id?: string | null
  secret_hash: any
  spend_address: string
  refund_address: string
  refund_timelock: {
    type: 'ForBlockCount' | 'UntilTime'
    content: number | string
  }
}

export interface SecretHashResponse {
  secret: string
  secret_hash_hex: string
  secret_hash: {
    hex: string
    string?: string | null
  }
}

/**
 * Generate a secret hash using the wallet
 */
export async function generateSecretHash(client: Client): Promise<SecretHashResponse> {
  return await client.requestSecretHash({})
}

/**
 * Create an HTLC with the given parameters and broadcast it
 */
export async function createHTLC(client: Client, params: HTLCParams): Promise<{ txHex: string, txId: string }> {
  // Sign the transaction
  const signedTxHex = await client.createHtlc(params)

  // Broadcast to network
  const broadcastResult = await client.broadcastTx(signedTxHex)
  const txId = broadcastResult.tx_id || broadcastResult.transaction_id || broadcastResult.id

  return { txHex: signedTxHex, txId }
}

/**
 * Build HTLC parameters for a swap offer (creator's HTLC)
 */
export function buildHTLCParams(
  offer: any,
  secretHash: any,
  spendAddress: string,
  refundAddress: string,
  timelockBlocks: number = 144 // ~24 hours
): HTLCParams {
  return {
    amount: offer.amountA,
    token_id: offer.tokenA === 'ML' ? null : offer.tokenA,
    secret_hash: { hex: secretHash.secret_hash_hex },
    spend_address: spendAddress,
    refund_address: refundAddress,
    refund_timelock: {
      type: 'ForBlockCount',
      content: timelockBlocks
    }
  }
}

/**
 * Build counterparty HTLC parameters (taker's HTLC)
 */
export function buildCounterpartyHTLCParams(
  offer: any,
  secretHashHex: string,
  spendAddress: string,
  refundAddress: string,
  timelockBlocks: number = 144 // ~24 hours
): HTLCParams {
  return {
    amount: offer.amountB, // Taker gives amountB
    token_id: offer.tokenB === 'ML' ? null : offer.tokenB,
    secret_hash: { hex: secretHashHex }, // Use same secret hash as creator
    spend_address: spendAddress, // Creator can spend with secret
    refund_address: refundAddress, // Taker can refund after timelock
    refund_timelock: {
      type: 'ForBlockCount',
      content: timelockBlocks
    }
  }
}

/**
 * Extract secret from a completed HTLC claim transaction
 * @param client - Mintlayer client
 * @param claimTransactionId - The transaction ID that claimed/spent the HTLC
 * @param claimTransactionHex - The signed claim transaction hex (contains the secret)
 * @returns The extracted secret in hex format
 */
export async function extractHTLCSecret(
  client: Client,
  claimTransactionId: string,
  claimTransactionHex: string
): Promise<string> {
  return await client.extractHtlcSecret({
    transaction_id: claimTransactionId,
    transaction_hex: claimTransactionHex,
    format: 'hex'
  })
}

/**
 * Create and broadcast an HTLC, returning both transaction ID and hex
 */
export async function createAndBroadcastHTLC(
  client: Client,
  params: HTLCParams
): Promise<{ txId: string, txHex: string }> {
  // Step 1: Sign the transaction
  const signedTxHex = await client.createHtlc(params)

  // Step 2: Broadcast to network
  const broadcastResult = await client.broadcastTx(signedTxHex)
  const txId = broadcastResult.tx_id || broadcastResult.transaction_id || broadcastResult.id

  return { txId, txHex: signedTxHex }
}

/**
 * Claim/spend an HTLC
 * @param client - Mintlayer client
 * @param htlcTxHash - Hash of the HTLC transaction to spend
 * @param secret - Secret to reveal (optional if wallet has it)
 */
export async function claimHTLC(
  client: Client,
  htlcTxHash: string,
  secret?: string
): Promise<{ txId: string, txHex: string }> {
  // Step 1: Sign the spend transaction
  const spendParams: any = { htlc_tx_hash: htlcTxHash }
  if (secret) {
    spendParams.secret = secret
  }

  const signedTxHex = await client.spendHtlc(spendParams)

  // Step 2: Broadcast to network
  const broadcastResult = await client.broadcastTx(signedTxHex)
  const txId = broadcastResult.tx_id || broadcastResult.transaction_id || broadcastResult.id

  return { txId, txHex: signedTxHex }
}

/**
 * Get timelock expiry information
 */
export function getTimelockInfo(blocks: number): {
  estimatedHours: number
  estimatedExpiry: Date
} {
  const estimatedMinutes = blocks * 10 // Assuming 10min blocks
  const estimatedHours = estimatedMinutes / 60
  const estimatedExpiry = new Date(Date.now() + estimatedMinutes * 60 * 1000)

  return {
    estimatedHours,
    estimatedExpiry
  }
}
