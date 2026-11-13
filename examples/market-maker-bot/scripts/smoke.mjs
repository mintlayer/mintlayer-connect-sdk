import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { root } from './build.mjs';

const dir = mkdtempSync(join(tmpdir(), 'market-maker-smoke-'));
const address = 'tmt1qx5p4r2en7c99mpmg2tz9hucxfarf4k6dyyvsahr';
const funding = 'b'.repeat(64),
  block = 'a'.repeat(64);
const token = 'tmltk1jzgup986mh3x9n5024svm4wtuf2qp5vedlgy5632wah0pjffwhpqgsvmuq';
const coin = {
  type: 'Transfer',
  destination: address,
  value: { type: 'Coin', amount: { atoms: '10000000000000', decimal: '100' } },
};
const indexer = createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  let body;
  if (path === '/chain/tip') body = { block_height: 100, block_id: block };
  else if (path === '/chain/100') body = block;
  else if (path.startsWith('/block/')) body = { height: 100 };
  else if (path.startsWith('/token/')) body = { number_of_decimals: 6, token_ticker: { string: 'XYZ' } };
  else if (path.endsWith('/book')) body = { items: [], next_cursor: null };
  else if (path.startsWith('/order/pair/')) body = [];
  else if (path.endsWith('/spendable-utxos'))
    body = path.includes(address)
      ? [{ outpoint: { source_type: 'Transaction', source_id: funding, index: 0 }, utxo: coin }]
      : [];
  else if (path.startsWith('/address/')) body = { transaction_history: path.includes(address) ? [funding] : [] };
  else if (path === `/transaction/${funding}`) body = { id: funding, block_id: block, inputs: [], outputs: [coin] };
  else {
    response.writeHead(404);
    response.end('{}');
    return;
  }
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
});
await new Promise((resolve) => indexer.listen(0, '127.0.0.1', resolve));
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith('BOT_') && !key.startsWith('VITE_')),
);
Object.assign(env, {
  BOT_API_URL: `http://127.0.0.1:${indexer.address().port}`,
  BOT_WALLET_SEED: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  BOT_BASE_TOKEN: token,
  BOT_QUOTE_TOKEN: 'Coin',
  BOT_PAIR: 'XYZ/TML',
  BOT_NETWORK: 'testnet',
  BOT_ORDER_SIZE: '0.1',
  BOT_MAX_POSITION: '10',
  BOT_HOST: '127.0.0.1',
  BOT_PORT: '0',
  BOT_DB_PATH: join(dir, 'bot.sqlite'),
  BOT_ADMIN_PASSWORD: 'smoke-test-password',
});
const child = spawn(process.execPath, [join(root, 'dist-server/main.cjs')], {
  cwd: dir,
  env,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
child.stdout.on('data', (data) => {
  output += data;
});
child.stderr.on('data', (data) => {
  output += data;
});
let stopping = false;
async function close() {
  if (stopping) return;
  stopping = true;
  if (child.exitCode === null) {
    child.kill('SIGTERM');
    await once(child, 'exit');
  }
  await new Promise((resolve) => indexer.close(resolve));
  rmSync(dir, { recursive: true, force: true });
}
process.on('SIGTERM', () => void close());
process.on('SIGINT', () => void close());
try {
  let url;
  for (let i = 0; i < 100; i++) {
    url = /Server listening at (http:\/\/127\.0\.0\.1:\d+)/.exec(output)?.[1];
    if (url) break;
    if (child.exitCode !== null) throw new Error(output);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(url, 'server started');
  assert.equal((await fetch(`${url}/health/live`)).status, 200);
  assert.equal((await fetch(`${url}/api/state`)).status, 401);
  const login = await fetch(`${url}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Bot-Request': '1' },
    body: JSON.stringify({ password: 'smoke-test-password' }),
  });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const headers = { Cookie: cookie, 'Content-Type': 'application/json', 'X-Bot-Request': '1' };
  for (let i = 0; i < 100 && (await fetch(`${url}/health/ready`)).status !== 200; i++)
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal((await fetch(`${url}/health/ready`)).status, 200);
  assert.match(await (await fetch(url)).text(), /id="root"/);
  for (const file of readdirSync(join(root, 'dist/assets')))
    if (file.endsWith('.js')) {
      const js = readFileSync(join(root, 'dist/assets', file), 'utf8');
      assert.ok(
        !js.includes('__NO_SECRET_IN_UI__') && !js.includes('MnemonicAccountProvider'),
        'frontend has no wallet runtime or injected secrets',
      );
    }
  async function command(id, command) {
    const response = await fetch(`${url}/api/commands`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id, command }),
    });
    assert.equal(response.status, 202);
    for (let i = 0; i < 100; i++) {
      const result = await (await fetch(`${url}/api/commands/${id}`, { headers })).json();
      if (result.status === 'applied') return;
      assert.notEqual(result.status, 'failed', result.error);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('Command did not complete');
  }
  await command('start', { kind: 'start' });
  let state;
  for (let i = 0; i < 100; i++) {
    state = await (await fetch(`${url}/api/state`, { headers })).json();
    if (state.records.length) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(state.control.running, true);
  assert.equal(state.records[0].status, 'signed');
  await command('stop', { kind: 'stop' });
  assert.equal((await (await fetch(`${url}/api/state`, { headers })).json()).control.running, false);
  console.log('Production HTTP, auth, static UI, dry-run execution, Stop and frontend artifact checks passed.');
  if (process.argv.includes('--serve')) {
    console.log(`PREVIEW_URL=${url}`);
    console.log('Preview password: smoke-test-password (isolated fake chain, no external requests).');
    await once(child, 'exit');
  }
} finally {
  await close();
}
