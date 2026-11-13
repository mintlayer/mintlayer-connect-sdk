import type { MarketMakerConfig } from './types';

export const DEFAULT_CONFIG: MarketMakerConfig = {
  network: 'testnet',
  pair: 'HUG/ML',
  baseToken: 'HUG',
  quoteToken: 'Coin',
  orderSize: 0.01,
  referencePrice: 1,
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
  simulateOwnFills: false,
  simulationTradeTimeoutMs: 60_000,
};

export function validateConfig(config: MarketMakerConfig): string[] {
  const warnings: string[] = [];

  if (config.network === 'mainnet' && !config.allowMainnetBroadcast) {
    warnings.push(
      'Mainnet broadcasting is blocked by default. Set BOT_ALLOW_MAINNET_BROADCAST=true only after review.',
    );
  }

  if (config.spreadBps <= 0) {
    warnings.push('Spread must be positive.');
  }

  if (config.orderSize <= 0) {
    warnings.push('Order size must be positive.');
  }

  if (config.referencePrice <= 0) {
    warnings.push('Reference price must be positive.');
  }

  if (config.simulationTradeTimeoutMs < 5_000) {
    warnings.push('Liquidity simulation timeout must be at least 5 seconds.');
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
    | 'referencePrice'
    | 'spreadBps'
    | 'inventoryTarget'
    | 'rebalanceThreshold'
    | 'maxPosition'
    | 'maxOrders'
    | 'pollIntervalMs'
    | 'maxUnconfirmedBranchDepth'
    | 'simulationTradeTimeoutMs'
  >,
  value: string,
): MarketMakerConfig {
  const next = Number(value);
  if (!Number.isFinite(next)) {
    return config;
  }

  return { ...config, [key]: next };
}
