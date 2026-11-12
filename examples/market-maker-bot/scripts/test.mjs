import { bundle, root } from './build.mjs';
import { spawnSync } from 'node:child_process';
await bundle({ tests: 'tests/server.test.ts', 'lock-child': 'tests/lock-child.ts' });
const result = spawnSync(process.execPath, ['--test', 'dist-server/tests.cjs'], { cwd: root, stdio: 'inherit' });
process.exitCode = result.status ?? 1;
