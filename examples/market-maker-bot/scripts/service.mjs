import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, renameSync, statSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const logPath = resolve(root, 'data/runtime.log');
mkdirSync(dirname(logPath), { recursive: true, mode: 0o700 });
const limit = 10 * 1024 * 1024;
let size = statSync(logPath, { throwIfNoEntry: false })?.size ?? 0;
let child, timer, closing = false, failures = 0;
function log(chunk) {
  if (size + chunk.length > limit) {
    rmSync(`${logPath}.3`, { force: true });
    for (let i = 2; i >= 0; i--) {
      const from = i ? `${logPath}.${i}` : logPath;
      if (statSync(from, { throwIfNoEntry: false })) renameSync(from, `${logPath}.${i + 1}`);
    }
    size = 0;
  }
  appendFileSync(logPath, chunk, { mode: 0o600 });
  size += chunk.length;
}
function record(message, fields = {}) {
  log(Buffer.from(JSON.stringify({ time: Date.now(), supervisor: true, message, ...fields }) + '\n'));
}
function launch() {
  const started = Date.now();
  child = spawn(process.execPath, ['dist-server/main.cjs'], {
    cwd: root,
    // Resume only the persisted running flag. A UI Stop survives restarts.
    env: { ...process.env, BOT_AUTO_RESUME: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  record('Server started', { pid: child.pid });
  child.stdout.on('data', log);
  child.stderr.on('data', log);
  child.on('error', (error) => record('Server spawn failed', { error: error.message }));
  child.on('close', (code, signal) => {
    if (closing) return;
    failures = Date.now() - started > 60_000 ? 0 : failures + 1;
    const delay = Math.min(60_000, 1000 * 2 ** Math.min(failures, 6));
    record('Server exited; restarting', { code, signal, delay });
    timer = setTimeout(launch, delay);
  });
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  closing = true;
  clearTimeout(timer);
  child?.kill('SIGTERM');
});
launch();
