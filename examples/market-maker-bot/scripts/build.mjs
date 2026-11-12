import { build } from 'esbuild';
import { cp, mkdir, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function bundle(entries, extra = {}) {
  await mkdir(resolve(root, 'dist-server/wasm-node'), { recursive: true });
  const wasmDir = process.env.BOT_NODE_WASM_DIR || resolve(root, '../../packages/sdk/tests/__mocks__/pkg-node');
  const manifest = JSON.parse(await readFile(resolve(wasmDir, 'package.json'), 'utf8'));
  if (manifest.type === 'module') throw new Error('BOT_NODE_WASM_DIR must contain the CommonJS Node.js WASM build');
  for (const file of ['package.json', 'wasm_wrappers.js', 'wasm_wrappers_bg.wasm']) {
    await cp(resolve(wasmDir, file), resolve(root, 'dist-server/wasm-node', file));
  }
  await build({
    absWorkingDir: root,
    entryPoints: entries,
    outdir: 'dist-server',
    outExtension: { '.js': '.cjs' },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    sourcemap: true,
    packages: 'external',
    plugins: [
      {
        name: 'workspace-sdk',
        setup(builder) {
          builder.onResolve({ filter: /^@mintlayer\/sdk$/ }, () => ({
            path: resolve(root, '../../packages/sdk/src/mintlayer-connect-sdk.ts'),
          }));
          builder.onResolve({ filter: /^@mintlayer\/wasm-lib$/ }, () => ({
            path: resolve(root, 'server/wasm-node.cjs'),
          }));
        },
      },
    ],
    ...extra,
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await bundle({ main: 'server/main.ts', backup: 'server/backup.ts' });
}
