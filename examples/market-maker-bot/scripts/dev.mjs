import { bundle, root } from './build.mjs';
import { spawn } from 'node:child_process';
await bundle({ main: 'server/main.ts', backup: 'server/backup.ts' });
const children = [
  spawn(process.execPath, ['dist-server/main.cjs'], { cwd: root, stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { cwd: root, stdio: 'inherit' }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
for (const child of children) child.on('exit', (code) => stop(code ?? 1));
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
