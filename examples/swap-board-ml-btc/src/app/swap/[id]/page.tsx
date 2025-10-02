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
  const [creatingHtlc, setCreatingHtlc] = useState(false)
  const [creatingCounterpartyHtlc, setCreatingCounterpartyHtlc] = useState(false)
  const [claimingHtlc, setClaimingHtlc] = useState(false)
  const [tokens, setTokens] = useState<any[]>([])

  // BTC-related state
  const [userBTCAddress, setUserBTCAddress] = useState<string>('')
  const [creatingBTCHtlc, setCreatingBTCHtlc] = useState(false)
  const [claimingBTCHtlc, setClaimingBTCHtlc] = useState(false)
  const [refundingBTCHtlc, setRefundingBTCHtlc] = useState(false)

  // Refund availability state
  const [refundInfo, setRefundInfo] = useState<{
    canRefund: boolean
    blocksRemaining: number
    timeRemaining: string
    htlcTxId: string
    confirmations?: number
    timelockBlocks?: number
  } | null>(null)
  const [checkingRefund, setCheckingRefund] = useState(false)

  useEffect(() => {
    fetchSwap()
    initializeClient()
    fetchTokens()

    // Poll for updates every 10 seconds
    const interval = setInterval(() => {
      fetchSwap()
      checkHTLCSpendStatus()
    }, 10000)
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

  const checkHTLCSpendStatus = async () => {
    if (!swap || !client) return

    try {
      const network = (process.env.NEXT_PUBLIC_MINTLAYER_NETWORK as 'testnet' | 'mainnet') || 'testnet'
      const apiServer = network === 'mainnet'
        ? 'https://api-server.mintlayer.org/api/v2'
        : 'https://api-server-lovelace.mintlayer.org/api/v2'

      let needsUpdate = false
      const updates: any = {}
      let creatorHtlcSpent = false
      let takerHtlcSpent = false
      let creatorHtlcSpendTxId: string | null = null
      let takerHtlcSpendTxId: string | null = null

      // Check creator's ML HTLC
      if (swap.creatorHtlcTxHash) {
        try {
          const outputResponse = await fetch(`${apiServer}/transaction/${swap.creatorHtlcTxHash}/output/0`)
          if (outputResponse.ok) {
            const outputData = await outputResponse.json()
            creatorHtlcSpent = outputData.spent === true
            if (creatorHtlcSpent && outputData.spent_by) {
              creatorHtlcSpendTxId = outputData.spent_by
              console.log('Creator HTLC has been spent by:', creatorHtlcSpendTxId)
            }
          }
        } catch (error) {
          console.error('Error checking creator HTLC spend status:', error)
        }
      }

      // Check taker's ML HTLC
      if (swap.takerHtlcTxHash) {
        try {
          const outputResponse = await fetch(`${apiServer}/transaction/${swap.takerHtlcTxHash}/output/0`)
          if (outputResponse.ok) {
            const outputData = await outputResponse.json()
            takerHtlcSpent = outputData.spent === true
            if (takerHtlcSpent && outputData.spent_by) {
              takerHtlcSpendTxId = outputData.spent_by
              console.log('Taker HTLC has been spent by:', takerHtlcSpendTxId)
            }
          }
        } catch (error) {
          console.error('Error checking taker HTLC spend status:', error)
        }
      }

      // Determine status based on what's been spent
      if (creatorHtlcSpent && takerHtlcSpent) {
        // Both HTLCs spent = fully completed
        if (swap.status !== 'fully_completed') {
          needsUpdate = true
          updates.status = 'fully_completed'
        }
      } else if (creatorHtlcSpent || takerHtlcSpent) {
        // One HTLC spent = first claim completed, need to extract secret
        if (swap.status === 'fully_completed') {
          // Downgrade from fully_completed to completed if only one is actually spent
          needsUpdate = true
          updates.status = 'completed'
          console.log('Downgrading status from fully_completed to completed - only one HTLC is spent')
        } else if (swap.status !== 'completed') {
          needsUpdate = true
          updates.status = 'completed'
        }

        // Try to extract the secret from the claim transaction if we don't have it
        if (!swap.secret) {
          try {
            const spendTxId = creatorHtlcSpent ? creatorHtlcSpendTxId : takerHtlcSpendTxId
            const htlcTxId = creatorHtlcSpent ? swap.creatorHtlcTxHash : swap.takerHtlcTxHash

            if (spendTxId && htlcTxId) {
              console.log('Attempting to extract secret from claim transaction:', spendTxId)

              // Fetch the claim transaction to get its hex
              const claimTxResponse = await fetch(`${apiServer}/transaction/${spendTxId}`)
              if (claimTxResponse.ok) {
                const claimTxData = await claimTxResponse.json()
                const claimTxHex = claimTxData.hex

                if (claimTxHex) {
                  // Extract the secret using the SDK
                  const extractedSecret = await client.extractHtlcSecret({
                    transaction_id: spendTxId,
                    transaction_hex: claimTxHex,
                    format: 'hex'
                  })

                  console.log('Successfully extracted secret:', extractedSecret)
                  updates.secret = extractedSecret
                  updates.claimTxHash = spendTxId
                  updates.claimTxHex = claimTxHex
                  needsUpdate = true
                }
              }
            }
          } catch (error) {
            console.error('Error extracting secret from claim transaction:', error)
            // Continue with status update even if secret extraction fails
          }
        }
      } else {
        // Neither HTLC is spent - downgrade status if needed
        if (swap.status === 'completed' || swap.status === 'fully_completed') {
          needsUpdate = true
          // Determine appropriate status based on what HTLCs exist
          if (swap.creatorHtlcTxHash && swap.takerHtlcTxHash) {
            updates.status = 'in_progress'
          } else if (swap.creatorHtlcTxHash || swap.takerHtlcTxHash) {
            updates.status = 'htlc_created'
          }
          console.log('Downgrading status - no HTLCs are actually spent on-chain')
        }
      }

      // Update swap if needed
      if (needsUpdate) {
        console.log('Updating swap status based on spend status:', updates)
        await fetch(`/api/swaps/${swap.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        })
        fetchSwap()
      }
    } catch (error) {
      console.error('Error checking HTLC spend status:', error)
    }
  }

  const connectWallet = async () => {
    try {
      if (client) {
        const connect = await client.connect()
        const address = connect.address.testnet.receiving[0]
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

  const createHtlc = async () => {
    if (!client || !userAddress || !swap?.offer) {
      alert('Missing required data for HTLC creation')
      return
    }

    setCreatingHtlc(true)
    try {
      // Step 1: Build the HTLC transaction
      // Note: We pass a placeholder secret hash, and the wallet generates the actual secret hash internally
      const htlcParams = {
        amount: swap.offer.amountA,
        token_id: swap.offer.tokenA === 'ML' ? null : swap.offer.tokenA,
        secret_hash: { hex: '0000000000000000000000000000000000000000' }, // Placeholder - wallet generates actual secret
        spend_address: swap.takerMLAddress, // Taker can spend with secret
        refund_address: userAddress, // Creator can refund after timelock
        refund_timelock: {
          type: 'ForBlockCount',
          content: 144 // ~24 hours assuming 10min blocks
        }
      }

      // Step 2: Sign the transaction (wallet generates secret hash internally)
      const signedTxHex = await client.createHtlc(htlcParams)
      console.log('HTLC signed:', signedTxHex)

      // Step 3: Broadcast the transaction to the network
      const broadcastResult = await client.broadcastTx(signedTxHex)
      console.log('HTLC broadcast result:', broadcastResult)

      const txId = broadcastResult.tx_id || broadcastResult.transaction_id || broadcastResult.id

      // Step 4: Extract secret hash from the broadcasted transaction
      const network = (process.env.NEXT_PUBLIC_MINTLAYER_NETWORK as 'testnet' | 'mainnet') || 'testnet'
      const apiServer = network === 'mainnet'
        ? 'https://api-server.mintlayer.org/api/v2'
        : 'https://api-server-lovelace.mintlayer.org/api/v2'

      let secretHashHex: string | undefined

      try {
        // Wait a moment for transaction to be indexed
        await new Promise(resolve => setTimeout(resolve, 2000))

        const txResponse = await fetch(`${apiServer}/transaction/${txId}`)
        if (txResponse.ok) {
          const txData = await txResponse.json()
          const htlcOutput = txData.outputs?.find((output: any) => output.type === 'Htlc')
          if (htlcOutput?.htlc?.secret_hash?.hex) {
            secretHashHex = htlcOutput.htlc.secret_hash.hex
            console.log('Extracted secret hash from ML HTLC:', secretHashHex)
          }
        }
      } catch (error) {
        console.error('Error extracting secret hash from ML HTLC:', error)
        // Continue without secret hash - it can be extracted later if needed
      }

      // Step 5: Update swap status with transaction ID, hex, and secret hash
      // Note: We save the signed transaction hex because it's needed later
      // to extract the secret when someone claims the HTLC using extractHtlcSecret()
      const updateData: any = {
        status: 'htlc_created',
        creatorHtlcTxHash: txId,
        creatorHtlcTxHex: signedTxHex
      }

      if (secretHashHex) {
        updateData.secretHash = secretHashHex
      }

      await fetch(`/api/swaps/${swap.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
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
    if (!client || !userAddress || !swap?.offer) {
      alert('Missing required data for counterparty HTLC creation')
      return
    }

    // Check if creator's HTLC exists (could be ML or BTC)
    const creatorMLHTLCExists = !!swap.creatorHtlcTxHash
    const creatorBTCHTLCExists = !!swap.btcHtlcTxId

    if (!creatorMLHTLCExists && !creatorBTCHTLCExists) {
      alert('Creator HTLC must be created first')
      return
    }

    setCreatingCounterpartyHtlc(true)
    try {
      const network = (process.env.NEXT_PUBLIC_MINTLAYER_NETWORK as 'testnet' | 'mainnet') || 'testnet'
      const apiServer = network === 'mainnet'
        ? 'https://api-server.mintlayer.org/api/v2'
        : 'https://api-server-lovelace.mintlayer.org/api/v2'

      let secretHashHex: string

      // Try to use saved secret hash first (faster, no API call needed)
      if (swap.secretHash) {
        secretHashHex = swap.secretHash
        console.log('Using saved secret hash:', secretHashHex)
      } else if (creatorMLHTLCExists) {
        // Fallback: Extract from creator's ML HTLC transaction on blockchain
        console.log('Secret hash not saved, fetching from ML HTLC blockchain...')
        const txResponse = await fetch(`${apiServer}/transaction/${swap.creatorHtlcTxHash}`)
        if (!txResponse.ok) {
          throw new Error('Failed to fetch creator ML HTLC transaction')
        }

        const txData = await txResponse.json()
        console.log('Creator ML HTLC transaction data:', txData)

        const htlcOutput = txData.outputs?.find((output: any) => output.type === 'Htlc')
        if (!htlcOutput || !htlcOutput.htlc?.secret_hash?.hex) {
          throw new Error('Could not find secret hash in creator ML HTLC transaction')
        }

        secretHashHex = htlcOutput.htlc.secret_hash.hex
        console.log('Extracted secret hash from creator ML HTLC:', secretHashHex)
      } else {
        // Creator created BTC HTLC first, but secret hash not saved
        throw new Error('Secret hash not found. Creator must have created BTC HTLC with secret hash saved.')
      }

      const htlcParams = {
        amount: swap.offer.amountB, // Taker gives amountB
        token_id: swap.offer.tokenB === 'ML' ? null : swap.offer.tokenB,
        secret_hash: { hex: secretHashHex }, // Use same secret hash from creator's HTLC
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
    if (!client || !userAddress || !swap?.offer) {
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

      const network = (process.env.NEXT_PUBLIC_MINTLAYER_NETWORK as 'testnet' | 'mainnet') || 'testnet'
      const apiServer = network === 'mainnet'
        ? 'https://api-server.mintlayer.org/api/v2'
        : 'https://api-server-lovelace.mintlayer.org/api/v2'

      // Determine if BTC HTLC is first or second in the swap
      const isUserCreator = swap.offer.creatorMLAddress === userAddress
      const creatorOfferedBTC = isCreatorOfferingBTC(swap.offer)

      // BTC is FIRST HTLC if creator offers BTC and user is creator
      const isBTCFirstHTLC = isUserCreator && creatorOfferedBTC

      // BTC is SECOND HTLC if taker offers BTC (creator wants BTC)
      const isBTCSecondHTLC = !isUserCreator && !creatorOfferedBTC

      let secretHashHex: string
      let request: any

      if (isBTCFirstHTLC) {
        // BTC is the FIRST HTLC - wallet will generate secret hash
        console.log('Creating BTC HTLC as FIRST HTLC (creator offers BTC)')

        // Use placeholder - wallet will generate actual secret hash
        secretHashHex = '0000000000000000000000000000000000000000'
        request = buildCreatorBTCHTLCRequest(swap, swap.offer, secretHashHex)

      } else if (isBTCSecondHTLC) {
        // BTC is the SECOND HTLC - extract secret hash from existing ML HTLC
        console.log('Creating BTC HTLC as SECOND HTLC (taker offers BTC)')

        const mlHtlcTxHash = swap.creatorHtlcTxHash
        if (!mlHtlcTxHash) {
          alert('Creator must create ML HTLC first')
          return
        }

        // Try to use saved secret hash first (faster)
        if (swap.secretHash) {
          secretHashHex = swap.secretHash
          console.log('Using saved secret hash:', secretHashHex)
        } else {
          // Fallback: Extract from blockchain
          console.log('Secret hash not saved, fetching from blockchain...')
          const txResponse = await fetch(`${apiServer}/transaction/${mlHtlcTxHash}`)
          if (!txResponse.ok) {
            throw new Error('Failed to fetch ML HTLC transaction')
          }

          const txData = await txResponse.json()
          console.log('ML HTLC transaction data:', txData)

          const htlcOutput = txData.outputs?.find((output: any) => output.type === 'Htlc')
          if (!htlcOutput || !htlcOutput.htlc?.secret_hash?.hex) {
            throw new Error('Could not find secret hash in ML HTLC transaction')
          }

          secretHashHex = htlcOutput.htlc.secret_hash.hex
          console.log('Extracted secret hash from ML HTLC:', secretHashHex)
        }

        request = buildTakerBTCHTLCRequest(swap, swap.offer, secretHashHex)

      } else {
        alert('You are not the one who should create the BTC HTLC')
        return
      }

      // Create BTC HTLC via wallet
      const response = await (client as any).request({ method: 'signTransaction', params: { chain: 'bitcoin', txData: { JSONRepresentation: request } } })

      // Broadcast the transaction using Blockstream API
      const txId = await broadcastBTCTransaction(response.signedTxHex, network === 'testnet')

      // Determine status based on whether this is first or second HTLC
      const newStatus = isBTCFirstHTLC ? 'btc_htlc_created' : 'both_htlcs_created'

      // Update swap with BTC HTLC details
      const updateData: any = {
        btcHtlcAddress: response.htlcAddress,
        btcHtlcTxId: txId,
        btcHtlcTxHex: response.signedTxHex,
        btcRedeemScript: response.redeemScript,
        status: newStatus
      }

      // If BTC is first HTLC, save the secret hash returned by wallet
      if (isBTCFirstHTLC && response.secretHashHex) {
        updateData.secretHash = response.secretHashHex
        console.log('Saved secret hash from BTC wallet:', response.secretHashHex)
      }

      await fetch(`/api/swaps/${swap.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
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

  const checkRefundAvailability = async () => {
    if (!swap || !userAddress) {
      alert('Missing required data')
      return
    }

    setCheckingRefund(true)
    try {
      const network = (process.env.NEXT_PUBLIC_MINTLAYER_NETWORK as 'testnet' | 'mainnet') || 'testnet'
      const apiServer = network === 'mainnet'
        ? 'https://api-server.mintlayer.org/api/v2'
        : 'https://api-server-lovelace.mintlayer.org/api/v2'

      // Determine which HTLC the user can refund
      const isUserCreator = swap.offer?.creatorMLAddress === userAddress
      const isUserTaker = swap.takerMLAddress === userAddress

      let htlcTxId: string | null = null

      if (isUserCreator && swap.creatorHtlcTxHash) {
        htlcTxId = swap.creatorHtlcTxHash
      } else if (isUserTaker && swap.takerHtlcTxHash) {
        htlcTxId = swap.takerHtlcTxHash
      }

      if (!htlcTxId) {
        alert('No HTLC found for refund')
        return
      }

      // Fetch the HTLC transaction
      const txResponse = await fetch(`${apiServer}/transaction/${htlcTxId}`)
      if (!txResponse.ok) {
        throw new Error('Failed to fetch HTLC transaction')
      }

      const txData = await txResponse.json()
      console.log('HTLC transaction data:', txData)

      // Find the HTLC output and extract the timelock
      const htlcOutput = txData.outputs?.find((output: any) => output.type === 'Htlc')
      if (!htlcOutput || !htlcOutput.htlc?.refund_timelock) {
        throw new Error('Could not find timelock in HTLC transaction')
      }

      const refundTimelock = htlcOutput.htlc.refund_timelock
      console.log('Refund timelock:', refundTimelock)

      // Get the confirmations count
      const confirmations = txData.confirmations || 0
      console.log('Confirmations:', confirmations)

      // Compare confirmations with timelock content
      let timelockBlocks: number
      let canRefund: boolean
      let blocksRemaining: number

      if (refundTimelock.type === 'ForBlockCount') {
        timelockBlocks = refundTimelock.content
        canRefund = confirmations >= timelockBlocks
        blocksRemaining = Math.max(0, timelockBlocks - confirmations)
      } else {
        // For UntilTime, we'd need different logic
        alert('Time-based timelocks are not yet supported in this UI')
        return
      }

      console.log('Timelock blocks:', timelockBlocks)
      console.log('Can refund:', canRefund)
      console.log('Blocks remaining:', blocksRemaining)

      // Calculate approximate time remaining (2 minutes per block)
      const minutesRemaining = blocksRemaining * 2
      let timeRemaining: string

      if (canRefund) {
        timeRemaining = 'Available now'
      } else if (minutesRemaining < 60) {
        timeRemaining = `~${minutesRemaining} minutes`
      } else {
        const hoursRemaining = Math.floor(minutesRemaining / 60)
        const remainingMinutes = minutesRemaining % 60
        timeRemaining = `~${hoursRemaining}h ${remainingMinutes}m`
      }

      setRefundInfo({
        canRefund,
        blocksRemaining,
        timeRemaining,
        htlcTxId,
        confirmations,
        timelockBlocks
      })

      console.log('Refund info:', { canRefund, blocksRemaining, timeRemaining, htlcTxId, confirmations, timelockBlocks })
    } catch (error) {
      console.error('Error checking refund availability:', error)
      alert('Failed to check refund availability. Please try again.')
    } finally {
      setCheckingRefund(false)
    }
  }

  const refundMLHTLC = async () => {
    if (!client || !refundInfo || !refundInfo.canRefund) {
      alert('Refund is not yet available')
      return
    }

    try {
      // Refund the HTLC
      const signedTxHex = await client.refundHtlc({
        transaction_id: refundInfo.htlcTxId
      })
      console.log('Refund transaction signed:', signedTxHex)

      // Broadcast the refund transaction
      const broadcastResult = await client.broadcastTx(signedTxHex)
      console.log('Refund broadcast result:', broadcastResult)

      const txId = broadcastResult.tx_id || broadcastResult.transaction_id || broadcastResult.id

      // Update swap status
      await fetch(`/api/swaps/${swap!.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'refunded'
        })
      })

      fetchSwap()
      alert(`HTLC refunded successfully! TX ID: ${txId}`)
      setRefundInfo(null)
    } catch (error) {
      console.error('Error refunding HTLC:', error)
      alert('Failed to refund HTLC. Please try again.')
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
      case 'completed': return 'First claim completed (secret revealed), waiting for final claim'
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
        <div className="flex items-center space-x-4 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(swap.status)}`}>
            {swap.status.toUpperCase()}
          </span>
          <span className="text-gray-600">{getStatusDescription(swap.status)}</span>
          {userAddress && (
            <span className="text-sm text-gray-500">
              Connected: {userAddress.slice(0, 10)}...
            </span>
          )}
          {(swap.status === 'in_progress' || swap.status === 'completed' || swap.status === 'both_htlcs_created') && (
            <button
              onClick={checkHTLCSpendStatus}
              className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-300"
              title="Check if HTLCs have been claimed on-chain"
            >
              🔄 Check Status
            </button>
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
                (swap.claimTxHash || swap.btcClaimTxId) && swap.secret ? 'bg-green-500' : 'bg-gray-300'
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
                ? "You need to create the initial HTLC to start the swap process. The secret will be generated securely within your wallet."
                : "Waiting for the creator to create the initial HTLC."
              }
            </p>
            {isUserCreator && (
              <div className="space-y-3">
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
            <div className="space-y-3">
              <p className="text-green-800 font-semibold">
                {swap.status === 'fully_completed'
                  ? "🎉 Atomic swap completed successfully! Both parties have their tokens."
                  : "✅ First HTLC claimed! Secret has been revealed."
                }
              </p>
              {swap.status === 'completed' && (
                <p className="text-blue-800 text-sm">
                  {isUserCreator
                    ? "You claimed the taker's HTLC. The taker can now use the revealed secret to claim your HTLC."
                    : "The creator claimed your HTLC and revealed the secret. You can now claim the creator's HTLC!"
                  }
                </p>
              )}

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
                  <div className="bg-yellow-50 p-3 rounded border mb-3">
                    <p className="text-sm font-semibold text-gray-800 mb-2">🔑 Revealed Secret:</p>
                    <p className="text-sm font-mono text-gray-900 break-all bg-white p-2 rounded border border-yellow-200">{swap.secret}</p>
                  </div>

                  {isUserTaker && swap.status === 'completed' && (
                    <div className="space-y-2">
                      <p className="text-blue-800 text-sm font-medium">
                        👉 Now you can claim the creator's HTLC using this secret:
                      </p>
                      <button
                        onClick={claimWithExtractedSecret}
                        disabled={claimingHtlc}
                        className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400 font-medium"
                      >
                        {claimingHtlc ? 'Claiming Creator HTLC...' : '🎯 Claim Creator HTLC'}
                      </button>
                    </div>
                  )}

                  {isUserCreator && swap.status === 'completed' && (
                    <p className="text-green-700 text-sm">
                      ⏳ Waiting for taker to claim your HTLC using the revealed secret...
                    </p>
                  )}

                  {swap.status === 'fully_completed' && (
                    <p className="text-green-700 text-sm font-medium">
                      ✅ Atomic swap completed! Both parties have their tokens.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-orange-800 text-sm mb-2 font-medium">
                    ⚠️ Secret not yet extracted. Click below to extract it from the claim transaction:
                  </p>
                  <button
                    onClick={extractSecretFromClaim}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 font-medium"
                  >
                    🔍 Extract Secret from Claim
                  </button>
                </div>
              )}
            </div>
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
                    disabled={creatingBTCHtlc || !userAddress}
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

        {(swap.status === 'htlc_created' || swap.status === 'in_progress' || swap.status === 'both_htlcs_created') && (
          <div className="bg-orange-50 p-4 rounded-md mt-4">
            <p className="text-orange-800 mb-2">
              <strong>Timelock Protection:</strong> If the swap is not completed within the timelock period,
              you can manually refund your HTLC to recover your tokens.
            </p>

            {!refundInfo ? (
              <button
                onClick={checkRefundAvailability}
                disabled={checkingRefund || !userAddress}
                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:bg-gray-400"
              >
                {checkingRefund ? 'Checking...' : 'Check Refund Availability'}
              </button>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-semibold ${refundInfo.canRefund ? 'text-green-600' : 'text-orange-600'}`}>
                        {refundInfo.canRefund ? '✓ Refund Available' : '⏳ Timelock Active'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Confirmations:</span>
                      <span className="font-mono">{refundInfo.confirmations || 0} / {refundInfo.timelockBlocks || 0}</span>
                    </div>
                    {!refundInfo.canRefund && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Blocks Remaining:</span>
                          <span className="font-mono">{refundInfo.blocksRemaining}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Time Remaining:</span>
                          <span className="font-mono">{refundInfo.timeRemaining}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">HTLC TX:</span>
                      <span className="font-mono text-xs">{refundInfo.htlcTxId.slice(0, 16)}...</span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={refundMLHTLC}
                    disabled={!refundInfo.canRefund}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400"
                  >
                    {refundInfo.canRefund ? 'Refund ML HTLC' : 'Refund Not Available Yet'}
                  </button>
                  <button
                    onClick={checkRefundAvailability}
                    disabled={checkingRefund}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:bg-gray-400"
                  >
                    {checkingRefund ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
