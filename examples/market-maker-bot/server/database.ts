import Database from 'better-sqlite3';
import { chmodSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { SyncCursor, WalletTx, WalletTxInput, WalletTxStore } from '@mintlayer/sdk';
import type { BotEvent, CommandEnvelope, CommandResult, Control } from '../shared/protocol';
import type { ExecutionRecord, ExecutionRequest, MarketMakerConfig } from '../src/lib/types';

export type Attempt = {
  record: ExecutionRecord;
  request: ExecutionRequest;
  tx?: WalletTxInput;
  signedHex?: string;
  retries: number;
  retryAt: number;
  preview?: boolean;
  submittedAt?: number;
  submittedCursor?: SyncCursor;
  orderScan?: { nextHeight: number; anchor?: SyncCursor; concluded: string[] };
  createdOrder?: import('../src/lib/types').MarketOrder & { originTxId: string };
};
type JsonRow = { json: string };
export const txJson = (tx: WalletTxInput) => ('JSONRepresentation' in tx ? tx.JSONRepresentation : tx);
export const inputResources = (tx: WalletTxInput): string[] =>
  txJson(tx).inputs.flatMap((entry: any) => {
    const input = entry?.input;
    if (input?.input_type === 'UTXO') return [`utxo:${input.source_type}:${input.source_id}:${input.index}`];
    if (input?.input_type === 'AccountCommand' && input.order_id) return [`order:${input.order_id}`];
    return [];
  });

export class BotDatabase {
  readonly db: Database.Database;
  private lock?: Database.Database;

  constructor(
    readonly path: string,
    own = true,
  ) {
    if (path !== ':memory:') {
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
      if (own) {
        this.lock = new Database(`${path}.owner`, { timeout: 0 });
        try {
          this.lock.exec('PRAGMA journal_mode=DELETE; BEGIN EXCLUSIVE');
        } catch {
          this.lock.close();
          throw new Error('Another bot process owns this database');
        }
      }
    }
    try {
      this.db = new Database(path, { timeout: 5000 });
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = FULL');
      this.db.pragma('foreign_keys = ON');
      this.migrate();
      if (path !== ':memory:') chmodSync(path, 0o600);
    } catch (error) {
      this.lock?.close();
      throw error;
    }
  }

  private migrate(): void {
    const version = this.db.pragma('user_version', { simple: true }) as number;
    if (version > 1) throw new Error('Database schema is newer than this bot');
    if (version === 1) return;
    this.db.transaction(() => {
      this.db.exec(`
        CREATE TABLE settings (key TEXT PRIMARY KEY, json TEXT NOT NULL);
        CREATE TABLE wallet_transactions (
          sequence INTEGER PRIMARY KEY AUTOINCREMENT, account_id TEXT NOT NULL,
          tx_id TEXT NOT NULL, json TEXT NOT NULL, UNIQUE(account_id, tx_id)
        );
        CREATE TABLE wallet_cursors (account_id TEXT PRIMARY KEY, json TEXT NOT NULL);
        CREATE TABLE attempts (
          sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
          idempotency_key TEXT NOT NULL UNIQUE, status TEXT NOT NULL, tx_id TEXT,
          json TEXT NOT NULL, updated_at INTEGER NOT NULL
        );
        CREATE INDEX attempts_status ON attempts(status, updated_at);
        CREATE TABLE reservations (resource TEXT PRIMARY KEY, attempt_id TEXT NOT NULL REFERENCES attempts(id));
        CREATE TABLE orders (id TEXT PRIMARY KEY, json TEXT NOT NULL, owned INTEGER NOT NULL, concluded INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, level TEXT NOT NULL,
          kind TEXT NOT NULL, message TEXT NOT NULL, context TEXT NOT NULL);
        CREATE TABLE commands (id TEXT PRIMARY KEY, command TEXT NOT NULL, status TEXT NOT NULL,
          error TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
        CREATE INDEX commands_status ON commands(status, created_at);
        PRAGMA user_version = 1;
      `);
    })();
  }

  atomic<T>(fn: () => T): T {
    return this.db.transaction(fn).immediate();
  }
  getSetting<T>(key: string): T | null {
    const row = this.db.prepare('SELECT json FROM settings WHERE key=?').get(key) as JsonRow | undefined;
    return row ? JSON.parse(row.json) : null;
  }
  setSetting(key: string, value: unknown): void {
    this.db
      .prepare('INSERT INTO settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET json=excluded.json')
      .run(key, JSON.stringify(value));
  }
  initialize(config: MarketMakerConfig): { config: MarketMakerConfig; control: Control } {
    const saved = this.getSetting<{ config: MarketMakerConfig; control: Control }>('bot');
    if (saved) {
      if (saved.config.network !== config.network)
        throw new Error('Database network differs from BOT_NETWORK; use a separate BOT_DB_PATH');
      return saved;
    }
    const state = { config, control: { running: false, executionMode: 'dry-run' as const, configVersion: 1 } };
    this.setSetting('bot', state);
    return state;
  }
  walletStore(): WalletTxStore {
    return {
      getTransactions: async (account) => this.transactions(account),
      putTransaction: async (account, tx) => {
        this.putWalletTx(account, tx);
      },
      removeTransaction: async (account, txId) => {
        this.db.prepare('DELETE FROM wallet_transactions WHERE account_id=? AND tx_id=?').run(account, txId);
      },
      getCursor: async (account) => this.cursor(account),
      setCursor: async (account, cursor) => {
        this.db
          .prepare('INSERT INTO wallet_cursors VALUES (?,?) ON CONFLICT(account_id) DO UPDATE SET json=excluded.json')
          .run(account, JSON.stringify(cursor));
      },
    };
  }
  transactions(account: string): WalletTx[] {
    return (
      this.db
        .prepare('SELECT json FROM wallet_transactions WHERE account_id=? ORDER BY sequence')
        .all(account) as JsonRow[]
    ).map((row) => JSON.parse(row.json));
  }
  putWalletTx(account: string, tx: WalletTx): void {
    this.db
      .prepare(
        'INSERT INTO wallet_transactions(account_id,tx_id,json) VALUES (?,?,?) ON CONFLICT(account_id,tx_id) DO UPDATE SET json=excluded.json',
      )
      .run(account, tx.txId, JSON.stringify({ ...tx, tx: txJson(tx.tx) }));
  }
  cursor(account: string): SyncCursor | null {
    const row = this.db.prepare('SELECT json FROM wallet_cursors WHERE account_id=?').get(account) as
      JsonRow | undefined;
    return row ? JSON.parse(row.json) : null;
  }
  getAttempt(id: string): Attempt | null {
    const row = this.db.prepare('SELECT json FROM attempts WHERE id=? OR idempotency_key=?').get(id, id) as
      JsonRow | undefined;
    return row ? JSON.parse(row.json) : null;
  }
  attemptByTxId(id: string): Attempt | null {
    const row = this.db.prepare(
      "SELECT json FROM attempts WHERE tx_id=? AND COALESCE(json_extract(json,'$.preview'),0)=0 ORDER BY sequence DESC LIMIT 1",
    ).get(id) as JsonRow | undefined;
    return row ? JSON.parse(row.json) : null;
  }
  saveAttempt(attempt: Attempt): void {
    const { record } = attempt;
    this.db
      .prepare(
        `INSERT INTO attempts(id,idempotency_key,status,tx_id,json,updated_at) VALUES (?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET status=excluded.status,tx_id=excluded.tx_id,json=excluded.json,updated_at=excluded.updated_at`,
      )
      .run(
        record.id,
        record.idempotencyKey,
        record.status,
        record.txId ?? null,
        JSON.stringify(attempt),
        record.updatedAt,
      );
  }
  /** Signed bytes and the SDK wallet reservation become durable together. */
  reserve(account: string, attempt: Attempt, recovering = false): void {
    if (!attempt.tx || !attempt.signedHex) throw new Error('Cannot reserve an unsigned transaction');
    this.atomic(() => {
      this.saveAttempt(attempt);
      for (const resource of inputResources(attempt.tx!)) {
        if (recovering) {
          const owner = this.db.prepare('SELECT attempt_id FROM reservations WHERE resource=?').get(resource) as { attempt_id: string } | undefined;
          if (owner?.attempt_id === attempt.record.id || (owner && resource.startsWith('order:'))) continue;
        }
        this.db.prepare('INSERT INTO reservations VALUES (?,?)').run(resource, attempt.record.id);
      }
      this.putWalletTx(account, {
        txId: txJson(attempt.tx!).id,
        tx: txJson(attempt.tx!),
        state: 'local',
        timestamp: attempt.record.createdAt,
        createdByWallet: true,
      });
      if (attempt.createdOrder) {
        this.saveOrder(attempt.createdOrder, true);
        // A never-submitted/cancelled creation can be rebuilt to the same tx ID
        // and therefore the same order ID. Reopen its local placeholder only
        // at this explicit reservation, never from a historical market page.
        this.db.prepare('UPDATE orders SET concluded=0 WHERE id=?').run(attempt.createdOrder.order_id);
      }
    });
  }
  transition(account: string, attempt: Attempt, walletTx?: WalletTx, release = false): void {
    this.atomic(() => {
      this.saveAttempt(attempt);
      if (walletTx) this.putWalletTx(account, walletTx);
      if (release) this.db.prepare('DELETE FROM reservations WHERE attempt_id=?').run(attempt.record.id);
      if (release && attempt.createdOrder && ['cancelled', 'rejected', 'conflicted'].includes(attempt.record.status))
        this.concludeOrder(attempt.createdOrder.order_id);
      this.event('info', 'transaction', `${attempt.record.kind}: ${attempt.record.status}`, {
        actionId: attempt.record.id,
        txId: attempt.record.txId,
      });
    });
  }
  reservedResources(): Set<string> {
    const resources = new Set(
      (this.db.prepare('SELECT resource FROM reservations').all() as { resource: string }[]).map((row) => row.resource),
    );
    // Recovered fill/conclude chains can share an order reservation. Keep the
    // order fenced until every pending command is settled, even if its first
    // reservation owner confirms before the rest of the chain.
    for (const attempt of this.pendingAttempts())
      if (attempt.request.kind === 'fill-order' || attempt.request.kind === 'conclude-order')
        resources.add(`order:${attempt.request.orderId}`);
    return resources;
  }
  listAttempts(limit = 200, before = Number.MAX_SAFE_INTEGER): Attempt[] {
    return (
      this.db
        .prepare('SELECT json FROM attempts WHERE sequence < ? ORDER BY sequence DESC LIMIT ?')
        .all(before, limit) as JsonRow[]
    ).map((row) => JSON.parse(row.json));
  }
  pendingAttempts(): Attempt[] {
    return (
      this.db
        .prepare(
          "SELECT json FROM attempts WHERE status IN ('signed','local','submitting','unknown','broadcasted') AND COALESCE(json_extract(json,'$.preview'),0)=0 ORDER BY sequence",
        )
        .all() as JsonRow[]
    ).map((row) => JSON.parse(row.json));
  }
  orderAttempts(id: string): Attempt[] {
    return (
      this.db
        .prepare(
          "SELECT json FROM attempts WHERE json_extract(json,'$.request.orderId')=? AND COALESCE(json_extract(json,'$.preview'),0)=0 ORDER BY sequence DESC LIMIT 100",
        )
        .all(id) as JsonRow[]
    ).map((row) => JSON.parse(row.json));
  }
  history(limit: number, before: number): { items: ExecutionRecord[]; nextCursor: number | null } {
    const rows = this.db
      .prepare('SELECT sequence,json FROM attempts WHERE sequence < ? ORDER BY sequence DESC LIMIT ?')
      .all(before, limit + 1) as (JsonRow & { sequence: number })[];
    return {
      items: rows.slice(0, limit).map((row) => this.publicRecord(JSON.parse(row.json).record)),
      nextCursor: rows.length > limit ? rows[limit - 1].sequence : null,
    };
  }
  publicRecord(record: ExecutionRecord): ExecutionRecord {
    const { signedHex: _hex, broadcastResponse: _response, ...publicRecord } = record;
    return publicRecord;
  }
  saveOrder(order: { order_id: string }, owned: boolean, concluded = false): void {
    this.db
      .prepare(
        `INSERT INTO orders(id,json,owned,concluded) VALUES (?,?,?,?) ON CONFLICT(id)
      DO UPDATE SET json=excluded.json, owned=MAX(orders.owned,excluded.owned),concluded=MAX(orders.concluded,excluded.concluded)`,
      )
      .run(order.order_id, JSON.stringify(order), Number(owned), Number(concluded));
  }
  ownOrders<T>(): T[] {
    return (this.db.prepare('SELECT json FROM orders WHERE owned=1 AND concluded=0').all() as JsonRow[]).map((row) =>
      JSON.parse(row.json),
    );
  }
  concludeOrder(id: string): void {
    this.db.prepare('UPDATE orders SET concluded=1 WHERE id=?').run(id);
  }
  restoreConfirmedCreation(id: string): void {
    this.db.prepare('UPDATE orders SET concluded=0 WHERE id=?').run(id);
  }
  resetConcludedOrders(): void {
    this.db.prepare('UPDATE orders SET concluded=0 WHERE owned=1').run();
  }
  event(level: BotEvent['level'], kind: string, message: string, context: Record<string, unknown> = {}): number {
    return Number(
      this.db
        .prepare('INSERT INTO events(at,level,kind,message,context) VALUES (?,?,?,?,?)')
        .run(Date.now(), level, kind, message, JSON.stringify(context)).lastInsertRowid,
    );
  }
  events(limit = 100, before = Number.MAX_SAFE_INTEGER): BotEvent[] {
    return (
      this.db.prepare('SELECT * FROM events WHERE id < ? ORDER BY id DESC LIMIT ?').all(before, limit) as (Omit<
        BotEvent,
        'context'
      > & { context: string })[]
    ).map((row) => ({ ...row, context: JSON.parse(row.context) }));
  }
  enqueue(envelope: CommandEnvelope): CommandResult {
    const existing = this.db.prepare('SELECT command FROM commands WHERE id=?').get(envelope.id) as
      { command: string } | undefined;
    if (existing && existing.command !== JSON.stringify(envelope.command))
      throw new Error('Command id is already used for a different command');
    const now = Date.now();
    this.db
      .prepare("INSERT OR IGNORE INTO commands VALUES (?,?,'queued',NULL,?,?)")
      .run(envelope.id, JSON.stringify(envelope.command), now, now);
    return this.command(envelope.id)!;
  }
  command(id: string): CommandResult | null {
    const row = this.db.prepare('SELECT * FROM commands WHERE id=?').get(id) as any;
    return row
      ? {
          id: row.id,
          status: row.status,
          error: row.error ?? undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : null;
  }
  queuedCommands(): CommandEnvelope[] {
    return (
      this.db
        .prepare("SELECT id,command FROM commands WHERE status='queued' ORDER BY created_at,rowid LIMIT 50")
        .all() as { id: string; command: string }[]
    ).map((row) => ({ id: row.id, command: JSON.parse(row.command) }));
  }
  isLatestControl(id: string, kinds: string[]): boolean {
    const row = this.db
      .prepare(
        `SELECT id FROM commands WHERE json_extract(command,'$.kind') IN (${kinds.map(() => '?').join(',')}) ORDER BY rowid DESC LIMIT 1`,
      )
      .get(...kinds) as { id: string } | undefined;
    return row?.id === id;
  }
  finishCommand(id: string, error?: string): void {
    const existing = this.command(id);
    if (!existing || existing.status === 'applied' || existing.status === 'failed') return;
    this.atomic(() => {
      this.db
        .prepare('UPDATE commands SET status=?,error=?,updated_at=? WHERE id=?')
        .run(error ? 'failed' : 'applied', error ?? null, Date.now(), id);
      const row = this.db.prepare("SELECT json_extract(command,'$.kind') AS kind FROM commands WHERE id=?").get(id) as {
        kind: string;
      };
      this.event(error ? 'warn' : 'info', 'command', error ?? `${row.kind} applied`, { commandId: id, kind: row.kind });
    });
  }
  totals(): { transactions: number; events: number } {
    return {
      transactions: (this.db.prepare('SELECT COUNT(*) AS n FROM attempts').get() as { n: number }).n,
      events: (this.db.prepare('SELECT COUNT(*) AS n FROM events').get() as { n: number }).n,
    };
  }
  reservedFeesSince(since: number): bigint {
    const rows = this.db
      .prepare(
        "SELECT json FROM attempts WHERE status IN ('signed','local','submitting','unknown','broadcasted','confirmed') AND COALESCE(json_extract(json,'$.preview'),0)=0 AND json_extract(json,'$.submittedAt')>=?",
      )
      .all(since) as JsonRow[];
    return rows.reduce((total, row) => {
      const attempt = JSON.parse(row.json) as Attempt;
      const fee = attempt.tx && (txJson(attempt.tx).fee as { atoms?: string } | undefined);
      return total + BigInt(fee?.atoms ?? '0');
    }, 0n);
  }
  maintain(retentionDays: number): void {
    this.db.prepare('DELETE FROM events WHERE at < ?').run(Date.now() - retentionDays * 86_400_000);
    this.db
      .prepare("DELETE FROM commands WHERE status IN ('applied','failed') AND updated_at < ?")
      .run(Date.now() - retentionDays * 86_400_000);
    this.db.pragma('wal_checkpoint(PASSIVE)');
  }
  async backup(path: string): Promise<void> {
    await this.db.backup(path);
    chmodSync(path, 0o600);
  }
  close(): void {
    this.db.close();
    this.lock?.close();
  }
}
