import type { TransactionJSONRepresentation, UtxoEntry, UtxoInput } from './types/transaction';

/**
 * Last wallet sync position known by the caller's scanner or network layer.
 *
 * `WalletState` stores and forwards this value, but does not interpret block
 * hashes or fetch blocks by itself.
 */
export type SyncCursor = {
  height: number;
  blockHash: string;
  updatedAt?: number;
};

/**
 * Wallet-relevant transaction lifecycle state.
 *
 * `local` means the wallet created the transaction but it is not yet known to
 * be accepted by the network. `mempool` means it was broadcast or observed as
 * unconfirmed. `rejected` means the transaction should no longer reserve its
 * inputs, usually because broadcasting failed and a replacement/rebuild is
 * needed.
 */
export type TxState = 'local' | 'mempool' | 'confirmed' | 'conflicted' | 'orphaned' | 'rejected';

/**
 * Stable reference to one transaction output.
 */
export type OutPoint = {
  txId: string;
  outputIndex: number;
};

/**
 * Transaction JSON accepted by `WalletState`.
 *
 * This accepts the SDK transaction JSON representation, plus a looser structural
 * shape for scanner/bot integrations that only need inputs, outputs, and id.
 */
export type WalletTransactionJson =
  | TransactionJSONRepresentation
  | {
      inputs: unknown[];
      outputs: unknown[];
      fee?: unknown;
      id: string;
    };

/**
 * Transaction object accepted by `WalletState`.
 *
 * You can pass either raw transaction JSON or an SDK `Transaction`-like object
 * containing `JSONRepresentation`.
 */
export type WalletTxInput =
  | WalletTransactionJson
  | {
      JSONRepresentation: WalletTransactionJson;
      transaction_id?: string;
    };

/**
 * Wallet-relevant transaction stored in the wallet transaction log.
 *
 * The transaction log is the source of truth. UTXOs, balances, and spendability
 * are derived from these entries.
 */
export type WalletTx = {
  txId: string;
  tx: WalletTxInput;
  state: TxState;
  confirmation?: number | string;
  confirmations?: number | string;
  blockHeight?: number;
  blockHash?: string;
  timestamp?: number;
  createdByWallet?: boolean;
  rejectionReason?: string;
  rebuildRequired?: boolean;
};

/**
 * Storage adapter used by `WalletState`.
 *
 * Implement this interface with IndexedDB, SQLite, Postgres, files, or any other
 * storage engine. `WalletState` intentionally does not perform network or disk
 * access except through this adapter.
 */
export interface WalletTxStore {
  getTransactions(accountId: string): Promise<WalletTx[]>;
  putTransaction(accountId: string, tx: WalletTx): Promise<void>;
  removeTransaction?(accountId: string, txId: string): Promise<void>;
  getCursor(accountId: string): Promise<SyncCursor | null>;
  setCursor(accountId: string, cursor: SyncCursor): Promise<void>;
}

/**
 * Policy used when selecting spendable UTXOs from derived wallet state.
 */
export type SpendPolicy = {
  /** Allow spending unconfirmed outputs. Defaults to `false`. */
  allowUnconfirmed?: boolean;
  /** If unconfirmed spending is enabled, only allow wallet-created change. Defaults to `true`. */
  allowOwnChangeOnly?: boolean;
  /** Maximum unconfirmed parent chain depth allowed for spendable outputs. */
  maxUnconfirmedChainDepth?: number;
};

/**
 * Derived status of a wallet-owned output.
 */
export type WalletUtxoStatus =
  | 'confirmed'
  | 'unconfirmed'
  | 'spent'
  | 'spent_pending'
  | 'conflicted'
  | 'orphaned'
  | 'rejected';

/**
 * Wallet-owned UTXO with derived state metadata.
 */
export type WalletUtxo = UtxoEntry & {
  txId: string;
  outputIndex: number;
  status: WalletUtxoStatus;
  txState: TxState;
  blockHeight?: number;
  blockHash?: string;
  createdByWallet?: boolean;
  unconfirmedChainDepth: number;
};

/**
 * Balance derived from currently visible wallet UTXOs.
 *
 * Values are represented in atoms to avoid decimal precision loss.
 */
export type WalletBalance = {
  coin: {
    atoms: string;
  };
  tokens: Record<string, { atoms: string }>;
};

/**
 * Filters for derived wallet UTXO and balance views.
 */
export type WalletUtxoFilter = {
  includeSpent?: boolean;
  includeConflicted?: boolean;
  includeOrphaned?: boolean;
  includeRejected?: boolean;
  includeUnconfirmed?: boolean;
};

/**
 * Wallet-oriented sync update produced by a scanner/network layer.
 *
 * This diff intentionally does not require raw blocks. A scanner can feed only
 * wallet-relevant transactions, spent outpoints, and state transitions.
 */
export type WalletSyncDiff = {
  fromCursor?: SyncCursor;
  toCursor: SyncCursor;
  transactions: WalletTx[];
  spent?: OutPoint[];
  confirmedTxIds?: string[];
  conflictedTxIds?: string[];
};

/**
 * Callback used to decide whether a transaction output belongs to this wallet.
 *
 * This keeps `WalletState` account-model agnostic. A simple bot can check a set
 * of known receiving/change addresses; a full wallet can use derived addresses,
 * xpub metadata, HTLC keys, or other ownership rules.
 */
export type IsMineOutput = (
  output: unknown,
  context: {
    tx: WalletTx;
    txJson: WalletTransactionJson;
    outputIndex: number;
    utxo: UtxoEntry;
  },
) => boolean;

/**
 * Options for constructing a `WalletState` instance.
 */
export type WalletStateOptions = {
  accountId: string;
  store: WalletTxStore;
  isMineOutput: IsMineOutput;
};

const DEFAULT_SPEND_POLICY: Required<SpendPolicy> = {
  allowUnconfirmed: false,
  allowOwnChangeOnly: true,
  maxUnconfirmedChainDepth: Number.MAX_SAFE_INTEGER,
};

function outPointKey(outpoint: OutPoint): string {
  return `${outpoint.txId}:${outpoint.outputIndex}`;
}

function getTxJson(tx: WalletTxInput): WalletTransactionJson {
  if ('JSONRepresentation' in tx) {
    return tx.JSONRepresentation;
  }

  return tx;
}

function getTxId(tx: WalletTxInput): string {
  const txJson = getTxJson(tx);
  return txJson.id;
}

function getWalletTxState(tx: WalletTx): TxState {
  const confirmation = tx.confirmation ?? tx.confirmations;

  if (confirmation === undefined) {
    return tx.state;
  }

  const confirmationValue = Number(confirmation);

  if (!Number.isFinite(confirmationValue)) {
    return tx.state;
  }

  // Historical API note: the API server reports -1 for mempool transactions and 0 for
  // transactions that are already in a block, so 0 confirmations still means confirmed here.
  return confirmationValue < 0 ? 'mempool' : 'confirmed';
}

function getInputOutPoint(input: unknown): OutPoint | null {
  const maybeInput = input as Partial<UtxoInput>;

  if (maybeInput.input?.input_type !== 'UTXO') {
    return null;
  }

  return {
    txId: maybeInput.input.source_id,
    outputIndex: maybeInput.input.index,
  };
}

function outputToUtxoEntry(txId: string, outputIndex: number, output: any): UtxoEntry | null {
  if (output.type === 'Transfer') {
    return {
      outpoint: {
        index: outputIndex,
        source_type: 'Transaction' as any,
        source_id: txId,
      },
      utxo: {
        type: output.type,
        value: output.value,
        destination: output.destination,
      },
    };
  }

  if (output.type === 'LockThenTransfer') {
    return {
      outpoint: {
        index: outputIndex,
        source_type: 'Transaction' as any,
        source_id: txId,
      },
      utxo: {
        type: output.type,
        value: output.value,
        destination: output.destination,
        lock: output.lock,
      },
    };
  }

  if (output.type === 'IssueNft') {
    return {
      outpoint: {
        index: outputIndex,
        source_type: 'Transaction' as any,
        source_id: txId,
      },
      utxo: {
        type: output.type,
        value: output.value,
        destination: output.destination,
        token_id: output.token_id,
        data: output.data,
      } as any,
    };
  }

  if (output.type === 'Htlc') {
    return {
      outpoint: {
        index: outputIndex,
        source_type: 'Transaction' as any,
        source_id: txId,
      },
      utxo: {
        type: output.type,
        value: output.value,
        htlc: output.htlc,
      } as any,
    };
  }

  return null;
}

function addAtoms(current: string, next: string | number | undefined): string {
  if (next === undefined) {
    return current;
  }

  return (BigInt(current) + BigInt(next.toString())).toString();
}

/**
 * Create an in-memory `WalletTxStore`.
 *
 * Useful for tests, examples, and simple bots that do not need persistence
 * across process restarts.
 */
export function createMemoryWalletTxStore(initial?: {
  transactions?: Record<string, WalletTx[]>;
  cursors?: Record<string, SyncCursor>;
}): WalletTxStore {
  const transactions = new Map<string, Map<string, WalletTx>>();
  const cursors = new Map<string, SyncCursor>();

  Object.entries(initial?.transactions ?? {}).forEach(([accountId, txs]) => {
    transactions.set(accountId, new Map(txs.map((tx) => [tx.txId, tx])));
  });

  Object.entries(initial?.cursors ?? {}).forEach(([accountId, cursor]) => {
    cursors.set(accountId, cursor);
  });

  return {
    async getTransactions(accountId: string): Promise<WalletTx[]> {
      return Array.from(transactions.get(accountId)?.values() ?? []);
    },

    async putTransaction(accountId: string, tx: WalletTx): Promise<void> {
      const accountTransactions = transactions.get(accountId) ?? new Map<string, WalletTx>();
      accountTransactions.set(tx.txId, tx);
      transactions.set(accountId, accountTransactions);
    },

    async removeTransaction(accountId: string, txId: string): Promise<void> {
      transactions.get(accountId)?.delete(txId);
    },

    async getCursor(accountId: string): Promise<SyncCursor | null> {
      return cursors.get(accountId) ?? null;
    },

    async setCursor(accountId: string, cursor: SyncCursor): Promise<void> {
      cursors.set(accountId, cursor);
    },
  };
}

/**
 * Headless wallet/account state derived from a wallet-relevant transaction log.
 *
 * `WalletState` is storage-agnostic and network-agnostic. It keeps a cached
 * derived view of wallet-owned outputs, spent outputs, balances, and spendable
 * UTXOs. The caller owns syncing, persistence implementation, address ownership
 * rules, signing, and broadcasting.
 */
export class WalletState {
  private readonly accountId: string;
  private readonly store: WalletTxStore;
  private readonly isMineOutput: IsMineOutput;
  private transactions: WalletTx[] = [];
  private outputs = new Map<string, WalletUtxo>();
  private spentBy = new Map<string, WalletTx>();
  private spentOutpoints = new Set<string>();

  private constructor(options: WalletStateOptions) {
    this.accountId = options.accountId;
    this.store = options.store;
    this.isMineOutput = options.isMineOutput;
  }

  /**
   * Load transactions from the store and build the initial derived cache.
   */
  static async create(options: WalletStateOptions): Promise<WalletState> {
    const walletState = new WalletState(options);
    await walletState.reload();
    return walletState;
  }

  /**
   * Reload all wallet transactions from the store and rebuild derived state.
   *
   * Call this when another process or component may have updated the store.
   */
  async reload(): Promise<void> {
    this.transactions = await this.store.getTransactions(this.accountId);
    this.rebuild();
  }

  /**
   * Return wallet-owned UTXOs from the current derived cache.
   *
   * By default spent, conflicted, orphaned, and rejected outputs are hidden.
   */
  getUtxos(options: WalletUtxoFilter = {}): WalletUtxo[] {
    return Array.from(this.outputs.values()).filter((utxo) => {
      if (!options.includeSpent && (utxo.status === 'spent' || utxo.status === 'spent_pending')) {
        return false;
      }

      if (!options.includeConflicted && utxo.status === 'conflicted') {
        return false;
      }

      if (!options.includeOrphaned && utxo.status === 'orphaned') {
        return false;
      }

      if (!options.includeRejected && utxo.status === 'rejected') {
        return false;
      }

      if (options.includeUnconfirmed === false && utxo.status === 'unconfirmed') {
        return false;
      }

      return true;
    });
  }

  /**
   * Return UTXOs that are safe to use under the provided spend policy.
   *
   * The default policy only returns confirmed UTXOs.
   */
  getSpendableUtxos(policy: SpendPolicy = {}): WalletUtxo[] {
    const resolvedPolicy = { ...DEFAULT_SPEND_POLICY, ...policy };

    return this.getUtxos().filter((utxo) => {
      if (utxo.status === 'confirmed') {
        return true;
      }

      if (utxo.status !== 'unconfirmed') {
        return false;
      }

      if (!resolvedPolicy.allowUnconfirmed) {
        return false;
      }

      if (resolvedPolicy.allowOwnChangeOnly && !utxo.createdByWallet) {
        return false;
      }

      return utxo.unconfirmedChainDepth <= resolvedPolicy.maxUnconfirmedChainDepth;
    });
  }

  /**
   * Return atom balances derived from visible wallet UTXOs.
   */
  getBalance(options: WalletUtxoFilter = {}): WalletBalance {
    return this.getUtxos(options).reduce<WalletBalance>(
      (balance, walletUtxo) => {
        const value = (walletUtxo.utxo as any).value;

        if (!value?.amount?.atoms) {
          return balance;
        }

        if (value.type === 'Coin') {
          balance.coin.atoms = addAtoms(balance.coin.atoms, value.amount.atoms);
          return balance;
        }

        if (value.type === 'TokenV1') {
          const tokenId = value.token_id;
          balance.tokens[tokenId] = {
            atoms: addAtoms(balance.tokens[tokenId]?.atoms ?? '0', value.amount.atoms),
          };
        }

        return balance;
      },
      { coin: { atoms: '0' }, tokens: {} },
    );
  }

  /**
   * Apply a transaction created locally by the wallet/bot.
   *
   * Local transactions reserve their inputs immediately as `spent_pending`, even
   * before broadcast succeeds, so the caller does not accidentally double-spend
   * them while broadcasting is in progress.
   */
  async applyLocalTx(tx: WalletTxInput): Promise<WalletTx> {
    const walletTx: WalletTx = {
      txId: getTxId(tx),
      tx,
      state: 'local',
      timestamp: Date.now(),
      createdByWallet: true,
    };

    this.assertNoDoubleSpend(walletTx);
    await this.store.putTransaction(this.accountId, walletTx);
    await this.reload();
    return walletTx;
  }

  /**
   * Apply a transaction observed or accepted in mempool.
   *
   * Use this after successful broadcast, or when a scanner reports an
   * unconfirmed wallet-relevant transaction.
   */
  async applyMempoolTx(tx: WalletTxInput | WalletTx): Promise<WalletTx> {
    const walletTx: WalletTx =
      'state' in tx
        ? { ...tx, state: 'mempool' }
        : {
            txId: getTxId(tx),
            tx,
            state: 'mempool',
            timestamp: Date.now(),
          };

    await this.store.putTransaction(this.accountId, walletTx);
    await this.reload();
    return walletTx;
  }

  /**
   * Mark a local/mempool transaction as rejected by broadcast or policy.
   *
   * Rejected transactions no longer reserve their inputs. Any local transaction
   * that depends on a rejected output is also rejected in derived state, allowing
   * callers to rebuild from valid base UTXOs.
   */
  async markBroadcastRejected(
    txId: string,
    options: {
      reason?: string;
      rebuildRequired?: boolean;
    } = {},
  ): Promise<void> {
    const tx = this.transactions.find((item) => item.txId === txId);

    if (!tx) {
      throw new Error(`Transaction ${txId} not found in wallet state`);
    }

    await this.store.putTransaction(this.accountId, {
      ...tx,
      state: 'rejected',
      rejectionReason: options.reason,
      rebuildRequired: options.rebuildRequired ?? true,
    });
    await this.reload();
  }

  /**
   * Apply scanner/network updates and advance the sync cursor.
   *
   * This is the main integration point for a future wallet updater. It can add
   * wallet-relevant transactions, confirm local/mempool transactions, mark
   * conflicts, and mark outputs spent.
   */
  async applySyncDiff(diff: WalletSyncDiff): Promise<void> {
    const existingTransactions = new Map(this.transactions.map((tx) => [tx.txId, tx]));

    for (const tx of diff.transactions) {
      const normalizedTx = { ...tx, state: getWalletTxState(tx) };
      await this.store.putTransaction(this.accountId, normalizedTx);
      existingTransactions.set(normalizedTx.txId, normalizedTx);
    }

    for (const txId of diff.confirmedTxIds ?? []) {
      const tx = existingTransactions.get(txId);
      if (tx) {
        await this.store.putTransaction(this.accountId, {
          ...tx,
          state: 'confirmed',
          blockHeight: diff.toCursor.height,
          blockHash: diff.toCursor.blockHash,
        });
      }
    }

    for (const txId of diff.conflictedTxIds ?? []) {
      const tx = existingTransactions.get(txId);
      if (tx) {
        await this.store.putTransaction(this.accountId, { ...tx, state: 'conflicted' });
      }
    }

    for (const spent of diff.spent ?? []) {
      this.spentOutpoints.add(outPointKey(spent));
    }

    await this.store.setCursor(this.accountId, diff.toCursor);
    await this.reload();
  }

  /**
   * Mark confirmed transactions above the provided height as orphaned.
   *
   * Use this when the sync layer detects a chain rollback.
   */
  async rollbackTo(cursorOrHeight: SyncCursor | number): Promise<void> {
    const height = typeof cursorOrHeight === 'number' ? cursorOrHeight : cursorOrHeight.height;

    for (const tx of this.transactions) {
      if (tx.blockHeight !== undefined && tx.blockHeight > height) {
        await this.store.putTransaction(this.accountId, { ...tx, state: 'orphaned' });
      }
    }

    if (typeof cursorOrHeight !== 'number') {
      await this.store.setCursor(this.accountId, cursorOrHeight);
    }

    await this.reload();
  }

  /**
   * Refresh derived state from the store.
   *
   * This placeholder keeps the public API ready for later freshness checks
   * against a network tip.
   */
  async ensureFresh(): Promise<void> {
    await this.reload();
  }

  private rebuild(): void {
    this.outputs = new Map();
    this.spentBy = new Map();
    const rejectedTxIds = this.getRejectedTxIds();

    for (const tx of this.transactions) {
      const txJson = getTxJson(tx.tx);
      const storedTxState = getWalletTxState(tx);
      const txState =
        rejectedTxIds.has(tx.txId) && storedTxState !== 'conflicted' && storedTxState !== 'orphaned'
          ? 'rejected'
          : storedTxState;

      for (const input of txJson.inputs) {
        const outpoint = getInputOutPoint(input);
        if (outpoint && txState !== 'conflicted' && txState !== 'orphaned' && txState !== 'rejected') {
          this.spentBy.set(outPointKey(outpoint), tx);
        }
      }

      txJson.outputs.forEach((output, outputIndex) => {
        const utxo = outputToUtxoEntry(tx.txId, outputIndex, output);
        if (!utxo || !this.isMineOutput(output, { tx, txJson, outputIndex, utxo })) {
          return;
        }

        this.outputs.set(outPointKey({ txId: tx.txId, outputIndex }), {
          ...utxo,
          txId: tx.txId,
          outputIndex,
          status: this.getInitialUtxoStatus(txState),
          txState,
          blockHeight: tx.blockHeight,
          blockHash: tx.blockHash,
          createdByWallet: tx.createdByWallet,
          unconfirmedChainDepth: this.getUnconfirmedChainDepth(tx),
        });
      });
    }

    for (const [key, spender] of this.spentBy.entries()) {
      const output = this.outputs.get(key);

      if (!output) {
        continue;
      }

      output.status = getWalletTxState(spender) === 'confirmed' ? 'spent' : 'spent_pending';
    }

    for (const key of this.spentOutpoints) {
      const output = this.outputs.get(key);
      if (output) {
        output.status = 'spent';
      }
    }
  }

  private getInitialUtxoStatus(txState: TxState): WalletUtxoStatus {
    if (txState === 'confirmed') {
      return 'confirmed';
    }

    if (txState === 'conflicted') {
      return 'conflicted';
    }

    if (txState === 'orphaned') {
      return 'orphaned';
    }

    if (txState === 'rejected') {
      return 'rejected';
    }

    return 'unconfirmed';
  }

  private getUnconfirmedChainDepth(tx: WalletTx): number {
    if (getWalletTxState(tx) === 'confirmed') {
      return 0;
    }

    const txJson = getTxJson(tx.tx);
    const parentDepths = txJson.inputs
      .map(getInputOutPoint)
      .filter((outpoint): outpoint is OutPoint => outpoint !== null)
      .map((outpoint) => this.outputs.get(outPointKey(outpoint))?.unconfirmedChainDepth ?? 0);

    return Math.max(1, ...parentDepths.map((depth) => depth + 1));
  }

  private assertNoDoubleSpend(tx: WalletTx): void {
    const txJson = getTxJson(tx.tx);

    for (const input of txJson.inputs) {
      const outpoint = getInputOutPoint(input);
      if (!outpoint) {
        continue;
      }

      const existingSpender = this.spentBy.get(outPointKey(outpoint));
      if (existingSpender && existingSpender.txId !== tx.txId) {
        throw new Error(
          `Output ${outpoint.txId}:${outpoint.outputIndex} is already spent by transaction ${existingSpender.txId}`,
        );
      }
    }
  }

  private getRejectedTxIds(): Set<string> {
    const rejectedTxIds = new Set(
      this.transactions
        .filter((tx) => {
          const txState = getWalletTxState(tx);
          return txState === 'rejected' || txState === 'conflicted' || txState === 'orphaned';
        })
        .map((tx) => tx.txId),
    );

    let changed = true;
    while (changed) {
      changed = false;

      for (const tx of this.transactions) {
        if (rejectedTxIds.has(tx.txId)) {
          continue;
        }

        const txJson = getTxJson(tx.tx);
        const dependsOnRejectedTx = txJson.inputs
          .map(getInputOutPoint)
          .some((outpoint) => outpoint && rejectedTxIds.has(outpoint.txId));

        if (dependsOnRejectedTx) {
          rejectedTxIds.add(tx.txId);
          changed = true;
        }
      }
    }

    return rejectedTxIds;
  }
}
