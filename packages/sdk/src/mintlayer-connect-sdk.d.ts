interface MintlayerClient {
  isMintlayer: true;

  setNetwork: (net: 'testnet' | 'mainnet') => void;
  getNetwork: () => 'testnet' | 'mainnet';

  request: (options: { method: string; params?: Record<string, any> }) => Promise<any>;
  connect: () => Promise<string[]>;

  /** Returns the extended public key (xPub). Warning: Exposes all derived addresses. */
  getXPub: () => Promise<string>;

  getAddresses: () => Promise<string[]>;
  getBalance: () => Promise<string>;
  getDelegations: () => Promise<any[]>;

  buildTransaction: (options: {
    type?: 'Transfer' | 'CreateDelegationId' | 'IssueToken';
    params: Record<string, any>;
  }) => Promise<any>;

  transfer: (options: { to: string; amount: string }) => Promise<any>;
  delegate: (options: { poolId: string; amount?: string }) => Promise<any>;
  issueToken: (options: { tokenData: Record<string, any>; authority: string }) => Promise<any>;
  signTransaction: (tx: any) => Promise<any>;

  on: (eventName: string, callback: (data: any) => void) => void;
}

declare global {
  interface Window {
    mintlayer: MintlayerClient;
  }
}

export default MintlayerClient;
