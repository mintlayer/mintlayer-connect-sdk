import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Client } from '@mintlayer/sdk';

interface MintlayerContextValue {
  client: Client | null;
  loading: boolean;
  error: Error | null;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  setNetwork: (network: 'mainnet' | 'testnet') => void;
}

const MintlayerContext = createContext<MintlayerContextValue | undefined>(undefined);

interface MintlayerProviderProps {
  children: ReactNode;
  network?: 'mainnet' | 'testnet';
}

export const MintlayerProvider: React.FC<MintlayerProviderProps> = ({ children, network = 'testnet' }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState<'mainnet' | 'testnet'>(network);

  const [connected, setConnected] = useState(false);

  const connect = async () => {
    try {
      setLoading(true);
      const newClient = await Client.create({ network: currentNetwork });
      setClient(newClient);
      setConnected(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to connect'));
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setClient(null);
    setConnected(false);
  };

  // useEffect(() => {
  //   connect();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [currentNetwork]);

  const setNetwork = (newNetwork: 'mainnet' | 'testnet') => {
    setCurrentNetwork(newNetwork);
  };

  return (
    <MintlayerContext.Provider value={{ client, loading, error, setNetwork, connect, disconnect, connected }}>
      {children}
    </MintlayerContext.Provider>
  );
};

export const useMintlayer = () => {
  const context = React.useContext(MintlayerContext);
  if (!context) {
    throw new Error('useMintlayer must be used within a MintlayerProvider');
  }
  return context;
};
