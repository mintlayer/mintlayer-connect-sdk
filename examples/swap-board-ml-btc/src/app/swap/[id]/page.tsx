'use client'

import { useState, useEffect } from 'react'
import { Client } from '@mintlayer/sdk'
import { Swap } from '@/types/swap'
import {
  buildCreatorBTCHTLCRequest,
  buildTakerBTCHTLCRequest,
  buildBTCHTLCSpendRequest,
  buildBTCHTLCRefundRequest,
  validateSwapForBTCHTLC,
  offerInvolvesBTC,
  isCreatorOfferingBTC,
  getBTCExplorerURL,
  getBTCAddressExplorerURL,
  broadcastBTCTransaction,
  findHTLCUTXO,
  extractSecretFromBTCTransaction
} from '@/lib/btc-request-builder'

export default function SwapPage({ params }: { params: { id: string } }) {
  const [swap, setSwap] = useState<Swap | null>(null)
  const [loading, setLoading] = useState(true)
  const [userAddress, setUserAddress] = useState<string>('')
  const [client, setClient] = useState<Client | null>(null)
  const [secretHash, setSecretHash] = useState<any>(null)
  const [generatingSecret, setGeneratingSecret] = useState(false)
  const [creatingHtlc, setCreatingHtlc] = useState(false)
  const [creatingCounterpartyHtlc, setCreatingCounterpartyHtlc] = useState(false)
  const [claimingHtlc, setClaimingHtlc] = useState(false)
  const [tokens, setTokens] = useState<any[]>([])

  // BTC-related state
  const [userBTCAddress, setUserBTCAddress] = useState<string>('')
  const [creatingBTCHtlc, setCreatingBTCHtlc] = useState(false)
  const [claimingBTCHtlc, setClaimingBTCHtlc] = useState(false)
  const [refundingBTCHtlc, setRefundingBTCHtlc] = useState(false)

  useEffect(() => {
    fetchSwap()
    initializeClient()
    fetchTokens()

    // Poll for updates every 10 seconds
    const interval = setInterval(fetchSwap, 10000)
    return () => clearInterval(interval)
  }, [params.id])

  const initializeClient = async () => {
    try {
      // Only initialize client on the client side
      if (typeof window === 'undefined') return

      const network = (process.env.NEXT_PUBLIC_MINTLAYER_NETWORK as 'testnet' | 'mainnet') || 'testnet'
      const newClient = await Client.create({ network })
      setClient(newClient)
    } catch (error) {
      console.error('Error initializing client:', error)
    }
  }

  const fetchTokens = async () => {
    try {
      const network = (process.env.NEXT_PUBLIC_MINTLAYER_NETWORK as 'testnet' | 'mainnet') || 'testnet'
      const networkId = network === 'mainnet' ? 0 : 1
      const response = await fetch(`https://api.mintini.app/dex_tokens?network=${networkId}`)

      if (response.ok) {
        const tokenData = await response.json()
        const allTokens = [
          { token_id: 'ML', symbol: 'ML', number_of_decimals: 11 },
          ...tokenData
        ]
        setTokens(allTokens)
      }
    } catch (error) {
      console.error('Error fetching tokens:', error)
    }
  }

  const getTokenSymbol = (tokenId: string) => {
    if (tokenId === 'ML') return 'ML'
    if (tokenId === 'BTC') return 'BTC'
    const token = tokens.find((t: any) => t.token_id === tokenId)
    return token ? token.symbol : tokenId.slice(-8)
  }

  const fetchSwap = async () => {
    try {
      const response = await fetch(`/api/swaps/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setSwap(data)
      }
    } catch (error) {
      console.error('Error fetching swap:', error)
    } finally {
      setLoading(false)
    }
  }

  const connectWallet = async () => {
    try {
      if (client) {
        const connect = await client.connect()
        const address = connect.testnet.receiving[0]
        setUserAddress(address)

        // If swap involves BTC, also get BTC address
        if (swap && offerInvolvesBTC(swap.offer!)) {
          try {
            const btcAddress = await (client as any).getBTCAddress()
            setUserBTCAddress(btcAddress)
          } catch (error) {
            console.error('Error getting BTC address:', error)
            // Don't fail the whole connection for BTC address
          }
        }
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
      alert('Failed to connect wallet. Please make sure Mojito wallet is installed.')
    }
  }

  const generateSecretHash = async () => {
    if (!client || !swap) {
      alert('Please connect your wallet first')
      return
    }

    setGeneratingSecret(true)
    try {
      const secretHashResponse = await client.requestSecretHash({})
      setSecretHash(secretHashResponse)
      console.log('Generated secret hash:', secretHashResponse)

      // Save the secret hash to the database
      const response = await fetch(`/api/swaps/${swap.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secretHash: JSON.stringify(secretHashResponse)
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save secret hash')
      }

      // Refresh swap data to show the updated secret hash
      fetchSwap()

    } catch (error) {
      console.error('Error generating secret hash:', error)
      alert('Failed to generate secret hash. Please try again.')
    } finally {
      setGeneratingSecret(false)
    }
  }

  const createHtlc = async () => {
    if (!client || !userAddress || !secretHash || !swap?.offer) {
      alert('Missing required data for HTLC creation')
      return
    }

    setCreatingHtlc(true)
    try {
      // Step 1: Build the HTLC transaction
      const htlcParams = {
        amount: swap.offer.amountA,
        token_id: swap.offer.tokenA === 'ML' ? null : swap.offer.tokenA,
        secret_hash: { hex: secretHash.secret_hash_hex },
        spend_address: swap.takerMLAddress, // Taker can spend with secret
        refund_address: userAddress, // Creator can refund after timelock
        refund_timelock: {
          type: 'ForBlockCount',
          content: 144 // ~24 hours assuming 10min blocks
        }
      }

      // Step 2: Sign the transaction
      const signedTxHex = await client.createHtlc(htlcParams)
      console.log('HTLC signed:', signedTxHex)

      // Step 3: Broadcast the transaction to the network
      const broadcastResult = await client.broadcastTx(signedTxHex)
      console.log('HTLC broadcast result:', broadcastResult)

      const txId = broadcastResult.tx_id || broadcastResult.transaction_id || broadcastResult.id

      // Step 4: Update swap status with transaction ID and hex
      // Note: We save the signed transaction hex because it's needed later
      // to extract the secret when someone claims the HTLC using extractHtlcSecret()
      await fetch(`/api/swaps/${swap.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'htlc_created',
          secretHash: JSON.stringify(secretHash),
          creatorHtlcTxHash: txId,
          creatorHtlcTxHex: signedTxHex
        })
      })

      // Refresh swap data
      fetchSwap()
      alert(`HTLC created and broadcasted successfully! TX ID: ${txId}`)
    } catch (error) {
      console.error('Error creating HTLC:', error)
      alert('Failed to create HTLC. Please try again.')
    } finally {
      setCreatingHtlc(false)
    }
  }

  const createCounterpartyHtlc = async () => {
    if (!client || !userAddress || !swap?.offer || !swap.secretHash) {
      alert('Missing required data for counterparty HTLC creation')
      return
    }

    setCreatingCounterpartyHtlc(true)
    try {
      // Parse the stored secret hash from the creator's HTLC
      const creatorSecretHash = JSON.parse(swap.secretHash)

      const htlcParams = {
        amount: swap.offer.amountB, // Taker gives amountB
        token_id: swap.offer.tokenB === 'ML' ? null : swap.offer.tokenB,
        secret_hash: { hex: creatorSecretHash.secret_hash_hex }, // Use same secret hash
        spend_address: swap.offer.creatorMLAddress, // Creator can spend with secret
        refund_address: userAddress, // Taker can refund after timelock
        refund_timelock: {
          type: 'ForBlockCount',
          content: 144 // ~24 hours assuming 10min blocks
        }
      }

      // Step 2: Sign the transaction
      const signedTxHex = await client.createHtlc(htlcParams)
      console.log('Counterparty HTLC signed:', signedTxHex)

      // Step 3: Broadcast the transaction to the network
      const broadcastResult = await client.broadcastTx(signedTxHex)
      console.log('Counterparty HTLC broadcast result:', broadcastResult)

      const txId = broadcastResult.tx_id || broadcastResult.transaction_id || broadcastResult.id

      // Step 4: Update swap status with transaction ID and hex
      // Note: We save the signed transaction hex because it's needed later
      // to extract the secret when someone claims the HTLC using extractHtlcSecret()
      await fetch(`/api/swaps/${swap.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'in_progress',
          takerHtlcTxHash: txId,
          takerHtlcTxHex: signedTxHex
        })
      })

      // Refresh swap data
      fetchSwap()
      alert(`Counterparty HTLC created and broadcasted successfully! TX ID: ${txId}`)
    } catch (error) {
      console.error('Error creating counterparty HTLC:', error)
      alert('Failed to create counterparty HTLC. Please try again.')
    } finally {
      setCreatingCounterpartyHtlc(false)
    }
  }

  const claimHtlc = async () => {
    if (!client || !userAddress || !swap?.offer) {
      alert('Missing required data for HTLC claiming')
      return
    }

    // Determine which HTLC to claim based on user role
    const isUserCreator = swap.offer.creatorMLAddress === userAddress
    const isUserTaker = swap.takerMLAddress === userAddress

    if (!isUserCreator && !isUserTaker) {
      alert('You are not authorized to claim this HTLC')
      return
    }

    setClaimingHtlc(true)
    try {
      let htlcTxHash: string

      if (isUserCreator) {
        // Creator claims taker's HTLC using the secret stored in their wallet
        if (!swap.takerHtlcTxHash) {
          alert('Taker HTLC not found')
          return
        }
        htlcTxHash = swap.takerHtlcTxHash
        // The wallet will automatically use the secret it generated earlier
        // We don't need to provide it explicitly - the wallet knows it
      } else {
        // Taker claims creator's HTLC (needs to provide the secret they learned)
        // Check if creator offered BTC or ML
        const creatorOfferedBTC = swap.offer && isCreatorOfferingBTC(swap.offer)

        if (creatorOfferedBTC) {
          // Creator offered BTC, so taker should claim BTC HTLC
          alert('Creator offered BTC. Please use the "Claim BTC" button in the BTC HTLC section below.')
          return
        }

        if (!swap.creatorHtlcTxHash) {
          alert('Creator ML HTLC not found')
          return
        }
        htlcTxHash = swap.creatorHtlcTxHash
        // For the taker, they need to input the secret they obtained somehow
        // In a real implementation, they would have learned this secret from somewhere
        const inputSecret = prompt('Enter the secret to claim the HTLC:')
        if (!inputSecret) {
          alert('Secret is required to claim HTLC')
          return
        }

        // Build spend HTLC parameters for taker (with secret)
        const spendParams = {
          transaction_id: htlcTxHash,
          secret: inputSecret
        }

        // Step 1: Sign the spend transaction
        const signedSpendTxHex = await client.spendHtlc(spendParams)
        console.log('HTLC spend signed:', signedSpendTxHex)

        // Step 2: Broadcast the spend transaction
        const broadcastResult = await client.broadcastTx(signedSpendTxHex)
        console.log('HTLC spend broadcast result:', broadcastResult)

        const spendTxId = broadcastResult.tx_id || broadcastResult.transaction_id || broadcastResult.id

        // Step 3: Update swap status with both transaction ID and hex
        // Note: We save the claim transaction hex because it's needed to extract the secret
        const updateData: any = {
          status: 'completed',
          claimTxHash: spendTxId,
          claimTxHex: signedSpendTxHex,
          secret: inputSecret
        }

        await fetch(`/api/swaps/${swap.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })

        // Refresh swap data
        fetchSwap()
        alert(`HTLC claimed successfully! Spend TX ID: ${spendTxId}`)
        return
      }

      // Build spend HTLC parameters for creator (no secret needed)
      const spendParams = { transaction_id: htlcTxHash }

      // Step 1: Sign the spend transaction (creator case)
      const signedSpendTxHex = await client.spendHtlc(spendParams)
      console.log('HTLC spend signed:', signedSpendTxHex)

      // Step 2: Broadcast the spend transaction
      const broadcastResult = await client.broadcastTx(signedSpendTxHex)
      console.log('HTLC spend broadcast result:', broadcastResult)

      const spendTxId = broadcastResult.tx_id || broadcastResult.transaction_id || broadcastResult.id

      // Step 3: Update swap status with both transaction ID and hex
      // Note: We save the claim transaction hex because it's needed to extract the secret
      const updateData = {
        status: 'completed',
        claimTxHash: spendTxId,
        claimTxHex: signedSpendTxHex
      }

      await fetch(`/api/swaps/${swap.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      // Refresh swap data
      fetchSwap()
      alert(`HTLC claimed successfully! Spend TX ID: ${spendTxId}`)
    } catch (error) {
      console.error('Error claiming HTLC:', error)
      alert('Failed to claim HTLC. Please try again.')
    } finally {
      setClaimingHtlc(false)
    }
  }

  const extractSecretFromClaim = async () => {
    if (!client || !swap) {
      alert('Missing required data for secret extraction')
      return
    }

    try {
      let extractedSecret: string

      // Check if there's a BTC claim transaction to extract secret from
      if (swap.btcClaimTxId) {
        console.log('Extracting secret from BTC claim transaction:', swap.btcClaimTxId)
        const network = (process.env.NEXT_PUBLIC_MINTLAYER_NETWORK as 'testnet' | 'mainnet') || 'testnet'
        extractedSecret = await extractSecretFromBTCTransaction(swap.btcClaimTxId, network === 'testnet')
      }
      // Fallback to ML claim transaction
      else if (swap.claimTxHex) {
        console.log('Extracting secret from ML claim transaction:', swap.claimTxHash)
        // Extract secret using the ML claim transaction data
        extractedSecret = await client.extractHtlcSecret({
          transaction_id: swap.claimTxHash || '', // The claim transaction ID
          transaction_hex: swap.claimTxHex, // The claim transaction hex (contains the secret)
          format: 'hex'
        })
      } else {
        alert('No claim transaction found to extract secret from')
        return
      }

      console.log('Extracted secret:', extractedSecret)

      // Update swap with extracted secret
      await fetch(`/api/swaps/${swap.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: extractedSecret
        })
      })

      // Refresh swap data
      fetchSwap()
      alert(`Secret extracted successfully: ${extractedSecret}`)
    } catch (error) {
      console.error('Error extracting secret:', error)
      alert('Failed to extract secret. Please try again.')
    }
  }

  const claimWithExtractedSecret = async () => {
    if (!client || !userAddress || !swap?.secret) {
      alert('Missing required data for claiming with extracted secret')
      return
    }

    const isUserTaker = swap.takerMLAddress === userAddress
    if (!isUserTaker) {
      alert('Only the taker can use this function')
      return
    }

    // Determine which HTLC the taker should claim based on what the creator offered
    const creatorOfferedBTC = swap.offer && isCreatorOfferingBTC(swap.offer)

    if (creatorOfferedBTC) {
      // Creator offered BTC, so taker should claim the BTC HTLC
      if (!swap.btcHtlcTxId) {
        alert('Creator BTC HTLC not found')
        return
      }
      // Redirect to BTC claiming function
      alert('Please use the "Claim BTC" button in the BTC HTLC section below to claim the creator\'s BTC.')
      return
    } else {
      // Creator offered ML, so taker should claim the ML HTLC
      if (!swap.creatorHtlcTxHash) {
        console.log('swap', swap);
        alert('Creator ML HTLC not found')
        return
      }
    }

    setClaimingHtlc(true)
    try {
      // Use the extracted secret to claim creator's ML HTLC
      const spendParams = {
        transaction_id: swap.creatorHtlcTxHash,
        secret: swap.secret
      }

      // Step 1: Sign the spend transaction
      const signedSpendTxHex = await client.spendHtlc(spendParams)
      console.log('Taker HTLC spend signed:', signedSpendTxHex)

      // Step 2: Broadcast the spend transaction
      const broadcastResult = await client.broadcastTx(signedSpendTxHex)
      console.log('Taker HTLC spend broadcast result:', broadcastResult)

      const spendTxId = broadcastResult.tx_id || broadcastResult.transaction_id || broadcastResult.id

      // Step 3: Update swap status to fully completed
      await fetch(`/api/swaps/${swap.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'fully_completed'
          // Note: We don't update claimTxHash here as it refers to the first claim
        })
      })

      // Refresh swap data
      fetchSwap()
      alert(`Successfully claimed creator's HTLC! TX ID: ${spendTxId}. Atomic swap completed!`)
    } catch (error) {
      console.error('Error claiming with extracted secret:', error)
      alert('Failed to claim HTLC with extracted secret. Please try again.')
    } finally {
      setClaimingHtlc(false)
    }
  }

  // BTC HTLC Functions
  const createBTCHTLC = async () => {
    if (!client || !userAddress || !swap?.offer || !swap.secretHash) {
      alert('Missing required data for BTC HTLC creation')
      return
    }

    if (!offerInvolvesBTC(swap.offer)) {
      alert('This swap does not involve BTC')
      return
    }

    setCreatingBTCHtlc(true)
    try {
      validateSwapForBTCHTLC(swap, swap.offer)

      const isUserCreator = swap.offer.creatorMLAddress === userAddress
      let request;

      if (isUserCreator && isCreatorOfferingBTC(swap.offer)) {
        // Creator is offering BTC
        request = buildCreatorBTCHTLCRequest(swap, swap.offer, swap.secretHash)
      } else if (!isUserCreator && !isCreatorOfferingBTC(swap.offer)) {
        // Taker is offering BTC (creator wants BTC)
        request = buildTakerBTCHTLCRequest(swap, swap.offer, swap.secretHash)
      } else {
        alert('You are not the one who should create the BTC HTLC')
        return
      }

      // Create BTC HTLC via wallet
      const response = await (client as any).request({ method: 'signTransaction', params: { chain: 'bitcoin', txData: { JSONRepresentation: request } } })

      // Broadcast the transaction using Blockstream API
      const network = (process.env.NEXT_PUBLIC_MINTLAYER_NETWORK as 'testnet' | 'mainnet') || 'testnet'
      const txId = await broadcastBTCTransaction(response.signedTxHex, network === 'testnet')

      // Update swap with BTC HTLC details
      await fetch(`/api/swaps/${swap.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          btcHtlcAddress: response.htlcAddress,
          btcHtlcTxId: txId,
          btcHtlcTxHex: response.signedTxHex,
          btcRedeemScript: response.redeemScript,
          status: swap.creatorHtlcTxHash || swap.takerHtlcTxHash ? 'both_htlcs_created' : 'btc_htlc_created'
        })
      })

      fetchSwap()
      alert(`BTC HTLC created successfully! TX ID: ${txId}`)
    } catch (error) {
      console.error('Error creating BTC HTLC:', error)
      alert('Failed to create BTC HTLC. Please try again.')
    } finally {
      setCreatingBTCHtlc(false)
    }
  }

  const claimBTCHTLC = async () => {
    if (!client || !userAddress || !swap?.offer) {
      alert('Missing required data for BTC HTLC claiming')
      return
    }

    // Get the user's BTC address from swap data based on their role
    const isUserCreator = swap.offer.creatorMLAddress === userAddress
    const usersBTCAddress = isUserCreator ? swap.offer.creatorBTCAddress : swap.takerBTCAddress

    if (!usersBTCAddress) {
      alert('No BTC address found for claiming')
      return
    }

    if (!swap.btcHtlcTxId || !swap.btcRedeemScript) {
      alert('BTC HTLC not found or missing redeem script')
      return
    }

    let secret = swap.secret

    // If user is taker and no secret is stored, they need to provide it
    if (!isUserCreator && !secret) {
      // @ts-ignore
      secret = prompt('Please enter the secret to claim BTC:')
      if (!secret) return
    }

    setClaimingBTCHtlc(true)
    try {
      const network = (process.env.NEXT_PUBLIC_MINTLAYER_NETWORK as 'testnet' | 'mainnet') || 'testnet'
      const request = await buildBTCHTLCSpendRequest(swap, secret || '', usersBTCAddress, network === 'testnet')

      // Spend BTC HTLC via wallet
      const response = await (client as any).request({ method: 'signTransaction', params: { chain: 'bitcoin', txData: { JSONRepresentation: request } } })

      // Broadcast the claim transaction using Blockstream API
      const txId = await broadcastBTCTransaction(response.signedTxHex, network === 'testnet')

      // Determine if this completes the atomic swap
      // In BTC/ML swaps, if both ML and BTC have been claimed, the swap is fully completed
      const mlAlreadyClaimed = swap.claimTxHash // ML HTLC was already claimed
      const finalStatus = mlAlreadyClaimed ? 'fully_completed' : 'completed'

      // Update swap with claim details
      await fetch(`/api/swaps/${swap.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          btcClaimTxId: txId,
          btcClaimTxHex: response.signedTxHex,
          secret: secret,
          status: finalStatus
        })
      })

      fetchSwap()
      alert(`BTC HTLC claimed successfully! TX ID: ${txId}`)
    } catch (error) {
      console.error('Error claiming BTC HTLC:', error)
      alert('Failed to claim BTC HTLC. Please try again.')
    } finally {
      setClaimingBTCHtlc(false)
    }
  }

  const refundBTCHTLC = async () => {
    if (!client || !userAddress || !swap?.offer) {
      alert('Missing required data for BTC HTLC refund')
      return
    }

    // Get the user's BTC address from swap data based on their role
    const isUserCreator = swap.offer.creatorMLAddress === userAddress
    const usersBTCAddress = isUserCreator ? swap.offer.creatorBTCAddress : swap.takerBTCAddress

    if (!usersBTCAddress) {
      alert('No BTC address found for refund')
      return
    }

    if (!swap.btcHtlcTxId || !swap.btcRedeemScript) {
      alert('BTC HTLC not found or missing redeem script')
      return
    }

    setRefundingBTCHtlc(true)
    try {
      const network = (process.env.NEXT_PUBLIC_MINTLAYER_NETWORK as 'testnet' | 'mainnet') || 'testnet'
      const request = await buildBTCHTLCRefundRequest(swap, usersBTCAddress, network === 'testnet')

      // Refund BTC HTLC via wallet
      const response = await (client as any).request({ method: 'signTransaction', params: { chain: 'bitcoin', txData: { JSONRepresentation: request } } })

      // Broadcast the refund transaction using Blockstream API
      const txId = await broadcastBTCTransaction(response.signedTxHex, network === 'testnet')

      // Update swap with refund details
      await fetch(`/api/swaps/${swap.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          btcRefundTxId: txId,
          btcRefundTxHex: response.signedTxHex,
          status: 'btc_refunded'
        })
      })

      fetchSwap()
      alert(`BTC HTLC refunded successfully! TX ID: ${txId}`)
    } catch (error) {
      console.error('Error refunding BTC HTLC:', error)
      alert('Failed to refund BTC HTLC. Please try again.')
    } finally {
      setRefundingBTCHtlc(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'htlc_created': return 'text-blue-600 bg-blue-100'
      case 'btc_htlc_created': return 'text-orange-600 bg-orange-100'
      case 'both_htlcs_created': return 'text-purple-600 bg-purple-100'
      case 'in_progress': return 'text-purple-600 bg-purple-100'
      case 'completed': return 'text-green-600 bg-green-100'
      case 'fully_completed': return 'text-green-700 bg-green-200'
      case 'refunded': return 'text-red-600 bg-red-100'
      case 'btc_refunded': return 'text-red-700 bg-red-200'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'pending': return 'Waiting for HTLC creation'
      case 'htlc_created': return 'ML HTLC created, waiting for counterparty'
      case 'btc_htlc_created': return 'BTC HTLC created, waiting for ML HTLC'
      case 'both_htlcs_created': return 'Both HTLCs created, ready to claim'
      case 'in_progress': return 'Claims in progress'
      case 'completed': return 'First claim completed, waiting for final claim'
      case 'fully_completed': return 'Atomic swap completed successfully'
      case 'refunded': return 'ML HTLC refunded due to timeout'
      case 'btc_refunded': return 'BTC HTLC refunded due to timeout'
      default: return 'Unknown status'
    }
  }

  const isUserCreator = swap?.offer?.creatorMLAddress === userAddress
  const isUserTaker = swap?.takerMLAddress === userAddress

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">Loading swap details...</div>
      </div>
    )
  }

  if (!swap) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Swap Not Found</h1>
          <a href="/offers" className="text-mintlayer-600 hover:underline">
            Back to offers
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Swap #{swap.id}</h1>
          {!userAddress && (
            <button
              onClick={connectWallet}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
            >
              Connect Wallet
            </button>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(swap.status)}`}>
            {swap.status.toUpperCase()}
          </span>
          <span className="text-gray-600">{getStatusDescription(swap.status)}</span>
          {userAddress && (
            <span className="text-sm text-gray-500">
              Connected: {userAddress.slice(0, 10)}...
            </span>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Swap Details */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Swap Details</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-center py-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {swap.offer?.amountA} {getTokenSymbol(swap.offer?.tokenA || '')}
                </div>
                <div className="text-sm text-gray-600">From Creator</div>
              </div>
              <svg className="w-8 h-8 mx-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {swap.offer?.amountB} {getTokenSymbol(swap.offer?.tokenB || '')}
                </div>
                <div className="text-sm text-gray-600">To Taker</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Creator ML:</span>
                  <div className="font-mono text-xs break-all">
                    {swap.offer?.creatorMLAddress}
                  </div>
                  {swap.offer?.creatorBTCAddress && (
                    <>
                      <span className="text-gray-600 mt-2 block">Creator BTC:</span>
                      <div className="font-mono text-xs break-all">
                        <a
                          href={getBTCAddressExplorerURL(swap.offer.creatorBTCAddress)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {swap.offer.creatorBTCAddress}
                        </a>
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <span className="text-gray-600">Taker ML:</span>
                  <div className="font-mono text-xs break-all">
                    {swap.takerMLAddress}
                  </div>
                  {swap.takerBTCAddress && (
                    <>
                      <span className="text-gray-600 mt-2 block">Taker BTC:</span>
                      <div className="font-mono text-xs break-all">
                        <a
                          href={getBTCAddressExplorerURL(swap.takerBTCAddress)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {swap.takerBTCAddress}
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="text-sm text-gray-600">
                <div>Created: {new Date(swap.createdAt).toLocaleString()}</div>
                {swap.offer?.contact && (
                  <div>Contact: {swap.offer.contact}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Progress</h2>

          <div className="space-y-4">
            <div className="flex items-center">
              <div className={`w-4 h-4 rounded-full mr-3 ${
                swap && swap.id ? 'bg-green-500' : 'bg-gray-300'
              }`}></div>
              <span className="text-sm">Offer accepted</span>
            </div>

            <div className="flex items-center">
              <div className={`w-4 h-4 rounded-full mr-3 ${
                (swap.creatorHtlcTxHash || swap.takerHtlcTxHash) ? 'bg-green-500' : 'bg-gray-300'
              }`}></div>
              <span className="text-sm">ML HTLC created</span>
            </div>

            {swap.offer && offerInvolvesBTC(swap.offer) && (
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full mr-3 ${
                  swap.btcHtlcTxId ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                <span className="text-sm">BTC HTLC created</span>
              </div>
            )}

            <div className="flex items-center">
              <div className={`w-4 h-4 rounded-full mr-3 ${
                ['both_htlcs_created', 'in_progress', 'completed', 'fully_completed'].includes(swap.status)
                  ? 'bg-green-500' : 'bg-gray-300'
              }`}></div>
              <span className="text-sm">Both HTLCs ready</span>
            </div>

            <div className="flex items-center">
              <div className={`w-4 h-4 rounded-full mr-3 ${
                (swap.claimTxHash || swap.btcClaimTxId) ? 'bg-green-500' : 'bg-gray-300'
              }`}></div>
              <span className="text-sm">
                First claim completed (secret revealed)
                {swap.btcClaimTxId && !swap.claimTxHash && ' - BTC claimed'}
                {swap.claimTxHash && !swap.btcClaimTxId && ' - ML claimed'}
                {swap.claimTxHash && swap.btcClaimTxId && ' - Both claimed'}
              </span>
            </div>

            <div className="flex items-center">
              <div className={`w-4 h-4 rounded-full mr-3 ${
                swap.secret ? 'bg-green-500' : 'bg-gray-300'
              }`}></div>
              <span className="text-sm">Secret extracted</span>
            </div>

            <div className="flex items-center">
              <div className={`w-4 h-4 rounded-full mr-3 ${
                swap.status === 'fully_completed' ||
                (swap.claimTxHash && swap.btcClaimTxId) || // Both ML and BTC claimed
                (swap.status === 'completed' && swap.secret && (swap.claimTxHash || swap.btcClaimTxId)) // One side claimed with secret revealed
                  ? 'bg-green-500' : 'bg-gray-300'
              }`}></div>
              <span className="text-sm">Atomic swap completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Section */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Next Steps</h2>

        {swap.status === 'pending' && (
          <div className="bg-yellow-50 p-4 rounded-md">
            <p className="text-yellow-800 mb-4">
              {isUserCreator
                ? "You need to create the initial HTLC to start the swap process."
                : "Waiting for the creator to create the initial HTLC."
              }
            </p>
            {isUserCreator && (
              <div className="space-y-3">
                {!secretHash ? (
                  <div>
                    <p className="text-sm text-yellow-700 mb-2">
                      Step 1: Generate a secret hash for the HTLC
                    </p>
                    <button
                      onClick={generateSecretHash}
                      disabled={generatingSecret || !userAddress}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {generatingSecret ? 'Generating...' : 'Generate Secret Hash'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-yellow-700 mb-2">
                      ✅ Secret hash generated successfully
                    </p>
                    <div className="bg-white p-2 rounded border text-xs font-mono break-all mb-3">
                      {JSON.stringify(secretHash, null, 2)}
                    </div>
                    <p className="text-sm text-yellow-700 mb-2">
                      Step 2: Create the HTLC contract
                    </p>

                    {/* Show appropriate HTLC creation button based on what creator is offering */}
                    {swap.offer && offerInvolvesBTC(swap.offer) ? (
                      // BTC is involved - creator creates the HTLC for what they're offering
                      isCreatorOfferingBTC(swap.offer) ? (
                        // Creator offers BTC -> create BTC HTLC first
                        <button
                          onClick={createBTCHTLC}
                          disabled={creatingBTCHtlc || !userAddress}
                          className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:bg-gray-400"
                        >
                          {creatingBTCHtlc ? 'Creating BTC HTLC...' : 'Create BTC HTLC'}
                        </button>
                      ) : (
                        // Creator offers ML -> create ML HTLC first
                        <button
                          onClick={createHtlc}
                          disabled={creatingHtlc}
                          className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:bg-gray-400"
                        >
                          {creatingHtlc ? 'Creating ML HTLC...' : 'Create ML HTLC'}
                        </button>
                      )
                    ) : (
                      // No BTC involved - standard ML HTLC
                      <button
                        onClick={createHtlc}
                        disabled={creatingHtlc}
                        className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:bg-gray-400"
                      >
                        {creatingHtlc ? 'Creating HTLC...' : 'Create HTLC'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {(swap.status === 'htlc_created' || swap.status === 'btc_htlc_created') && (
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-blue-800 mb-4">
              {isUserTaker
                ? "The creator has created their HTLC. You need to create your counterparty HTLC."
                : "You've created your HTLC. Waiting for the taker to create their counterparty HTLC."
              }
            </p>
            {isUserTaker && (
              <div className="space-y-3">
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm font-medium text-gray-700 mb-2">Creator's HTLC Details:</p>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Amount: {swap.offer?.amountA} {getTokenSymbol(swap.offer?.tokenA || '')}</div>
                    <div>Secret Hash: {swap.secretHash ? JSON.parse(swap.secretHash).secret_hash_hex.slice(0, 20) + '...' : 'N/A'}</div>
                    {swap.creatorHtlcTxHash && (
                      <div>ML TX ID: {swap.creatorHtlcTxHash.slice(0, 20)}...</div>
                    )}
                    {swap.btcHtlcTxId && (
                      <div>BTC TX ID: {swap.btcHtlcTxId.slice(0, 20)}...</div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-blue-700 mb-2">
                    Create your counterparty HTLC with {swap.offer?.amountB} {getTokenSymbol(swap.offer?.tokenB || '')}
                  </p>

                  {/* Show appropriate button based on what taker needs to create */}
                  {swap.offer && offerInvolvesBTC(swap.offer) && !isCreatorOfferingBTC(swap.offer) ? (
                    // Creator offered ML, taker needs to create BTC HTLC (handled in BTC section)
                    <p className="text-sm text-gray-600">
                      BTC HTLC creation is handled in the BTC section below.
                    </p>
                  ) : (
                    // Standard ML counterparty HTLC
                    <button
                      onClick={createCounterpartyHtlc}
                      disabled={creatingCounterpartyHtlc || !userAddress}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {creatingCounterpartyHtlc ? 'Creating ML HTLC...' : 'Create ML HTLC'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {swap.status === 'in_progress' && (
          <div className="bg-purple-50 p-4 rounded-md">
            <p className="text-purple-800 mb-4">
              Both HTLCs are created. You can now claim your tokens. Claiming will reveal the secret and allow the other party to claim their tokens.
            </p>
            <div className="space-y-3">
              <div className="bg-white p-3 rounded border">
                <p className="text-sm font-medium text-gray-700 mb-2">Available to Claim:</p>
                <div className="text-xs text-gray-600 space-y-1">
                  {isUserCreator && (
                    <div>
                      <strong>You can claim:</strong> {swap.offer?.amountB} {getTokenSymbol(swap.offer?.tokenB || '')} from taker's HTLC
                      <br />
                      <span className="text-green-600">✓ Your wallet has the secret</span>
                    </div>
                  )}
                  {isUserTaker && (
                    <div>
                      <strong>You can claim:</strong> {swap.offer?.amountA} {getTokenSymbol(swap.offer?.tokenA || '')} from creator's HTLC
                      <br />
                      <span className="text-orange-600">⚠ You need to provide the secret</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={claimHtlc}
                disabled={claimingHtlc || !userAddress}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400"
              >
                {claimingHtlc ? 'Claiming HTLC...' : 'Claim Tokens'}
              </button>
            </div>
          </div>
        )}

        {(swap.status === 'completed' || swap.status === 'fully_completed') && (
          <div className="bg-green-50 p-4 rounded-md">
            {(swap.claimTxHash || swap.btcClaimTxId) && (
              <div className="space-y-3">
                <p className="text-green-800">
                  {swap.status === 'fully_completed'
                    ? "🎉 Atomic swap completed successfully! Both parties have their tokens."
                    : isUserCreator
                      ? "You have claimed the taker's HTLC!"
                      : "The creator has claimed your HTLC!"
                  }
                </p>

                {/* Show ML claim transaction if it exists */}
                {swap.claimTxHash && (
                  <p className="text-sm text-green-700">
                    ML Claim Transaction: {swap.claimTxHash}
                  </p>
                )}

                {/* Show BTC claim transaction if it exists */}
                {swap.btcClaimTxId && (
                  <p className="text-sm text-green-700">
                    BTC Claim Transaction: {swap.btcClaimTxId}
                  </p>
                )}

                {swap.secret ? (
                  <div>
                    <div className="bg-white p-2 rounded border mb-3">
                      <p className="text-xs font-medium text-gray-700">Revealed Secret:</p>
                      <p className="text-xs font-mono text-gray-600 break-all">{swap.secret}</p>
                    </div>

                    {isUserTaker && (
                      <div className="space-y-2">
                        <p className="text-blue-800 text-sm">
                          Now you can claim the creator's HTLC using this secret:
                        </p>
                        <button
                          onClick={claimWithExtractedSecret}
                          disabled={claimingHtlc}
                          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400"
                        >
                          {claimingHtlc ? 'Claiming Creator HTLC...' : 'Claim Creator HTLC'}
                        </button>
                      </div>
                    )}

                    {isUserCreator && (
                      <p className="text-green-700 text-sm">
                        ✅ Atomic swap completed! Both parties have their tokens.
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-blue-800 text-sm mb-2">
                      {isUserTaker ? "Extract the secret to claim the creator's HTLC:" : "The taker needs to extract the secret:"}
                    </p>
                    <button
                      onClick={extractSecretFromClaim}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Extract Secret from Claim
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {swap.status === 'refunded' && (
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-800">
              The swap was manually refunded after the timelock expired.
            </p>
          </div>
        )}

        {/* BTC HTLC Section - Show when appropriate */}
        {swap.offer && offerInvolvesBTC(swap.offer) && (
          // Show BTC HTLC section when:
          // 1. Creator offered BTC and BTC HTLC exists, OR
          // 2. Creator offered ML, ML HTLC exists, and it's time for taker to create BTC HTLC
          (isCreatorOfferingBTC(swap.offer) || swap.creatorHtlcTxHash) && (
          <div className="bg-orange-50 p-4 rounded-md mt-4">
            <h3 className="text-lg font-semibold text-orange-900 mb-3">
              BTC HTLC {isCreatorOfferingBTC(swap.offer) ? '(Creator → Taker)' : '(Taker → Creator)'}
            </h3>

            {swap.btcHtlcAddress ? (
              <div className="space-y-3">
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm font-medium text-gray-700 mb-1">BTC HTLC Contract Address:</p>
                  <a
                    href={getBTCAddressExplorerURL(swap.btcHtlcAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-mono text-xs break-all"
                  >
                    {swap.btcHtlcAddress}
                  </a>
                </div>

                {swap.btcHtlcTxId && (
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm font-medium text-gray-700 mb-1">BTC Funding Transaction:</p>
                    <a
                      href={getBTCExplorerURL(swap.btcHtlcTxId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-mono text-xs break-all"
                    >
                      {swap.btcHtlcTxId}
                    </a>
                  </div>
                )}

                {swap.btcClaimTxId && (
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm font-medium text-gray-700 mb-1">BTC Claim Transaction:</p>
                    <a
                      href={getBTCExplorerURL(swap.btcClaimTxId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-mono text-xs break-all"
                    >
                      {swap.btcClaimTxId}
                    </a>
                  </div>
                )}

                {!swap.btcClaimTxId && userAddress && (
                  <div className="space-y-2">
                    {/* Use the BTC address from swap data based on user role */}
                    {(() => {
                      const isUserCreator = swap.offer?.creatorMLAddress === userAddress
                      const usersBTCAddress = isUserCreator ? swap.offer?.creatorBTCAddress : swap.takerBTCAddress

                      return usersBTCAddress ? (
                        <p className="text-sm text-gray-600">
                          Your BTC Address: <span className="font-mono text-xs">{usersBTCAddress}</span>
                        </p>
                      ) : (
                        <p className="text-sm text-red-600">
                          No BTC address found in swap data
                        </p>
                      )
                    })()}

                    <div className="flex space-x-2">
                      <button
                        onClick={claimBTCHTLC}
                        disabled={claimingBTCHtlc || (() => {
                          const isUserCreator = swap.offer?.creatorMLAddress === userAddress
                          const usersBTCAddress = isUserCreator ? swap.offer?.creatorBTCAddress : swap.takerBTCAddress
                          return !usersBTCAddress
                        })()}
                        className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:bg-gray-400"
                      >
                        {claimingBTCHtlc ? 'Claiming BTC...' : 'Claim BTC'}
                      </button>

                      <button
                        onClick={refundBTCHTLC}
                        disabled={refundingBTCHtlc || (() => {
                          const isUserCreator = swap.offer?.creatorMLAddress === userAddress
                          const usersBTCAddress = isUserCreator ? swap.offer?.creatorBTCAddress : swap.takerBTCAddress
                          return !usersBTCAddress
                        })()}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400"
                      >
                        {refundingBTCHtlc ? 'Refunding BTC...' : 'Refund BTC'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-orange-800">
                  {/* Show appropriate message based on who should create BTC HTLC */}
                  {isCreatorOfferingBTC(swap.offer) ? (
                    // Creator offers BTC - creator should create BTC HTLC (handled in pending section above)
                    isUserCreator
                      ? "You need to create the BTC HTLC first."
                      : "Waiting for creator to create BTC HTLC."
                  ) : (
                    // Creator offers ML - taker should create BTC HTLC after ML HTLC exists
                    !isUserCreator
                      ? "You need to create the BTC HTLC."
                      : "Waiting for taker to create BTC HTLC."
                  )}
                </p>

                {/* Show BTC HTLC creation button for taker when creator offered ML and ML HTLC exists */}
                {!isCreatorOfferingBTC(swap.offer) && !isUserCreator && swap.creatorHtlcTxHash && (
                  <button
                    onClick={createBTCHTLC}
                    disabled={creatingBTCHtlc || !userAddress || !swap.secretHash}
                    className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:bg-gray-400"
                  >
                    {creatingBTCHtlc ? 'Creating BTC HTLC...' : 'Create BTC HTLC'}
                  </button>
                )}
              </div>
            )}
          </div>
          )
        )}

        {(swap.status === 'htlc_created' || swap.status === 'in_progress') && (
          <div className="bg-orange-50 p-4 rounded-md mt-4">
            <p className="text-orange-800 mb-2">
              <strong>Timelock Protection:</strong> If the swap is not completed within the timelock period,
              you can manually refund your HTLC to recover your tokens.
            </p>
            <button className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700">
              Check Refund Availability
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
