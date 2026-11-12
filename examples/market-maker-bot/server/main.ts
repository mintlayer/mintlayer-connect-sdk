import { loadServerOptions } from './config';
import { BotDatabase } from './database';
import { ChainApi } from './chain';
import { BotRunner } from './runtime';
import { createHttpServer } from './http';

async function main() {
  const options = loadServerOptions();
  const db = new BotDatabase(options.dbPath);
  const { app, attach } = createHttpServer(options);
  const runner = new BotRunner(db, new ChainApi(options), options, app.log);
  attach(runner);
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    app.log.info('Stopping bot server');
    await runner.close();
    await app.close();
    db.close();
  };
  process.on('SIGTERM', () => {
    void close().catch((error) => {
      app.log.error(error);
      process.exitCode = 1;
    });
  });
  process.on('SIGINT', () => {
    void close().catch((error) => {
      app.log.error(error);
      process.exitCode = 1;
    });
  });
  try {
    await app.listen({ host: options.host, port: options.port });
    runner.start();
  } catch (error) {
    await close();
    throw error;
  }
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Server failed');
  process.exitCode = 1;
});
