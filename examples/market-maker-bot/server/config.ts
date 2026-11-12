import { config as dotenv } from 'dotenv';
import { resolve } from 'node:path';
import { DEFAULT_CONFIG, validateConfig } from '../src/lib/config';
import type { MarketMakerConfig } from '../src/lib/types';

export type ServerOptions = {
  config: MarketMakerConfig;
  walletSeed?: string;
  apiUrl: string;
  apiKey?: string;
  rpcUrl?: string;
  rpcUser?: string;
  rpcPassword?: string;
  dbPath: string;
  host: string;
  port: number;
  adminPassword?: string;
  requestTimeoutMs: number;
  staleAfterMs: number;
  autoResume: boolean;
  maxPending: number;
  eventRetentionDays: number;
  dailyFeeLimitAtoms?: string;
  maxTxFeeAtoms?: string;
};
export function validateTradingConfig(raw: unknown, network?: string): MarketMakerConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Config must be an object');
  const source = raw as Record<string, unknown>;
  const config = { ...DEFAULT_CONFIG };
  for (const key of Object.keys(DEFAULT_CONFIG) as (keyof MarketMakerConfig)[]) {
    if (!(key in source)) throw new Error(`Missing config field: ${key}`);
    const value = source[key];
    if (typeof value !== typeof DEFAULT_CONFIG[key]) throw new Error(`Invalid config field: ${key}`);
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`Invalid config field: ${key}`);
    (config as any)[key] = value;
  }
  if (!['mainnet', 'testnet'].includes(config.network) || (network && config.network !== network))
    throw new Error('Network cannot be changed on an existing runtime');
  if (!config.baseToken || !config.quoteToken || config.baseToken === config.quoteToken || !config.pair)
    throw new Error('Select two different assets');
  for (const key of ['baseToken', 'quoteToken'] as const) {
    if (!/^[a-zA-Z0-9]+$/.test(config[key])) throw new Error(`Invalid ${key}`);
  }
  if (
    config.spreadBps <= 0 ||
    config.spreadBps >= 10_000 ||
    config.orderSize <= 0 ||
    config.referencePrice <= 0 ||
    config.maxPosition <= 0
  )
    throw new Error('Price, size, position and spread must be positive; spread must be below 10000 bps');
  if (
    config.inventoryTarget < 0 ||
    config.inventoryTarget > 1 ||
    config.rebalanceThreshold < 0 ||
    config.rebalanceThreshold > 1
  )
    throw new Error('Inventory target and threshold must be between 0 and 1');
  if (!Number.isInteger(config.maxOrders) || config.maxOrders < 1 || config.maxOrders > 100)
    throw new Error('Max orders must be between 1 and 100');
  if (
    !Number.isInteger(config.maxUnconfirmedBranchDepth) ||
    config.maxUnconfirmedBranchDepth < 1 ||
    config.maxUnconfirmedBranchDepth > 29
  )
    throw new Error('Depth must be between 1 and 29');
  if (config.pollIntervalMs < 5000 || config.pollIntervalMs > 3_600_000 || config.simulationTradeTimeoutMs < 5000)
    throw new Error('Invalid cycle or simulation interval');
  if (config.network === 'mainnet' && config.simulateOwnFills) throw new Error('Self-fill simulation is testnet only');
  if (config.network === 'mainnet' && config.allowSelfFills) throw new Error('Self-fills are testnet only');
  return config;
}
export function loadServerOptions(env: NodeJS.ProcessEnv = process.env): ServerOptions {
  dotenv({ quiet: true });
  // Legacy VITE settings are read ONLY here, allowing existing testnet setups
  // to migrate. Vite's envPrefix is PUBLIC_, so they cannot enter the UI bundle.
  const read = (key: string) => env[`BOT_${key}`] ?? env[`VITE_${key}`];
  const config: Record<string, unknown> = { ...DEFAULT_CONFIG };
  for (const [key, fallback] of Object.entries(DEFAULT_CONFIG)) {
    const name = key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase();
    const value = read(name);
    if (value !== undefined && value !== '')
      config[key] =
        typeof fallback === 'number'
          ? Number(value)
          : typeof fallback === 'boolean'
            ? /^(true|1|yes)$/i.test(value)
            : value;
  }
  const trading = validateTradingConfig(config);
  const port = Number(env.BOT_PORT ?? 3001);
  const host = env.BOT_HOST ?? '127.0.0.1';
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid BOT_PORT');
  if (!['127.0.0.1', 'localhost', '::1'].includes(host) && !env.BOT_ADMIN_PASSWORD)
    throw new Error('BOT_ADMIN_PASSWORD is required when listening beyond localhost');
  const positive = (key: string, fallback: number) => {
    const n = Number(env[key] ?? fallback);
    if (!Number.isInteger(n) || n <= 0) throw new Error(`Invalid ${key}`);
    return n;
  };
  return {
    config: trading,
    walletSeed: read('WALLET_SEED'),
    apiKey: read('API_KEY'),
    apiUrl: (
      read('API_URL') ||
      (trading.network === 'testnet'
        ? 'https://api-server-lovelace.mintlayer.org/api/v2'
        : 'https://api-server.mintlayer.org/api/v2')
    ).replace(/\/$/, ''),
    rpcUrl: env.BOT_RPC_URL,
    rpcUser: env.BOT_RPC_USER,
    rpcPassword: env.BOT_RPC_PASSWORD,
    dbPath: resolve(env.BOT_DB_PATH ?? 'data/bot.sqlite'),
    host,
    port,
    adminPassword: env.BOT_ADMIN_PASSWORD,
    requestTimeoutMs: positive('BOT_REQUEST_TIMEOUT_MS', 10_000),
    staleAfterMs: positive('BOT_STALE_AFTER_MS', 60_000),
    autoResume: env.BOT_AUTO_RESUME === 'true',
    maxPending: positive('BOT_MAX_PENDING', 24),
    eventRetentionDays: positive('BOT_EVENT_RETENTION_DAYS', 14),
    dailyFeeLimitAtoms: decimalLimit(env.BOT_DAILY_FEE_LIMIT ?? '100'),
    maxTxFeeAtoms: decimalLimit(env.BOT_MAX_TX_FEE ?? '2'),
  };
}
function decimalLimit(value: string): string {
  if (!/^\d+(\.\d{1,11})?$/.test(value))
    throw new Error('Fee limits must be positive decimal coin amounts with at most 11 decimal places');
  const [whole, fraction = ''] = value.split('.');
  const amount = BigInt(whole) * 100_000_000_000n + BigInt(fraction.padEnd(11, '0'));
  if (amount <= 0n) throw new Error('Fee limit must be positive');
  return amount.toString();
}
export { validateConfig };
