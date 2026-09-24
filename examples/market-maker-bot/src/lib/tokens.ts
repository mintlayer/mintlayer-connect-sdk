import { resolveApiBaseUrl } from './client';
import type { BranchInfo, MarketMakerConfig, TokenRef, WalletSnapshot } from './types';

export type TokenMetadata = {
  tokenId: string;
  ticker: string;
  decimals: number;
};

export type TokenLabelMap = Record<string, TokenMetadata>;

const COIN_METADATA: TokenMetadata = {
  tokenId: 'Coin',
  ticker: 'ML',
  decimals: 11,
};

function requestHeaders(config: MarketMakerConfig): HeadersInit {
  if (!config.apiKey) {
    return {};
  }

  return {
    Authorization: `Bearer ${config.apiKey}`,
    'X-API-Key': config.apiKey,
  };
}

export async function fetchTokenMetadata(
  config: MarketMakerConfig,
  tokenId: string,
): Promise<TokenMetadata | null> {
  if (tokenId === 'Coin') {
    return COIN_METADATA;
  }

  try {
    const response = await fetch(`${resolveApiBaseUrl(config)}/token/${tokenId}`, {
      headers: requestHeaders(config),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      token_ticker?: { string?: string };
      number_of_decimals?: number;
    };

    return {
      tokenId,
      ticker: data.token_ticker?.string?.trim() || shortenTokenId(tokenId),
      decimals: data.number_of_decimals ?? 0,
    };
  } catch {
    return null;
  }
}

export async function loadTokenLabels(
  config: MarketMakerConfig,
  tokenIds: Iterable<string>,
): Promise<TokenLabelMap> {
  const labels: TokenLabelMap = { Coin: COIN_METADATA };
  const uniqueIds = [...new Set([...tokenIds].filter((tokenId) => tokenId && tokenId !== 'Coin'))];

  await Promise.all(
    uniqueIds.map(async (tokenId) => {
      const metadata = await fetchTokenMetadata(config, tokenId);
      if (metadata) {
        labels[tokenId] = metadata;
      }
    }),
  );

  return labels;
}

export function mergeTokenLabels(current: TokenLabelMap, next: TokenLabelMap): TokenLabelMap {
  return { ...current, ...next };
}

export function shortenTokenId(tokenId: string): string {
  if (tokenId.length <= 16) {
    return tokenId;
  }

  return `${tokenId.slice(0, 6)}...${tokenId.slice(-4)}`;
}

export function formatTokenLabel(token: TokenRef, labels: TokenLabelMap): string {
  if (token === 'Coin') {
    return labels.Coin?.ticker ?? 'ML';
  }

  return labels[token]?.ticker ?? shortenTokenId(token);
}

export function formatPairLabel(config: MarketMakerConfig, labels: TokenLabelMap): string {
  if (config.pair && !config.pair.includes('tmltk')) {
    return config.pair;
  }

  return `${formatTokenLabel(config.baseToken, labels)}/${formatTokenLabel(config.quoteToken, labels)}`;
}

export function collectTokenIds(args: {
  config: MarketMakerConfig;
  wallet: WalletSnapshot | null;
  branches: BranchInfo[];
}): string[] {
  const ids = new Set<string>([args.config.baseToken, args.config.quoteToken]);

  Object.keys(args.wallet?.sdkBalances?.token ?? {}).forEach((tokenId) => ids.add(tokenId));
  args.branches.forEach((branch) => ids.add(branch.asset));

  return [...ids];
}
