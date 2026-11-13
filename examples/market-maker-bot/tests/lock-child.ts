import { BotDatabase } from '../server/database';
const db = new BotDatabase(process.argv[2]);
process.stdout.write('locked\n');
setInterval(() => {
  void db;
}, 1000);
