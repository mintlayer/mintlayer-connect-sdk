import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { orderIdFromInputs, orderIdFromJson } from '../server/orderId';
import { Client, WalletState, atomsToDecimal, decimalsToAtoms, type WalletTx } from '@mintlayer/sdk';
import { BotDatabase, inputResources, type Attempt } from '../server/database';
import { ChainApi, createClient } from '../server/chain';
import { Executor } from '../server/execution';
import { BotRunner } from '../server/runtime';
import { createHttpServer } from '../server/http';
import { DEFAULT_CONFIG } from '../src/lib/config';
import type { ServerOptions } from '../server/config';
import { planServerActions } from '../server/strategy';

const seed = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const address = 'tmt1qx5p4r2en7c99mpmg2tz9hucxfarf4k6dyyvsahr';
const token = 'tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq';
const block = 'a'.repeat(64),
  funding = 'b'.repeat(64);
const output = (value = '10000000000000') => ({
  type: 'Transfer',
  destination: address,
  value: { type: 'Coin', amount: { atoms: value, decimal: '100' } },
});
const input = (id = funding) => ({
  input: { input_type: 'UTXO', source_type: 'Transaction', source_id: id, index: 0 },
  utxo: output(),
});
const log = { info() {}, warn() {}, error() {} };
function options(overrides: Partial<ServerOptions> = {}): ServerOptions {
  return {
    config: { ...DEFAULT_CONFIG, baseToken: token, pair: 'XYZ/TML', orderSize: 0.1, maxPosition: 10 },
    walletSeed: seed,
    apiUrl: 'http://indexer.test/api/v2',
    dbPath: ':memory:',
    host: '127.0.0.1',
    port: 0,
    requestTimeoutMs: 1000,
    staleAfterMs: 60_000,
    autoResume: false,
    maxPending: 24,
    eventRetentionDays: 14,
    ...overrides,
  };
}
function fixture(overrides: Partial<ServerOptions> = {}) {
  const opts = options(overrides);
  const observed = new Map<string, any>();
  observed.set(funding, { id: funding, inputs: [], outputs: [output()], block_id: block });
  const submissions: string[] = [];
  let failBroadcast = false;
  const orders: any[] = [];
  const lookupOrders = new Map<string, any>();
  const history: string[] = [funding];
  let chainHash = block;
  const fetcher: typeof fetch = async (url, init) => {
    const path = new URL(String(url)).pathname.replace('/api/v2', '');
    const json = (value: unknown, status = 200) =>
      new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
    if (path === '/chain/tip') return json({ block_height: 100, block_id: chainHash });
    if (path === '/chain/100') return json(chainHash);
    if (path.startsWith('/block/')) return json({ height: 100 });
    if (path.startsWith('/token/')) return json({ number_of_decimals: 6, token_ticker: { string: 'XYZ' } });
    if (path.startsWith('/order/pair/')) return json(orders);
    if (path.startsWith('/order/')) {
      const found =
        lookupOrders.get(path.split('/').pop()!) ?? orders.find((order) => order.order_id === path.split('/').pop());
      return json(found ?? {}, found ? 200 : 404);
    }
    if (path.startsWith('/address/') && !path.endsWith('/spendable-utxos'))
      return json({ transaction_history: path.includes(address) ? history : [] });
    if (path.endsWith('/spendable-utxos'))
      return json(
        path.includes(address)
          ? [{ outpoint: { source_type: 'Transaction', source_id: funding, index: 0 }, utxo: output() }]
          : [],
      );
    if (path.includes('/output/')) return json({}, 404);
    if (path.startsWith('/transaction/')) {
      const tx = observed.get(path.split('/').pop()!);
      return json(tx ?? {}, tx ? 200 : 404);
    }
    if (path === '/transaction' && init?.method === 'POST') {
      submissions.push(String(init.body));
      if (failBroadcast) throw new Error('response lost');
      return new Response(null, { status: 200 });
    }
    throw new Error(`Unexpected test request: ${path}`);
  };
  return {
    opts,
    api: new ChainApi(opts, fetcher),
    observed,
    submissions,
    orders,
    lookupOrders,
    history,
    reorg: () => {
      chainHash = 'd'.repeat(64);
      observed.get(funding).block_id = chainHash;
    },
    fail: () => {
      failBroadcast = true;
    },
  };
}
async function wallet(db: BotDatabase) {
  db.putWalletTx('bot', {
    txId: funding,
    tx: { id: funding, inputs: [], outputs: [output()] },
    state: 'confirmed',
    blockHeight: 100,
    blockHash: block,
  });
  return WalletState.create({
    accountId: 'bot',
    store: db.walletStore(),
    isMineOutput: (value: any) => value.destination === address,
  });
}
function mockClient(deferred?: Promise<void>) {
  const tx = { id: 'c'.repeat(64), inputs: [input()], outputs: [output('9000000000000')] };
  const broadcasts: string[] = [];
  const client = {
    async buildTransfer() {
      await deferred;
      return { JSONRepresentation: tx };
    },
    async signTransaction() {
      return 'abcd';
    },
    async broadcastTx(hex: string) {
      broadcasts.push(hex);
    },
  } as unknown as Client;
  return { client, tx, broadcasts };
}
const request = {
  id: 'transfer',
  kind: 'prepare-utxo' as const,
  to: address,
  amount: 1,
  description: 'Prepare',
  idempotencyKey: 'prepare-test',
};

test('SQLite WalletTxStore restores the SDK wallet and cursor after reopening', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mm-store-'));
  try {
    const path = join(dir, 'bot.sqlite');
    let db = new BotDatabase(path);
    const state = await wallet(db);
    await state.applyLocalTx({ id: 'child', inputs: [input()], outputs: [output('9000000000000')] });
    await db.walletStore().setCursor('bot', { height: 100, blockHash: block });
    db.close();
    db = new BotDatabase(path);
    const restored = await WalletState.create({
      accountId: 'bot',
      store: db.walletStore(),
      isMineOutput: (value: any) => value.destination === address,
    });
    assert.equal(restored.getSpendableUtxos().length, 0);
    assert.equal(restored.getSpendableUtxos({ allowUnconfirmed: true }).length, 1);
    assert.equal(db.cursor('bot')?.blockHash, block);
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('only one process owner can open a database; closing releases the OS lock', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mm-lock-'));
  try {
    const db = new BotDatabase(join(dir, 'bot.sqlite'));
    assert.throws(() => new BotDatabase(db.path), /Another bot/);
    db.close();
    new BotDatabase(join(dir, 'bot.sqlite')).close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a conflicting reservation rolls back the whole second attempt', async () => {
  const db = new BotDatabase(':memory:');
  const state = await wallet(db);
  const { client } = mockClient();
  const executor = new Executor(db, client, state, 'bot');
  const first = await executor.execute(request, options().config, state.getSpendableUtxos(), () => true, false);
  assert.equal(first?.record.status, 'broadcasted');
  assert.equal(db.reservedResources().size, 1);
  const second = { ...first!, record: { ...first!.record, id: 'second', idempotencyKey: 'second' } };
  assert.throws(() => db.reserve('bot', second), /UNIQUE/);
  assert.equal(db.getAttempt('second'), null);
  assert.equal(db.reservedResources().size, 1);
  db.close();
});

test('preview does not reserve funds or become eligible for recovery broadcast', async () => {
  const db = new BotDatabase(':memory:');
  const state = await wallet(db);
  const { client, broadcasts } = mockClient();
  const executor = new Executor(db, client, state, 'bot');
  const preview = await executor.execute(request, options().config, state.getSpendableUtxos(), () => false, true);
  assert.equal(preview?.record.status, 'signed');
  assert.equal(db.pendingAttempts().length, 0);
  assert.equal(db.reservedResources().size, 0);
  assert.equal(state.getSpendableUtxos().length, 1);
  await executor.execute(request, options().config, state.getSpendableUtxos(), () => true, false);
  assert.equal(broadcasts.length, 1);
  db.close();
});

test('Stop during an asynchronous build prevents signing and broadcast', async () => {
  let resume!: () => void;
  const deferred = new Promise<void>((resolve) => {
    resume = resolve;
  });
  const db = new BotDatabase(':memory:');
  const state = await wallet(db);
  const { client, broadcasts } = mockClient(deferred);
  let enabled = true;
  const pending = new Executor(db, client, state, 'bot').execute(
    request,
    options().config,
    state.getSpendableUtxos(),
    () => enabled,
    false,
  );
  enabled = false;
  resume();
  assert.equal((await pending)?.record.status, 'cancelled');
  assert.equal(broadcasts.length, 0);
  assert.equal(db.reservedResources().size, 0);
  db.close();
});

test('a lost broadcast response retains exact bytes and input reservations', async () => {
  const db = new BotDatabase(':memory:');
  const state = await wallet(db);
  const mock = mockClient();
  mock.client.broadcastTx = async () => {
    throw new Error('response lost');
  };
  const attempt = await new Executor(db, mock.client, state, 'bot').execute(
    request,
    options().config,
    state.getSpendableUtxos(),
    () => true,
    false,
  );
  assert.equal(attempt?.record.status, 'unknown');
  assert.equal(db.reservedResources().size, 1);
  assert.equal(db.pendingAttempts()[0].signedHex, 'abcd');
  assert.equal(state.getSpendableUtxos().length, 0);
  db.close();
});

test('a crash writing the accepted result leaves submitting durable, never rejected', async () => {
  const db = new BotDatabase(':memory:');
  const state = await wallet(db);
  const mock = mockClient();
  db.transition = () => {
    throw new Error('disk full after submit');
  };
  await assert.rejects(
    new Executor(db, mock.client, state, 'bot').execute(
      request,
      options().config,
      state.getSpendableUtxos(),
      () => true,
      false,
    ),
    /disk full/,
  );
  assert.equal(mock.broadcasts.length, 1);
  assert.equal(db.pendingAttempts()[0].record.status, 'submitting');
  assert.equal(db.reservedResources().size, 1);
  db.close();
});

test('storage failure before reservation never reaches broadcast and preserves original error', async () => {
  const db = new BotDatabase(':memory:');
  const state = await wallet(db);
  const mock = mockClient();
  db.reserve = () => {
    throw new Error('disk full');
  };
  const attempt = await new Executor(db, mock.client, state, 'bot').execute(
    request,
    options().config,
    state.getSpendableUtxos(),
    () => true,
    false,
  );
  assert.equal(attempt?.record.error, 'disk full');
  assert.equal(mock.broadcasts.length, 0);
  db.close();
});

test('Node SDK builds and signs a real WASM transaction without DOM', async () => {
  assert.equal(typeof window, 'undefined');
  const f = fixture();
  const client = await createClient(f.opts, f.api);
  const tx = await client.buildTransfer(
    { to: address, amount: 1 },
    { withUTXO: await f.api.getAccountUtxos([address]) },
  );
  const signed = await client.signTransaction(tx);
  assert.match(signed, /^[0-9a-f]+$/);
  assert.ok(signed.length > 100);
  assert.equal(f.submissions.length, 0);
  const db = new BotDatabase(':memory:');
  const state = await wallet(db);
  await state.applyLocalTx(tx);
  assert.equal(db.transactions('bot').length, 2);
  assert.equal(state.getSpendableUtxos().length, 0);
  db.close();
});

test('pagination walks past 100 orders and preserves the pair direction', async () => {
  const calls: string[] = [];
  const api = new ChainApi(options(), async (url) => {
    calls.push(String(url));
    const offset = Number(new URL(String(url)).searchParams.get('offset'));
    return new Response(JSON.stringify(Array.from({ length: offset === 0 ? 100 : 7 }, (_, i) => ({ id: offset + i }))));
  });
  assert.equal((await api.all('/order/pair/a_TML')).length, 107);
  assert.equal(calls.length, 2);
  assert.match(calls[1], /offset=100/);
});

test('real runtime plans ordinary market making with simulation disabled and survives restart', async () => {
  const f = fixture();
  const db = new BotDatabase(':memory:');
  const runner = new BotRunner(db, f.api, f.opts, log);
  await runner.tick();
  assert.equal(runner.snapshot().stale, false);
  assert.equal(runner.snapshot().wallet?.availableUtxos.length, 1);
  assert.ok(runner.snapshot().actions.some((action) => action.kind === 'create-order'));
  runner.accept({ id: 'start', command: { kind: 'start' } });
  await runner.tick();
  assert.equal(runner.snapshot().control.running, true);
  assert.ok(db.listAttempts().some((attempt) => attempt.preview));
  assert.equal(f.submissions.length, 0);
  runner.accept({ id: 'stop', command: { kind: 'stop' } });
  assert.equal(runner.snapshot().control.running, false);
  await runner.close();
  const next = new BotRunner(db, f.api, f.opts, log);
  assert.equal(next.snapshot().control.running, false);
  assert.ok(next.snapshot().records.length > 0);
  await next.close();
  db.close();
});

test('accepted-but-response-lost is confirmed during recovery with no duplicate broadcast', async () => {
  const f = fixture();
  const db = new BotDatabase(':memory:');
  const state = await wallet(db);
  const mock = mockClient();
  mock.client.broadcastTx = async () => {
    throw new Error('response lost');
  };
  const attempt = await new Executor(db, mock.client, state, 'bot').execute(
    request,
    f.opts.config,
    state.getSpendableUtxos(),
    () => true,
    false,
  );
  assert.equal(attempt?.record.status, 'unknown');
  f.observed.set(mock.tx.id, { ...mock.tx, block_id: block });
  // Use the same real account identifier that the runner derives.
  const runner = new BotRunner(db, f.api, f.opts, log);
  await runner.tick();
  assert.equal(db.getAttempt(request.idempotencyKey)?.record.status, 'confirmed');
  assert.equal(db.reservedResources().size, 0);
  assert.equal(f.submissions.length, 0);
  await runner.close();
  db.close();
});

test('API uses sessions, rejects cross-origin commands, and sanitizes config payloads', async () => {
  const f = fixture({ adminPassword: 'server-test-password' });
  const db = new BotDatabase(':memory:');
  const runner = new BotRunner(db, f.api, f.opts, log);
  const { app } = createHttpServer(f.opts, runner);
  try {
    assert.equal((await app.inject('/api/state')).statusCode, 401);
    const login = await app.inject({
      method: 'POST',
      url: '/api/session',
      headers: { 'x-bot-request': '1' },
      payload: { password: f.opts.adminPassword },
    });
    assert.equal(login.statusCode, 200);
    const cookie = login.headers['set-cookie']!.toString().split(';')[0];
    assert.equal((await app.inject({ url: '/api/state', headers: { cookie } })).statusCode, 200);
    const rejected = await app.inject({
      method: 'POST',
      url: '/api/commands',
      headers: { cookie, 'x-bot-request': '1', origin: 'http://evil.test' },
      payload: { id: 'stop', command: { kind: 'stop' } },
    });
    assert.equal(rejected.statusCode, 403);
    const accepted = await app.inject({
      method: 'POST',
      url: '/api/commands',
      headers: { cookie, 'x-bot-request': '1' },
      payload: {
        id: 'config',
        command: {
          kind: 'config',
          expectedVersion: 1,
          config: { ...f.opts.config, walletSeed: 'do-not-persist', apiKey: 'do-not-persist' },
        },
      },
    });
    assert.equal(accepted.statusCode, 202);
    assert.ok(!JSON.stringify(db.queuedCommands()).includes('do-not-persist'));
    assert.ok(!JSON.stringify(runner.snapshot()).includes(seed));
  } finally {
    await runner.close();
    await app.close();
    db.close();
  }
});

test('SQLite online backup restores the journal independently of its WAL', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mm-backup-'));
  const db = new BotDatabase(join(dir, 'bot.sqlite'));
  try {
    await wallet(db);
    db.event('info', 'test', 'before backup');
    await db.backup(join(dir, 'backup.sqlite'));
    const backup = new BotDatabase(join(dir, 'backup.sqlite'));
    assert.equal(backup.transactions('bot').length, 1);
    assert.equal(backup.events()[0].message, 'before backup');
    backup.close();
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('exact string amounts preserve large atoms and zero-decimal assets', () => {
  assert.equal(decimalsToAtoms('9007199254740993', 0), 9007199254740993n);
  assert.equal(decimalsToAtoms('0.000000000000000001', 18), 1n);
  assert.equal(decimalsToAtoms('1e-8', 8), 1n);
  assert.equal(decimalsToAtoms('1.005', 2), 101n);
});

test('a stopped recovery retry cannot release a transaction that may already be accepted', async () => {
  const db = new BotDatabase(':memory:');
  const state = await wallet(db);
  const mock = mockClient();
  mock.client.broadcastTx = async () => {
    throw new Error('timeout');
  };
  const executor = new Executor(db, mock.client, state, 'bot');
  const attempt = (await executor.execute(request, options().config, state.getSpendableUtxos(), () => true, false))!;
  await executor.submit(attempt, () => false);
  assert.equal(db.getAttempt(request.idempotencyKey)?.record.status, 'unknown');
  assert.equal(db.reservedResources().size, 1);
  db.close();
});

test('an interrupted unsigned intent can resume instead of blocking its idempotency key forever', async () => {
  const db = new BotDatabase(':memory:');
  const state = await wallet(db);
  const mock = mockClient();
  db.saveAttempt({
    request,
    record: {
      id: 'unfinished',
      kind: request.kind,
      description: '',
      idempotencyKey: request.idempotencyKey,
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    retries: 0,
    retryAt: 0,
  });
  await new Executor(db, mock.client, state, 'bot').execute(
    request,
    options().config,
    state.getSpendableUtxos(),
    () => true,
    false,
  );
  assert.equal(mock.broadcasts.length, 1);
  assert.equal(db.getAttempt('unfinished')?.record.status, 'broadcasted');
  db.close();
});

test('a later Stop supersedes a queued Start even before wallet initialization', async () => {
  const f = fixture();
  const db = new BotDatabase(':memory:');
  const runner = new BotRunner(db, f.api, f.opts, log);
  runner.accept({ id: 'old-start', command: { kind: 'start' } });
  runner.accept({ id: 'new-stop', command: { kind: 'stop' } });
  await runner.tick();
  assert.equal(runner.snapshot().control.running, false);
  assert.equal(db.command('old-start')?.status, 'failed');
  assert.equal(db.command('new-stop')?.status, 'applied');
  await runner.close();
  db.close();
});

test('a later dry-run mode fences an earlier queued live mode', async () => {
  const f = fixture();
  const db = new BotDatabase(':memory:');
  const runner = new BotRunner(db, f.api, f.opts, log);
  runner.accept({ id: 'old-live', command: { kind: 'mode', mode: 'live' } });
  runner.accept({ id: 'new-dry', command: { kind: 'mode', mode: 'dry-run' } });
  await runner.tick();
  assert.equal(runner.snapshot().control.executionMode, 'dry-run');
  assert.equal(f.submissions.length, 0);
  await runner.close();
  db.close();
});

test('settled orders are not resurrected by a historical pair-list response', () => {
  const db = new BotDatabase(':memory:');
  db.saveOrder({ order_id: 'order' }, true);
  db.concludeOrder('order');
  db.saveOrder({ order_id: 'order', ...{ nonce: 3 } }, true);
  assert.equal(db.ownOrders().length, 0);
  db.close();
});

test('a stale snapshot never creates a quote even if an older wallet snapshot exists', async () => {
  const f = fixture();
  const db = new BotDatabase(':memory:');
  const runner = new BotRunner(db, f.api, f.opts, log);
  await runner.tick();
  assert.ok(runner.snapshot().actions.length > 0);
  f.api.pairOrders = async () => {
    throw new Error('indexer offline');
  };
  runner.accept({ id: 'live', command: { kind: 'mode', mode: 'live' } });
  runner.accept({ id: 'start', command: { kind: 'start' } });
  await runner.tick();
  assert.equal(runner.snapshot().stale, true);
  assert.equal(runner.snapshot().actions.length, 0);
  assert.equal(f.submissions.length, 0);
  await runner.close();
  db.close();
});

test('real Node WASM creates a durable order ID and a timed-out live attempt remains reserved', async () => {
  const f = fixture();
  f.fail();
  const db = new BotDatabase(':memory:');
  const runner = new BotRunner(db, f.api, f.opts, log);
  runner.accept({ id: 'live', command: { kind: 'mode', mode: 'live' } });
  runner.accept({ id: 'start', command: { kind: 'start' } });
  await runner.tick();
  assert.equal(f.submissions.length, 1);
  const attempt = db.pendingAttempts()[0];
  assert.equal(attempt.record.status, 'unknown');
  assert.match(attempt.createdOrder!.order_id, /^tordr1/);
  assert.ok(db.reservedResources().size > 0);
  assert.equal(runner.snapshot().wallet?.availableUtxos.length, 0);
  assert.ok(!JSON.stringify(runner.snapshot()).includes(f.submissions[0]));
  await runner.close();
  db.close();
});

test('taker fills use token metadata, respect open-order exposure, and retain exact payment atoms', () => {
  const opts = options();
  const config = { ...opts.config, inventoryTarget: 1, rebalanceThreshold: 0, maxPosition: 1 };
  const walletSnapshot = {
    addresses: { receiving: [address], change: [] },
    availableUtxos: [
      {
        outpoint: { source_type: 'Transaction', source_id: funding, index: 0 },
        utxo: output(),
        txId: funding,
        outputIndex: 0,
        status: 'confirmed',
        txState: 'confirmed',
        unconfirmedChainDepth: 0,
      },
    ],
  } as any;
  const external = {
    order_id: 'external',
    conclude_destination: 'other',
    ask_currency: { type: 'Coin' as const },
    give_currency: { type: 'Token' as const, token_id: token },
    initially_asked: { atoms: '100000000000' },
    ask_balance: { atoms: '100000000000' },
    initially_given: { atoms: '1000000' },
    give_balance: { atoms: '1000000' },
    nonce: 0,
  };
  const labels = {
    Coin: { tokenId: 'Coin', ticker: 'TML', decimals: 11 },
    [token]: { tokenId: token, ticker: 'XYZ', decimals: 6 },
  };
  const actions = planServerActions({
    config,
    wallet: walletSnapshot,
    orders: [external],
    ownOrders: [],
    labels,
    configVersion: 1,
  });
  const fill = actions.find((action) => action.kind === 'fill-order');
  assert.ok(fill?.kind === 'fill-order');
  assert.equal(fill.exactAmount, '0.1');
  const bid = {
    ...external,
    order_id: 'own-bid',
    ask_currency: external.give_currency,
    give_currency: external.ask_currency,
    initially_asked: { atoms: '1000000' },
    ask_balance: { atoms: '1000000' },
    initially_given: { atoms: '100000000000' },
    give_balance: { atoms: '100000000000' },
  };
  assert.ok(
    !planServerActions({
      config,
      wallet: walletSnapshot,
      orders: [external],
      ownOrders: [bid],
      labels,
      configVersion: 1,
    }).some((action) => action.kind === 'fill-order' && action.side === 'buy'),
  );
});

test('a 20000-transaction journal restores with the SDK model and replays without state growth', async () => {
  const db = new BotDatabase(':memory:');
  const count = 20_000;
  db.atomic(() => {
    for (let i = 0; i < count; i++)
      db.putWalletTx('load', {
        txId: `load-${i}`,
        state: 'confirmed',
        tx: { id: `load-${i}`, inputs: i ? [input(`load-${i - 1}`)] : [], outputs: [output()] },
      });
  });
  const start = performance.now();
  const state = await WalletState.create({
    accountId: 'load',
    store: db.walletStore(),
    isMineOutput: (value: any) => value.destination === address,
  });
  const restoreMs = performance.now() - start;
  const replayStart = performance.now();
  for (let i = 0; i < 5; i++) await state.reload();
  console.log(
    JSON.stringify({
      journalTransactions: count,
      restoreMs: Math.round(restoreMs),
      averageReplayMs: Math.round((performance.now() - replayStart) / 5),
    }),
  );
  assert.equal(state.getSpendableUtxos().length, 1);
  assert.equal(db.transactions('load').length, count);
  db.close();
});

test('SIGKILL releases the database process lock without deleting a stale lock file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mm-crash-lock-'));
  const child = spawn(process.execPath, [join(__dirname, 'lock-child.cjs'), join(dir, 'bot.sqlite')], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await once(child.stdout!, 'data');
    assert.throws(() => new BotDatabase(join(dir, 'bot.sqlite')), /Another bot/);
    child.kill('SIGKILL');
    await once(child, 'exit');
    new BotDatabase(join(dir, 'bot.sqlite')).close();
  } finally {
    child.kill('SIGKILL');
    rmSync(dir, { recursive: true, force: true });
  }
});

test('bootstrap discovers a completely filled own order absent from the pair listing', async () => {
  const f = fixture();
  const client = await createClient(f.opts, f.api);
  const built = await client.buildCreateOrder(
    { conclude_destination: address, ask_token: token, ask_amount: '0.1', give_token: 'Coin', give_amount: '0.1' },
    { withUTXO: await f.api.getAccountUtxos([address]) },
  );
  const orderId = orderIdFromInputs(built.BINRepresentation!.inputs, 'testnet');
  const original = built.JSONRepresentation.outputs.find((item: any) => item.type === 'CreateOrder') as any;
  const raw = {
    ...built.JSONRepresentation,
    block_id: block,
    outputs: [
      {
        type: 'CreateOrder',
        conclude_key: address,
        ask_value: { type: 'TokenV1', token_id: token, amount: original.initially_asked },
        give_value: { type: 'Coin', amount: original.initially_given },
      },
    ],
  };
  f.observed.set(raw.id, raw);
  f.history.push(raw.id);
  f.lookupOrders.set(orderId, {
    ...original,
    order_id: orderId,
    nonce: 1,
    ask_balance: { atoms: '0', decimal: '0' },
    give_balance: { atoms: '0', decimal: '0' },
  });
  const db = new BotDatabase(':memory:');
  const runner = new BotRunner(db, f.api, f.opts, log);
  await runner.tick();
  assert.equal(runner.snapshot().stale, false);
  assert.equal(runner.snapshot().ownOrders[0]?.order_id, orderId);
  assert.ok(runner.snapshot().actions.some((action) => action.kind === 'conclude-order'));
  // A later confirmed conclusion must distinguish settlement from full fill.
  const conclusion = {
    id: 'e'.repeat(64),
    inputs: [
      { input: { input_type: 'AccountCommand', command: 'ConcludeOrder', order_id: orderId, nonce: 1 }, utxo: null },
    ],
    outputs: [],
    block_id: block,
  };
  f.observed.set(conclusion.id, conclusion);
  f.history.push(conclusion.id);
  f.orders.push(f.lookupOrders.get(orderId));
  await runner.tick();
  assert.equal(runner.snapshot().ownOrders.length, 0);
  await runner.tick();
  assert.equal(runner.snapshot().ownOrders.length, 0);
  await runner.close();
  db.close();
});

test('a same-height chain reorganization refreshes confirmed funding metadata', async () => {
  const f = fixture();
  const db = new BotDatabase(':memory:');
  const runner = new BotRunner(db, f.api, f.opts, log);
  await runner.tick();
  assert.equal(runner.snapshot().wallet?.availableUtxos[0].blockHash, block);
  f.reorg();
  await runner.tick();
  assert.equal(runner.snapshot().stale, false);
  assert.equal(runner.snapshot().wallet?.availableUtxos[0].blockHash, 'd'.repeat(64));
  assert.ok(db.events().some((event) => event.kind === 'reorg'));
  await runner.close();
  db.close();
});

test('fee limits reject before signing/submission and preview remains available', async () => {
  const db = new BotDatabase(':memory:');
  const state = await wallet(db);
  const mock = mockClient();
  const build = mock.client.buildTransfer.bind(mock.client);
  (mock.client as any).buildTransfer = async (...args: any[]) => {
    const tx = await (build as any)(...args);
    tx.JSONRepresentation.fee = { atoms: '100' };
    return tx;
  };
  const executor = new Executor(db, mock.client, state, 'bot', { maxTxFeeAtoms: '99' });
  const result = await executor.execute(request, options().config, state.getSpendableUtxos(), () => true, false);
  assert.equal(result?.record.status, 'rejected');
  assert.equal(mock.broadcasts.length, 0);
  const preview = await executor.execute(request, options().config, state.getSpendableUtxos(), () => false, true);
  assert.equal(preview?.record.status, 'signed');
  assert.equal(db.reservedResources().size, 0);
  db.close();
});

test('execution prefers a shallow funding branch over a larger deep change output', async () => {
  const f = fixture();
  const client = await createClient(f.opts, f.api);
  const db = new BotDatabase(':memory:');
  const state = await wallet(db);
  const shallow = state.getSpendableUtxos()[0];
  const deep = {
    ...shallow,
    txId: 'f'.repeat(64),
    outpoint: { ...shallow.outpoint, source_id: 'f'.repeat(64) },
    status: 'unconfirmed' as const,
    txState: 'mempool' as const,
    unconfirmedChainDepth: 10,
    utxo: output('20000000000000'),
  } as any;
  const attempt = await new Executor(db, client, state, 'bot').execute(
    request,
    f.opts.config,
    [deep, shallow],
    () => false,
    true,
  );
  assert.equal(attempt?.record.status, 'signed');
  assert.ok(attempt!.tx && inputResources(attempt!.tx).every((resource) => !resource.includes('f'.repeat(64))));
  db.close();
});

test('recovery releases intrinsically invalid bytes, but keeps ambiguous endpoint rejections reserved', async () => {
  const { BroadcastRejection } = await import('../server/chain');
  const db = new BotDatabase(':memory:');
  const state = await wallet(db);
  const mock = mockClient();
  mock.client.broadcastTx = async () => {
    throw new BroadcastRejection('POST disabled');
  };
  const executor = new Executor(db, mock.client, state, 'bot');
  const rejected = await executor.execute(request, options().config, state.getSpendableUtxos(), () => true, false);
  assert.equal(rejected?.record.status, 'rejected');
  assert.equal(db.reservedResources().size, 0);
  mock.client.broadcastTx = async () => {
    throw new Error('timeout');
  };
  const unknown = (await executor.execute(
    { ...request, idempotencyKey: 'second' },
    options().config,
    state.getSpendableUtxos(),
    () => true,
    false,
  ))!;
  mock.client.broadcastTx = async () => {
    throw new BroadcastRejection('POST disabled');
  };
  await executor.submit(unknown, () => true);
  assert.equal(db.getAttempt('second')?.record.status, 'unknown');
  assert.equal(db.reservedResources().size, 1);
  // Unlike a disabled endpoint, intrinsically invalid bytes can never have
  // been accepted during the earlier timeout.
  const api = new ChainApi(options(), async () => new Response(JSON.stringify({
    error: 'RPC error: Mempool error: Zero amount token transfers are not allowed (token id = abc)',
  }), { status: 500 }));
  mock.client.broadcastTx = async (hex: any) => api.broadcastTransaction(hex);
  await executor.submit(unknown, () => true);
  assert.equal(db.getAttempt('second')?.record.status, 'rejected');
  assert.equal(db.reservedResources().size, 0);
  db.close();
});

test('real Node WASM runs create → self-fill → conclude using newly persisted records', async () => {
  const f = fixture();
  f.opts.config.simulateOwnFills = true;
  const tokenOutput = {
    type: 'Transfer',
    destination: address,
    value: { type: 'TokenV1', token_id: token, amount: { atoms: '1000000', decimal: '1' } },
  };
  f.observed.get(funding).outputs.push(tokenOutput);
  let entries: any[] = [
    { outpoint: { source_type: 'Transaction', source_id: funding, index: 0 }, utxo: output() },
    { outpoint: { source_type: 'Transaction', source_id: funding, index: 1 }, utxo: tokenOutput },
  ];
  f.api.getAccountUtxos = async () => entries;
  const db = new BotDatabase(':memory:');
  const runner = new BotRunner(db, f.api, f.opts, log);
  runner.accept({ id: 'live', command: { kind: 'mode', mode: 'live' } });
  runner.accept({ id: 'start', command: { kind: 'start' } });
  await runner.tick();
  const creation = db.pendingAttempts()[0];
  assert.equal(creation?.request.kind, 'create-order');
  assert.equal(f.submissions.length, 1);
  const confirm = (attempt: Attempt) => {
    const raw = 'JSONRepresentation' in attempt.tx! ? attempt.tx.JSONRepresentation : attempt.tx!;
    f.observed.set(raw.id, { ...raw, block_id: block });
    const consumed = new Set(
      (raw.inputs as any[])
        .filter((entry) => entry.input?.input_type === 'UTXO')
        .map((entry) => `${entry.input.source_id}:${entry.input.index}`),
    );
    entries = entries.filter((entry) => !consumed.has(`${entry.outpoint.source_id}:${entry.outpoint.index}`));
    raw.outputs.forEach((utxo: any, index) => {
      if (utxo.type === 'Transfer')
        entries.push({ outpoint: { source_type: 'Transaction', source_id: raw.id, index }, utxo });
    });
  };
  confirm(creation);
  const own = { ...creation.createdOrder!, nonce: 0 };
  f.orders.push(own);
  await runner.tick();
  const fill = db.pendingAttempts()[0];
  assert.equal(fill?.request.kind, 'fill-order');
  assert.equal(f.submissions.length, 2);
  assert.equal(fill.request.kind === 'fill-order' && fill.request.amount, '0.05');
  assert.equal(
    fill.record.tradeMeta?.expectedQuoteAmount,
    Number(atomsToDecimal((BigInt(creation.createdOrder!.initially_given.atoms!) / 2n).toString(), 11)),
  );
  confirm(fill);
  own.ask_balance = { atoms: '50000', decimal: '0.05' };
  own.give_balance = { atoms: (BigInt(own.initially_given.atoms!) / 2n).toString() };
  own.nonce = 1;
  fill.record.createdAt -= 120_000;
  db.saveAttempt(fill);
  await runner.tick();
  const conclusion = db.pendingAttempts()[0];
  assert.equal(conclusion?.request.kind, 'conclude-order');
  assert.equal(f.submissions.length, 3);
  runner.accept({ id: 'dry', command: { kind: 'mode', mode: 'dry-run' } });
  await runner.tick();
  assert.equal(f.submissions.length, 3);
  assert.equal(runner.snapshot().control.executionMode, 'dry-run');
  await runner.close();
  db.close();
});

test('self-fills spend accepted WalletState change on different orders before a block, respecting pending limits', async () => {
  const f = fixture({ maxPending: 2, autoResume: true });
  f.opts.config.simulateOwnFills = true;
  for (const id of ['1', '2', '3']) f.orders.push({
    order_id: orderIdFromJson([input(id.repeat(64))], 'testnet', 100),
    nonce: 0,
    conclude_destination: address,
    ask_currency: { type: 'Coin' },
    give_currency: { type: 'TokenV1', token_id: token },
    initially_asked: { atoms: '1000000000', decimal: '0.01' },
    ask_balance: { atoms: '1000000000', decimal: '0.01' },
    initially_given: { atoms: '100000', decimal: '0.1' },
    give_balance: { atoms: '100000', decimal: '0.1' },
  });
  const db = new BotDatabase(':memory:');
  // The node has accepted these durable submissions, but no block is mined.
  f.api.mempool = async (id) => db.pendingAttempts().some(a => a.record.txId === id) ? 'accepted' : 'absent';
  const runner = new BotRunner(db, f.api, f.opts, log);
  runner.accept({ id: 'live', command: { kind: 'mode', mode: 'live' } });
  runner.accept({ id: 'start', command: { kind: 'start' } });
  await runner.tick();
  const first = db.pendingAttempts()[0];
  assert.equal(first.request.kind, 'fill-order');
  await runner.tick();
  const pending = db.pendingAttempts();
  assert.equal(f.submissions.length, 2);
  assert.equal(pending.length, 2);
  assert.ok(pending.every(a => a.record.status === 'broadcasted' && a.request.kind === 'fill-order'));
  assert.notEqual((pending[0].request as any).orderId, (pending[1].request as any).orderId);
  assert.ok((pending[1].tx as any).inputs.some((entry: any) => entry.input?.source_id === first.record.txId));
  assert.ok(runner.snapshot().wallet!.availableUtxos.some(u => u.unconfirmedChainDepth === 2));
  await runner.tick();
  assert.equal(f.submissions.length, 2);
  assert.equal(runner.snapshot().pauseReason, 'Pending transaction limit reached');
  await runner.close();
  const restored = new BotRunner(db, f.api, f.opts, log);
  await restored.tick();
  assert.equal(f.submissions.length, 2);
  assert.equal(restored.snapshot().control.running, true);
  assert.equal(restored.snapshot().pauseReason, 'Pending transaction limit reached');
  await restored.close();
  db.close();
});

test('temporary build failures recover after five retries instead of disabling an intent forever', async () => {
  const db = new BotDatabase(':memory:');
  const state = await wallet(db);
  const mock = mockClient();
  const build = mock.client.buildTransfer.bind(mock.client);
  let unavailable = true;
  mock.client.buildTransfer = async (...args) => {
    if (unavailable) throw new Error('Indexer 404: order not visible yet');
    return build(...args);
  };
  const executor = new Executor(db, mock.client, state, 'bot');
  for (let i = 0; i < 6; i++) {
    const attempt = (await executor.execute(request, options().config, state.getSpendableUtxos(), () => true, false))!;
    assert.equal(attempt.record.status, 'rejected');
    assert.equal(attempt.retries, i + 1);
    assert.ok(attempt.retryAt > Date.now());
    assert.equal(db.reservedResources().size, 0);
    attempt.retryAt = 0;
    db.saveAttempt(attempt);
  }
  unavailable = false;
  const recovered = await executor.execute(request, options().config, state.getSpendableUtxos(), () => true, false);
  assert.equal(recovered?.record.status, 'broadcasted');
  assert.equal(mock.broadcasts.length, 1);
  db.close();
});

test('an observed mempool creation can be self-filled before its indexer order endpoint exists', async () => {
  const f = fixture({ autoResume: true });
  f.opts.config.simulateOwnFills = true;
  f.opts.config.maxOrders = 1;
  const tokenOutput = {
    type: 'Transfer', destination: address,
    value: { type: 'TokenV1', token_id: token, amount: { atoms: '1000000', decimal: '1' } },
  };
  f.observed.get(funding).outputs.push(tokenOutput);
  f.api.getAccountUtxos = async () => [
    { outpoint: { source_type: 'Transaction', source_id: funding, index: 0 }, utxo: output() },
    { outpoint: { source_type: 'Transaction', source_id: funding, index: 1 }, utxo: tokenOutput },
  ] as any;
  const db = new BotDatabase(':memory:');
  f.api.mempool = async (id) => db.pendingAttempts().some(a => a.record.txId === id) ? 'accepted' : 'absent';
  const runner = new BotRunner(db, f.api, f.opts, log);
  runner.accept({ id: 'live', command: { kind: 'mode', mode: 'live' } });
  runner.accept({ id: 'start', command: { kind: 'start' } });
  await runner.tick();
  const creation = db.pendingAttempts()[0];
  assert.equal(creation.request.kind, 'create-order');
  const orderId = creation.createdOrder!.order_id;
  assert.equal(f.orders.length, 0);
  assert.equal(f.observed.has(creation.record.txId!), false);
  await runner.tick();
  const pending = db.pendingAttempts();
  assert.equal(f.submissions.length, 2);
  assert.equal(pending[1].request.kind, 'fill-order');
  assert.equal((pending[1].request as any).orderId, orderId);
  assert.ok((pending[1].tx as any).inputs.some((entry: any) => entry.input?.source_id === creation.record.txId));
  await runner.close();
  const restored = new BotRunner(db, f.api, f.opts, log);
  await restored.tick();
  assert.equal(f.submissions.length, 2);
  assert.equal((await f.api.getOrder(orderId)).order_id, orderId);
  // Local metadata stops being eligible as soon as acceptance is unobservable.
  f.api.mempool = async () => 'unavailable';
  await restored.tick();
  await assert.rejects(f.api.getOrder(orderId), /Indexer 404/);
  assert.equal(f.submissions.length, 2);
  await restored.close();
  db.close();
});

test('rebuilding an explicitly rejected create reopens its same-ID order placeholder', async () => {
  const { BroadcastRejection } = await import('../server/chain');
  const f = fixture();
  const original = f.api.broadcastTransaction.bind(f.api);
  let reject = true;
  f.api.broadcastTransaction = async (tx) => {
    if (reject) throw new BroadcastRejection('POST disabled');
    return original(tx);
  };
  const db = new BotDatabase(':memory:');
  const runner = new BotRunner(db, f.api, f.opts, log);
  runner.accept({ id: 'live', command: { kind: 'mode', mode: 'live' } });
  runner.accept({ id: 'start', command: { kind: 'start' } });
  await runner.tick();
  const rejected = db.listAttempts()[0];
  assert.equal(rejected.record.status, 'rejected');
  assert.equal(db.ownOrders().length, 0);
  rejected.retryAt = 0;
  db.saveAttempt(rejected);
  reject = false;
  await runner.tick();
  assert.equal(f.submissions.length, 1);
  assert.ok(db.ownOrders<any>().some((order) => order.order_id === rejected.createdOrder!.order_id));
  await runner.close();
  db.close();
});

test('market repricing invalidates an earlier preview even when wallet inputs are unchanged', () => {
  const f = options();
  const config = { ...f.config, enableFillTrading: false };
  const snapshot = {
    addresses: { receiving: [address], change: [] },
    availableUtxos: [{ txId: funding, outputIndex: 0, utxo: output() }],
  } as any;
  const labels = {
    Coin: { tokenId: 'Coin', ticker: 'TML', decimals: 11 },
    [token]: { tokenId: token, ticker: 'XYZ', decimals: 6 },
  };
  const order = {
    order_id: 'external',
    conclude_destination: 'other',
    ask_currency: { type: 'Coin' as const },
    give_currency: { type: 'Token' as const, token_id: token },
    initially_asked: { atoms: '100000000000' },
    ask_balance: { atoms: '100000000000' },
    initially_given: { atoms: '1000000' },
    give_balance: { atoms: '1000000' },
  };
  const plan = () =>
    planServerActions({ config, wallet: snapshot, orders: [order], ownOrders: [], labels, configVersion: 1 }).find(
      (action) => action.kind === 'create-order',
    )!;
  const first = plan();
  order.initially_asked.atoms = order.ask_balance.atoms = '200000000000';
  const second = plan();
  assert.notEqual(first.id, second.id);
});

test('large wallet bootstrap makes checkpointed progress without failure backoff', async () => {
  const f = fixture();
  for (let i = 1; i <= 201; i++) {
    const id = i.toString(16).padStart(64, '0');
    f.history.push(id);
    f.observed.set(id, { id, inputs: [], outputs: [], block_id: block });
  }
  const db = new BotDatabase(':memory:');
  const runner = new BotRunner(db, f.api, f.opts, log);
  await runner.tick();
  assert.equal(runner.snapshot().stale, true);
  assert.equal(runner.snapshot().runtime.error, null);
  assert.match(runner.snapshot().pauseReason!, /Bootstrapping/);
  await runner.tick();
  await runner.tick();
  assert.equal(runner.snapshot().stale, false);
  assert.ok(!db.events().some((event) => event.kind === 'cycle-failed'));
  await runner.close();
  db.close();
});

test('node RPC verifies chain identity and uses the documented submission options', async () => {
  const calls: any[] = [];
  const genesis = '1'.repeat(64);
  let pool = 'accepted';
  const api = new ChainApi(options({ rpcUrl: 'http://node.test' }), async (url, init) => {
    if (!init?.method) return new Response(JSON.stringify(genesis));
    const call = JSON.parse(String(init.body));
    calls.push(call);
    const result =
      call.method === 'chainstate_block_id_at_height'
        ? call.params[0] === 0
          ? genesis
          : block
        : call.method === 'chainstate_best_block_height'
          ? 100
          : call.method === 'mempool_contains_tx'
            ? pool === 'accepted'
            : call.method === 'mempool_contains_orphan_tx'
              ? pool === 'orphan'
              : null;
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }));
  });
  await api.verifyNode({ height: 100, blockHash: block });
  assert.equal(await api.mempool(funding), 'accepted');
  pool = 'orphan';
  assert.equal(await api.mempool(funding), 'orphan');
  pool = 'absent';
  assert.equal(await api.mempool(funding), 'absent');
  await api.broadcastTransaction('abcd');
  assert.deepEqual(calls.at(-1).params, ['abcd', { trust_policy: 'Untrusted' }]);
  await assert.rejects(api.verifyNode({ height: 100, blockHash: '2'.repeat(64) }), /different chains/);
});

test('a confirmed input conflict releases both parent and dependent reservations', async () => {
  const f = fixture();
  const db = new BotDatabase(':memory:');
  const runner = new BotRunner(db, f.api, f.opts, log);
  await runner.tick();
  const account = db.getSetting<string>('account')!;
  const state = await WalletState.create({
    accountId: account,
    store: db.walletStore(),
    isMineOutput: (value: any) => value.destination === address,
  });
  const parent = mockClient();
  await new Executor(db, parent.client, state, account).execute(
    request,
    f.opts.config,
    state.getSpendableUtxos(),
    () => true,
    false,
  );
  const child = mockClient();
  (child.client as any).buildTransfer = async () => ({
    JSONRepresentation: { id: 'd'.repeat(64), inputs: [input(parent.tx.id)], outputs: [output('8000000000000')] },
  });
  child.client.broadcastTx = async () => {
    throw new Error('response lost');
  };
  await new Executor(db, child.client, state, account).execute(
    { ...request, idempotencyKey: 'dependent' },
    f.opts.config,
    state.getSpendableUtxos({ allowUnconfirmed: true }),
    () => true,
    false,
  );
  assert.equal(db.reservedResources().size, 2);
  f.api.getAccountUtxos = async () => [];
  f.api.hasConfirmedInputConflict = async () => true;
  await runner.tick();
  assert.equal(db.getAttempt(request.idempotencyKey)?.record.status, 'conflicted');
  assert.equal(db.getAttempt('dependent')?.record.status, 'rejected');
  assert.equal(db.reservedResources().size, 0);
  assert.equal(runner.snapshot().wallet?.availableUtxos.length, 0);
  await runner.close();
  db.close();
});

test('outer quote levels are retained when the market has not moved', () => {
  const config = {
    ...options().config,
    spreadBps: 100,
    maxOrders: 20,
    inventoryTarget: 0,
    rebalanceThreshold: 0,
    enableFillTrading: false,
  };
  const snapshot = {
    addresses: { receiving: [address], change: [] },
    availableUtxos: [{ txId: funding, outputIndex: 0, utxo: output() }],
  } as any;
  const labels = {
    Coin: { tokenId: 'Coin', ticker: 'TML', decimals: 11 },
    [token]: { tokenId: token, ticker: 'XYZ', decimals: 6 },
  };
  const own = Array.from({ length: 10 }, (_, index) => ({
    order_id: `bid-${index}`,
    conclude_destination: address,
    ask_currency: { type: 'Token' as const, token_id: token },
    give_currency: { type: 'Coin' as const },
    initially_asked: { atoms: '100000' },
    ask_balance: { atoms: '100000' },
    initially_given: { atoms: ((10_000_000_000n * BigInt(10_000 - 50 * (index + 1))) / 10_000n).toString() },
    give_balance: { atoms: ((10_000_000_000n * BigInt(10_000 - 50 * (index + 1))) / 10_000n).toString() },
    nonce: 0,
  })).reverse();
  const actions = planServerActions({
    config,
    wallet: snapshot,
    orders: own,
    ownOrders: own,
    labels,
    configVersion: 1,
  });
  assert.ok(!actions.some((action) => action.kind === 'conclude-order'));
});
