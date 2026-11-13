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
