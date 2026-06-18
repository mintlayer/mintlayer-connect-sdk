import type { MarketMakerConfig, NetworkName } from './types';

const DEFAULT_CONFIG: MarketMakerConfig = {
  network: 'testnet',
  pair: 'HUG/ML',
  baseToken: 'HUG',
  quoteToken: 'Coin',
  orderSize: 0.01,
  spreadBps: 20,
  inventoryTarget: 0.5,
  rebalanceThreshold: 0.1,
  maxPosition: 1,
  maxOrders: 10,
  pollIntervalMs: 15_000,
  maxUnconfirmedBranchDepth: 24,
  allowMainnetBroadcast: false,
  enableFillTrading: true,
  allowSelfFills: false,
};

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberFromEnv(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanFromEnv(value: unknown, fallback: boolean): boolean {
  if (typeof value !== 'string') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function networkFromEnv(value: unknown): NetworkName {
  return value === 'mainnet' ? 'mainnet' : 'testnet';
}

export function loadConfigFromEnv(env: ImportMetaEnv = import.meta.env): MarketMakerConfig {
  return {
    network: networkFromEnv(env.VITE_NETWORK),
    apiUrl: optionalString(env.VITE_API_URL),
    apiKey: optionalString(env.VITE_API_KEY),
    walletSeed: optionalString(env.VITE_WALLET_SEED),
    pair: optionalString(env.VITE_PAIR) ?? DEFAULT_CONFIG.pair,
    baseToken: optionalString(env.VITE_BASE_TOKEN) ?? DEFAULT_CONFIG.baseToken,
    quoteToken: optionalString(env.VITE_QUOTE_TOKEN) ?? DEFAULT_CONFIG.quoteToken,
    orderSize: numberFromEnv(env.VITE_ORDER_SIZE, DEFAULT_CONFIG.orderSize),
    spreadBps: numberFromEnv(env.VITE_SPREAD_BPS, DEFAULT_CONFIG.spreadBps),
    inventoryTarget: numberFromEnv(env.VITE_INVENTORY_TARGET, DEFAULT_CONFIG.inventoryTarget),
    rebalanceThreshold: numberFromEnv(env.VITE_REBALANCE_THRESHOLD, DEFAULT_CONFIG.rebalanceThreshold),
    maxPosition: numberFromEnv(env.VITE_MAX_POSITION, DEFAULT_CONFIG.maxPosition),
    maxOrders: Math.max(1, Math.floor(numberFromEnv(env.VITE_MAX_ORDERS, DEFAULT_CONFIG.maxOrders))),
    pollIntervalMs: Math.max(5_000, Math.floor(numberFromEnv(env.VITE_POLL_INTERVAL_MS, DEFAULT_CONFIG.pollIntervalMs))),
    maxUnconfirmedBranchDepth: Math.min(
      29,
      Math.max(1, Math.floor(numberFromEnv(env.VITE_MAX_UNCONFIRMED_BRANCH_DEPTH, DEFAULT_CONFIG.maxUnconfirmedBranchDepth))),
    ),
    allowMainnetBroadcast: booleanFromEnv(env.VITE_ALLOW_MAINNET_BROADCAST, DEFAULT_CONFIG.allowMainnetBroadcast),
    enableFillTrading: booleanFromEnv(env.VITE_ENABLE_FILL_TRADING, DEFAULT_CONFIG.enableFillTrading),
    allowSelfFills: booleanFromEnv(env.VITE_ALLOW_SELF_FILLS, DEFAULT_CONFIG.allowSelfFills),
  };
}

export function validateConfig(config: MarketMakerConfig): string[] {
  const warnings: string[] = [];

  if (!config.walletSeed) {
    warnings.push('VITE_WALLET_SEED is missing. The app can render, but SDK initialization will fail.');
  }

  if (config.network === 'mainnet' && !config.allowMainnetBroadcast) {
    warnings.push('Mainnet broadcasting is blocked by default. Set VITE_ALLOW_MAINNET_BROADCAST=true only after review.');
  }

  if (config.spreadBps <= 0) {
    warnings.push('Spread must be positive.');
  }

  if (config.orderSize <= 0) {
    warnings.push('Order size must be positive.');
  }

  if (config.inventoryTarget < 0 || config.inventoryTarget > 1) {
    warnings.push('Inventory target should be between 0 and 1.');
  }

  return warnings;
}

export function updateConfigNumber(
  config: MarketMakerConfig,
  key: keyof Pick<
    MarketMakerConfig,
    | 'orderSize'
    | 'spreadBps'
    | 'inventoryTarget'
    | 'rebalanceThreshold'
    | 'maxPosition'
    | 'maxOrders'
    | 'pollIntervalMs'
    | 'maxUnconfirmedBranchDepth'
  >,
  value: string,
): MarketMakerConfig {
  const next = Number(value);
  if (!Number.isFinite(next)) {
    return config;
  }

  return { ...config, [key]: next };
}
