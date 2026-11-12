import Database from 'better-sqlite3';
import { loadServerOptions } from './config';
import { resolve } from 'node:path';
import { chmodSync } from 'node:fs';
async function main() {
  const options = loadServerOptions();
  const target = process.argv[2];
  if (!target || resolve(target) === options.dbPath) throw new Error('Usage: pnpm backup /path/to/new-backup.sqlite');
  const db = new Database(options.dbPath, { readonly: true, fileMustExist: true });
  try {
    await db.backup(resolve(target));
    chmodSync(resolve(target), 0o600);
    console.log('Backup complete');
  } finally {
    db.close();
  }
}
void main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
