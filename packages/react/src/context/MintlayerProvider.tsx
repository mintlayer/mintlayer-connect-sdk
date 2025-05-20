import React, { createContext, useState, useEffect, ReactNode } from 'react'
import { Client } from '@mintlayer/sdk'

interface MintlayerContextValue {
  client: Client | null
  loading: boolean
  error: Error | null
  setNetwork: (network: 'mainnet' | 'testnet') => void
}

const MintlayerContext = createContext<MintlayerContextValue | undefined>(undefined)

interface MintlayerProviderProps {
  children: ReactNode
  network?: 'mainnet' | 'testnet'
}

export const MintlayerProvider: React.FC<MintlayerProviderProps> = ({ children, network = 'testnet' }) => {
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [currentNetwork, setCurrentNetwork] = useState<'mainnet' | 'testnet'>(network)

  useEffect(() => {
    async function initializeClient() {
      try {
        setLoading(true)
        const newClient = await Client.create({ network: currentNetwork })
        setClient(newClient)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize Mintlayer client'))
      } finally {
        setLoading(false)
      }
    }

    initializeClient()
  }, [currentNetwork])

  const setNetwork = (newNetwork: 'mainnet' | 'testnet') => {
    setCurrentNetwork(newNetwork)
  }

  return (
    <MintlayerContext.Provider value={{ client, loading, error, setNetwork }}>{children}</MintlayerContext.Provider>
  )
}

export const useMintlayer = () => {
  const context = React.useContext(MintlayerContext)
  if (!context) {
    throw new Error('useMintlayer must be used within a MintlayerProvider')
  }
  return context
}
