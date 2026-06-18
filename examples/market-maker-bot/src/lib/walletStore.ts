import {
  WalletState,
  type IsMineOutput,
  type SyncCursor,
  type WalletTx,
  type WalletTxStore,
} from '@mintlayer/sdk';

import type { Client } from '@mintlayer/sdk';
import type { WalletSnapshot } from './types';

const STORAGE_PREFIX = 'market-maker-bot:wallet-state';

type StoredWalletState = {
  transactions: WalletTx[];
  cursor: SyncCursor | null;
};

function storageKey(accountId: string): string {
  return `${STORAGE_PREFIX}:${accountId}`;
}

function readStoredState(accountId: string): StoredWalletState {
  if (typeof window === 'undefined') {
    return { transactions: [], cursor: null };
  }

  const raw = window.localStorage.getItem(storageKey(accountId));
  if (!raw) {
    return { transactions: [], cursor: null };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredWalletState>;
    return {
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      cursor: parsed.cursor ?? null,
    };
  } catch {
    return { transactions: [], cursor: null };
  }
}

function writeStoredState(accountId: string, state: StoredWalletState): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(storageKey(accountId), JSON.stringify(state));
}

export function createLocalStorageWalletTxStore(accountId: string): WalletTxStore {
  return {
    async getTransactions(): Promise<WalletTx[]> {
      return readStoredState(accountId).transactions;
    },

    async putTransaction(_accountId: string, tx: WalletTx): Promise<void> {
      const state = readStoredState(accountId);
      const nextTransactions = new Map(state.transactions.map((item) => [item.txId, item]));
      nextTransactions.set(tx.txId, tx);
      writeStoredState(accountId, { ...state, transactions: Array.from(nextTransactions.values()) });
    },

    async removeTransaction(_accountId: string, txId: string): Promise<void> {
      const state = readStoredState(accountId);
      writeStoredState(accountId, {
        ...state,
        transactions: state.transactions.filter((item) => item.txId !== txId),
      });
    },

    async getCursor(): Promise<SyncCursor | null> {
      return readStoredState(accountId).cursor;
    },

    async setCursor(_accountId: string, cursor: SyncCursor): Promise<void> {
      const state = readStoredState(accountId);
      writeStoredState(accountId, { ...state, cursor });
    },
  };
}

export function createAddressOwnership(addresses: { receiving: string[]; change: string[] }): IsMineOutput {
  const owned = new Set([...addresses.receiving, ...addresses.change]);

  return (output: unknown): boolean => {
    const destination = (output as { destination?: unknown }).destination;
    return typeof destination === 'string' && owned.has(destination);
  };
}

export function getAccountId(addresses: { receiving: string[]; change: string[] }): string {
  return [...addresses.receiving, ...addresses.change].join('|') || 'disconnected';
}

export function clearLocalWalletState(accountId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(storageKey(accountId));
}

export function clearAllLocalWalletState(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const keysToRemove: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}

export async function createWalletStateForAddresses(addresses: {
  receiving: string[];
  change: string[];
}): Promise<WalletState> {
  const accountId = getAccountId(addresses);
  return WalletState.create({
    accountId,
    store: createLocalStorageWalletTxStore(accountId),
    isMineOutput: createAddressOwnership(addresses),
  });
}

export async function loadWalletSnapshot(
  client: Client,
  walletState: WalletState,
  maxUnconfirmedBranchDepth: number,
): Promise<WalletSnapshot> {
  await walletState.ensureFresh();

  const addresses = client.getAddresses();
  let sdkBalances: WalletSnapshot['sdkBalances'] = null;

  try {
    sdkBalances = await client.getBalances();
  } catch {
    sdkBalances = null;
  }

  return {
    addresses,
    sdkBalances,
    localBalance: walletState.getBalance({ includeUnconfirmed: true }),
    utxos: walletState.getUtxos({
      includeSpent: true,
      includeRejected: true,
      includeConflicted: true,
      includeOrphaned: true,
      includeUnconfirmed: true,
    }),
    spendableUtxos: walletState.getSpendableUtxos({
      allowUnconfirmed: true,
      allowOwnChangeOnly: true,
      maxUnconfirmedChainDepth: maxUnconfirmedBranchDepth,
    }),
    transactions: await createLocalStorageWalletTxStore(getAccountId(addresses)).getTransactions(getAccountId(addresses)),
  };
}
