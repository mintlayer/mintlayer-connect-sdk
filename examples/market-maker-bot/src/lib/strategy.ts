import type {
  BookLevel,
  MarketMakerConfig,
  MarketOrder,
  StrategyAction,
  SyntheticBook,
  TokenRef,
  WalletSnapshot,
} from './types';
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

function stableId(parts: Array<string | number | null>): string {
  return parts.map((part) => String(part ?? 'none')).join(':');
}

export function calculateInventory(snapshot: WalletSnapshot | null, config: MarketMakerConfig, midPrice: number | null) {
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

export function planStrategyActions(args: {
  config: MarketMakerConfig;
  book: SyntheticBook;
  ownOrders: MarketOrder[];
  wallet: WalletSnapshot | null;
  quoteLevelOffset?: number;
}): StrategyAction[] {
  const { config, book, ownOrders, wallet, quoteLevelOffset = 0 } = args;
  const actions: StrategyAction[] = [];
  const addresses = wallet?.addresses;
  const concludeDestination = addresses?.receiving[0];

  if (!concludeDestination || !book.midPrice) {
    return actions;
  }

  const inventory = calculateInventory(wallet, config, book.midPrice);
  const halfSpread = config.spreadBps / 20_000;
  const inventorySkew = Math.max(-0.5, Math.min(0.5, inventory.drift));
  const bidPrice = book.midPrice * (1 - halfSpread - inventorySkew * config.rebalanceThreshold);
  const askPrice = book.midPrice * (1 + halfSpread - inventorySkew * config.rebalanceThreshold);
  const activeBudget = Math.max(0, config.maxOrders - ownOrders.length);
  // Keep several price levels queued for each side. Apart from providing a
  // more useful market-making ladder, this means applying one proposal still
  // leaves other independent proposals ready to review and execute.
  const quoteLevels = 3;

  if (ownOrders.length > config.maxOrders) {
    for (const order of ownOrders.slice(config.maxOrders)) {
      actions.push({
        id: stableId(['conclude', order.order_id]),
        kind: 'conclude-order',
        orderId: order.order_id,
        reason: `Own order count exceeds MAX_ORDERS=${config.maxOrders}.`,
      });
    }
  }

  if (activeBudget <= 0) {
    return actions;
  }

  for (let level = 0; level < quoteLevels; level += 1) {
    // Each extra level is one half-spread farther from the top quote.
    const quoteLevel = quoteLevelOffset + level;
    const levelOffset = quoteLevel * halfSpread;

    if (inventory.baseBalance < config.maxPosition) {
      const levelBidPrice = bidPrice * (1 - levelOffset);
      if (inventory.quoteBalance > config.orderSize * levelBidPrice) {
        actions.push({
          id: stableId(['bid', config.pair, quoteLevel + 1, levelBidPrice.toFixed(8), config.orderSize]),
          kind: 'create-order',
          side: 'bid',
          price: levelBidPrice,
          reason: `Bid level ${quoteLevel + 1}: acquire base below mid price while respecting inventory limits.`,
          args: {
            conclude_destination: concludeDestination,
            ask_token: config.baseToken,
            ask_amount: config.orderSize,
            give_token: config.quoteToken,
            give_amount: config.orderSize * levelBidPrice,
          },
        });
      }
    }

    if (inventory.baseBalance >= config.orderSize) {
      const levelAskPrice = askPrice * (1 + levelOffset);
      actions.push({
        id: stableId(['ask', config.pair, quoteLevel + 1, levelAskPrice.toFixed(8), config.orderSize]),
        kind: 'create-order',
        side: 'ask',
        price: levelAskPrice,
        reason: `Ask level ${quoteLevel + 1}: sell base above mid price while keeping exposure bounded.`,
        args: {
          conclude_destination: concludeDestination,
          ask_token: config.quoteToken,
          ask_amount: config.orderSize * levelAskPrice,
          give_token: config.baseToken,
          give_amount: config.orderSize,
        },
      });
    }
  }

  return actions.slice(0, activeBudget);
}

function canFillLevel(level: BookLevel, isOwn: boolean, allowSelfFills: boolean): boolean {
  return allowSelfFills || !isOwn;
}

export function planFillActions(args: {
  config: MarketMakerConfig;
  book: SyntheticBook;
  wallet: WalletSnapshot | null;
}): StrategyAction[] {
  const { config, book, wallet } = args;
  const actions: StrategyAction[] = [];

  if (!config.enableFillTrading || !book.midPrice || !wallet?.addresses.receiving[0]) {
    return actions;
  }

  const destination = wallet.addresses.receiving[0];
  const inventory = calculateInventory(wallet, config, book.midPrice);
  const ownedAddresses = new Set([...wallet.addresses.receiving, ...wallet.addresses.change]);

  // Need more base: take liquidity from the best ask (buy base with quote).
  if (inventory.drift < -config.rebalanceThreshold && book.asks.length > 0) {
    const level = book.asks[0];
    const isOwn = ownedAddresses.has(level.ownerAddress);
    if (canFillLevel(level, isOwn, config.allowSelfFills)) {
      const fillAmount = Math.min(config.orderSize * level.price, level.quoteAmount);
      if (fillAmount > 0 && inventory.quoteBalance > fillAmount) {
        actions.push({
          id: stableId(['fill-buy', level.orderId, fillAmount.toFixed(8)]),
          kind: 'fill-order',
          side: 'buy',
          reason: isOwn
            ? 'Inventory below target: fill own ask to rebalance (self-fill enabled).'
            : 'Inventory below target: fill external ask to buy base and generate trade volume.',
          orderId: level.orderId,
          amount: fillAmount,
          price: level.price,
          expectedBaseAmount: Math.min(config.orderSize, level.baseAmount),
          expectedQuoteAmount: fillAmount,
          isOwnOrder: isOwn,
        });
      }
    }
  }

  // Need less base: take liquidity from the best bid (sell base for quote).
  if (inventory.drift > config.rebalanceThreshold && book.bids.length > 0) {
    const level = book.bids[0];
    const isOwn = ownedAddresses.has(level.ownerAddress);
    if (canFillLevel(level, isOwn, config.allowSelfFills)) {
      const fillAmount = Math.min(config.orderSize, level.baseAmount);
      if (fillAmount > 0 && inventory.baseBalance >= fillAmount) {
        actions.push({
          id: stableId(['fill-sell', level.orderId, fillAmount.toFixed(8)]),
          kind: 'fill-order',
          side: 'sell',
          reason: isOwn
            ? 'Inventory above target: fill own bid to rebalance (self-fill enabled).'
            : 'Inventory above target: fill external bid to sell base and generate trade volume.',
          orderId: level.orderId,
          amount: fillAmount,
          price: level.price,
          expectedBaseAmount: fillAmount,
          expectedQuoteAmount: fillAmount * level.price,
          isOwnOrder: isOwn,
        });
      }
    }
  }

  return actions;
}

export function planAllStrategyActions(args: {
  config: MarketMakerConfig;
  book: SyntheticBook;
  ownOrders: MarketOrder[];
  wallet: WalletSnapshot | null;
  quoteLevelOffset?: number;
}): StrategyAction[] {
  return [...planFillActions(args), ...planStrategyActions(args)];
}

export function actionToText(action: StrategyAction, labels: TokenLabelMap): string {
  const fmt = (token: TokenRef) => formatTokenLabel(token, labels);

  if (action.kind === 'conclude-order') {
    return `Conclude stale order ${action.orderId}`;
  }

  if (action.kind === 'fill-order') {
    return `${action.side.toUpperCase()} fill ${action.amount.toFixed(8)} on ${action.orderId.slice(0, 12)}... @ ${action.price.toFixed(8)}`;
  }

  return `${action.side.toUpperCase()} ${action.args.give_amount.toFixed(8)} ${fmt(action.args.give_token)} for ${action.args.ask_amount.toFixed(8)} ${fmt(action.args.ask_token)}`;
}
