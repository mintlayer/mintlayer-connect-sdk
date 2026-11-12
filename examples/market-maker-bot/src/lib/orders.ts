import type { MarketMakerConfig, TokenRef } from './types';

export function buildPairSlug(baseToken: TokenRef, quoteToken: TokenRef, network = 'testnet'): string {
  const coin = network === 'mainnet' ? 'ML' : 'TML';
  return `${baseToken === 'Coin' ? coin : baseToken}_${quoteToken === 'Coin' ? coin : quoteToken}`;
}

export function getPairOrdersPath(config: MarketMakerConfig): string {
  return `/order/pair/${buildPairSlug(config.baseToken, config.quoteToken, config.network)}`;
}
