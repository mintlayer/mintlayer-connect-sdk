'use client'

import { useState, useEffect } from 'react'
import { Client } from '@mintlayer/sdk'

export default function CreateOfferPage() {
  const [formData, setFormData] = useState({
    tokenA: '',
    tokenB: '',
    amountA: '',
    amountB: '',
    contact: ''
  })
  const [loading, setLoading] = useState(false)
  const [userAddress, setUserAddress] = useState<string>('')
  const [client, setClient] = useState<Client | null>(null)

  useEffect(() => {
    initializeClient()
  }, [])

  const initializeClient = async () => {
    try {
      const network = (process.env.NEXT_PUBLIC_MINTLAYER_NETWORK as 'testnet' | 'mainnet') || 'testnet'
      const newClient = await Client.create({ network })
      setClient(newClient)
    } catch (error) {
      console.error('Error initializing client:', error)
    }
  }

  const connectWallet = async () => {
    try {
      if (client) {
        const connect = await client.connect()
        const address = connect.testnet.receiving[0]
        setUserAddress(address)
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
      alert('Failed to connect wallet. Please make sure Mojito wallet is installed.')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const calculatePrice = () => {
    if (formData.amountA && formData.amountB) {
      const price = parseFloat(formData.amountB) / parseFloat(formData.amountA)
      return price.toFixed(6)
    }
    return '0'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userAddress) {
      alert('Please connect your wallet first')
      return
    }

    if (!formData.tokenA || !formData.tokenB || !formData.amountA || !formData.amountB) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          creatorMLAddress: userAddress,
        }),
      })

      if (response.ok) {
        alert('Offer created successfully!')
        // Reset form
        setFormData({
          tokenA: '',
          tokenB: '',
          amountA: '',
          amountB: '',
          contact: ''
        })
        // Redirect to offers page
        window.location.href = '/offers'
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating offer:', error)
      alert('Failed to create offer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Swap Offer</h1>

      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="tokenA" className="block text-sm font-medium text-gray-700 mb-2">
                Token to Give *
              </label>
              <input
                type="text"
                id="tokenA"
                name="tokenA"
                value={formData.tokenA}
                onChange={handleInputChange}
                placeholder="e.g., tmltk1abc..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-mintlayer-500"
                required
              />
            </div>

            <div>
              <label htmlFor="amountA" className="block text-sm font-medium text-gray-700 mb-2">
                Amount to Give *
              </label>
              <input
                type="number"
                id="amountA"
                name="amountA"
                value={formData.amountA}
                onChange={handleInputChange}
                placeholder="100"
                step="any"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-mintlayer-500"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="tokenB" className="block text-sm font-medium text-gray-700 mb-2">
                Token to Receive *
              </label>
              <input
                type="text"
                id="tokenB"
                name="tokenB"
                value={formData.tokenB}
                onChange={handleInputChange}
                placeholder="e.g., tmltk1def..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-mintlayer-500"
                required
              />
            </div>

            <div>
              <label htmlFor="amountB" className="block text-sm font-medium text-gray-700 mb-2">
                Amount to Receive *
              </label>
              <input
                type="number"
                id="amountB"
                name="amountB"
                value={formData.amountB}
                onChange={handleInputChange}
                placeholder="200"
                step="any"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-mintlayer-500"
                required
              />
            </div>
          </div>

          {formData.amountA && formData.amountB && (
            <div className="bg-blue-50 p-4 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Exchange Rate:</strong> 1 {formData.tokenA || 'TokenA'} = {calculatePrice()} {formData.tokenB || 'TokenB'}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-2">
              Contact Information (Optional)
            </label>
            <input
              type="text"
              id="contact"
              name="contact"
              value={formData.contact}
              onChange={handleInputChange}
              placeholder="Telegram: @username or Email: user@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-mintlayer-500"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Your Mintlayer Address:</strong>
            </p>
            {userAddress ? (
              <p className="text-sm font-mono text-gray-800">
                {userAddress}
              </p>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-2">Not connected</p>
                <button
                  type="button"
                  onClick={connectWallet}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                >
                  Connect Wallet
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !userAddress}
            className="w-full bg-mintlayer-600 text-white py-3 px-4 rounded-md hover:bg-mintlayer-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Creating Offer...' : 'Create Offer'}
          </button>
        </form>
      </div>
    </div>
  )
}
