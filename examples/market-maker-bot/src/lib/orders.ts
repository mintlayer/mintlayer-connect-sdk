import { resolveApiBaseUrl } from './client';
import type { MarketMakerConfig, MarketOrder, TokenRef } from './types';

function requestHeaders(config: MarketMakerConfig): HeadersInit {
  if (!config.apiKey) {
    return {};
  }

  return {
    Authorization: `Bearer ${config.apiKey}`,
    'X-API-Key': config.apiKey,
  };
}

/**
 * Mintlayer pair slug for token/ML markets, e.g.
 * `/order/pair/tmltk1..._TML`
 */
export function buildPairSlug(baseToken: TokenRef, quoteToken: TokenRef): string | null {
  if (baseToken !== 'Coin' && quoteToken === 'Coin') {
    return `${baseToken}_TML`;
  }

  if (baseToken === 'Coin' && quoteToken !== 'Coin') {
    return `${quoteToken}_TML`;
  }

  return null;
}

export function getPairOrdersPath(config: MarketMakerConfig): string | null {
  const slug = buildPairSlug(config.baseToken, config.quoteToken);
  return slug ? `/order/pair/${slug}` : null;
}

export async function fetchPairOrders(config: MarketMakerConfig): Promise<MarketOrder[]> {
  const pairPath = getPairOrdersPath(config);
  if (!pairPath) {
    return [];
  }

  const response = await fetch(`${resolveApiBaseUrl(config)}${pairPath}`, {
    headers: requestHeaders(config),
  });

  if (!response.ok) {
    throw new Error(`Pair order fetch failed (${response.status}): ${pairPath}`);
  }

  return (await response.json()) as MarketOrder[];
}
