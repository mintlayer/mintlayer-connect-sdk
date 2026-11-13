import type { MarketMakerConfig, StrategyAction, TokenRef, WalletSnapshot } from './types';
import type { TokenLabelMap } from './tokens';
import { formatTokenLabel } from './tokens';

export function getTokenBalance(snapshot: WalletSnapshot | null, token: string): number {
  if (!snapshot?.sdkBalances) {
    return 0;
  }

  if (token === 'Coin') {
    return snapshot.sdkBalances.coin;
  }

  return snapshot.sdkBalances.token[token] ?? 0;
}

export function calculateInventory(
  snapshot: WalletSnapshot | null,
  config: MarketMakerConfig,
  midPrice: number | null,
) {
  const baseBalance = getTokenBalance(snapshot, config.baseToken);
  const quoteBalance = getTokenBalance(snapshot, config.quoteToken);
  const quoteValue = quoteBalance;
  const baseValue = midPrice ? baseBalance * midPrice : baseBalance;
  const totalValue = quoteValue + baseValue;
  const baseShare = totalValue > 0 ? baseValue / totalValue : 0;

  return {
    baseBalance,
    quoteBalance,
    baseValue,
    quoteValue,
    totalValue,
    baseShare,
    drift: baseShare - config.inventoryTarget,
  };
}

export function actionToText(action: StrategyAction, labels: TokenLabelMap): string {
  const fmt = (token: TokenRef) => formatTokenLabel(token, labels);

  if (action.kind === 'conclude-order') {
    return `Conclude stale order ${action.orderId}`;
  }

  if (action.kind === 'fill-order') {
    return `${action.side.toUpperCase()} fill ${action.amount.toFixed(8)} on ${action.orderId.slice(0, 12)}... @ ${action.price.toFixed(8)}`;
  }

  return `${action.side.toUpperCase()} ${Number(action.args.give_amount).toFixed(8)} ${fmt(action.args.give_token)} for ${Number(action.args.ask_amount).toFixed(8)} ${fmt(action.args.ask_token)}`;
}
