'use client'

import { useState, useEffect } from 'react'
import { Client } from '@mintlayer/sdk'
import { Offer } from '@/types/swap'

interface Token {
  token_id: string
  symbol: string
  number_of_decimals: number
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<number | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [userAddress, setUserAddress] = useState<string>('')
  const [userBTCAddress, setUserBTCAddress] = useState<string>('')
  const [userBTCPublicKey, setUserBTCPublicKey] = useState<string>('')
  const [tokens, setTokens] = useState<Token[]>([])

  useEffect(() => {
    fetchOffers()
    initializeClient()
    fetchTokens()
  }, [])

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

  const fetchOffers = async () => {
    try {
      const response = await fetch('/api/offers')
      const data = await response.json()
      setOffers(data)
    } catch (error) {
      console.error('Error fetching offers:', error)
    } finally {
      setLoading(false)
    }
  }

  const connectWallet = async () => {
    try {
      if (client) {
        const connect = await client.connect()
        const address = connect.address.testnet.receiving[0]
        setUserAddress(address)

        // Get BTC address and public key from wallet connection
        if (connect.addressesByChain?.bitcoin) {
          const btcAddress = connect.addressesByChain.bitcoin.receiving?.[0]
          const btcPublicKey = connect.addressesByChain.bitcoin.publicKeys?.receiving?.[0]

          if (btcAddress) setUserBTCAddress(btcAddress)
          if (btcPublicKey) setUserBTCPublicKey(btcPublicKey)
        }
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
      alert('Failed to connect wallet. Please make sure Mojito wallet is installed.')
    }
  }

  const getTokenSymbol = (tokenId: string) => {
    if (tokenId === 'ML') return 'ML'
    if (tokenId === 'BTC') return 'BTC'
    const token = tokens.find(t => t.token_id === tokenId)
    return token ? token.symbol : tokenId.slice(-8)
  }

  const acceptOffer = async (offerId: number) => {
    if (!userAddress) {
      alert('Please connect your wallet first')
      return
    }

    setAccepting(offerId)
    try {
      // Find the offer to check if BTC is involved
      const offer = offers.find(o => o.id === offerId)
      let takerBTCAddress, takerBTCPublicKey;

      // If offer involves BTC, use BTC credentials from wallet connection
      if (offer && (offer.tokenA === 'BTC' || offer.tokenB === 'BTC')) {
        if (!userBTCAddress || !userBTCPublicKey) {
          alert('BTC credentials not available. Please reconnect your wallet.')
          return
        }

        takerBTCAddress = userBTCAddress
        takerBTCPublicKey = userBTCPublicKey
      }

      const response = await fetch('/api/swaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          offerId,
          takerMLAddress: userAddress,
          takerBTCAddress,
          takerBTCPublicKey,
        }),
      })

      if (response.ok) {
        const swap = await response.json()
        // Redirect to swap page
        window.location.href = `/swap/${swap.id}`
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error accepting offer:', error)
      alert('Failed to accept offer')
    } finally {
      setAccepting(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">Loading offers...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Available Offers</h1>
        <div className="flex items-center space-x-4">
          {userAddress ? (
            <div className="text-sm text-gray-600">
              Connected: {userAddress.slice(0, 10)}...
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {offers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No offers available at the moment.</p>
          <a
            href="/create"
            className="bg-mintlayer-600 text-white px-6 py-2 rounded-md hover:bg-mintlayer-700"
          >
            Create the first offer
          </a>
        </div>
      ) : (
        <div className="grid gap-6">
          {offers.map((offer) => (
            <div key={offer.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-lg font-semibold text-gray-900">
                      {offer.amountA} {getTokenSymbol(offer.tokenA)}
                    </span>
                    <svg className="w-5 h-5 mx-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    <span className="text-lg font-semibold text-gray-900">
                      {offer.amountB} {getTokenSymbol(offer.tokenB)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Price: {offer.price.toFixed(6)} {getTokenSymbol(offer.tokenB)}/{getTokenSymbol(offer.tokenA)}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Creator: {offer.creatorMLAddress.slice(0, 20)}...
                  </div>
                  {offer.contact && (
                    <div className="text-sm text-gray-600 mb-2">
                      Contact: {offer.contact}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    Created: {new Date(offer.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => acceptOffer(offer.id)}
                    disabled={accepting === offer.id || !userAddress || offer.creatorMLAddress === userAddress}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {accepting === offer.id ? 'Accepting...' : 'Accept Offer'}
                  </button>
                  {offer.creatorMLAddress === userAddress && (
                    <div className="text-xs text-gray-500 mt-1">Your offer</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
