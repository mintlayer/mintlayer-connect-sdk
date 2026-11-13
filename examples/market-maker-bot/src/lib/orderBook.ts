import type { TokenLabelMap } from './tokens';
import type { BookLevel, MarketOrder, SyntheticBook, TokenRef } from './types';

function decimalAmount(
  amount: { decimal?: string; atoms?: string | number } | undefined,
  token?: string,
  labels?: TokenLabelMap,
): number {
  const value =
    amount?.decimal ??
    (amount?.atoms !== undefined && token && labels?.[token]
      ? Number(amount.atoms) / 10 ** labels[token].decimals
      : undefined);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isActiveOrder(order: MarketOrder): boolean {
  return BigInt(order.ask_balance.atoms ?? '0') > 0n && BigInt(order.give_balance.atoms ?? '0') > 0n;
}

function currencyKey(currency: MarketOrder['ask_currency']): TokenRef {
  if (currency.type === 'Coin') {
    return 'Coin';
  }

  return currency.token_id ?? 'unknown';
}

function sameToken(currency: MarketOrder['ask_currency'], token: TokenRef): boolean {
  return currencyKey(currency) === token;
}

function toBookLevel(
  order: MarketOrder,
  baseToken: TokenRef,
  quoteToken: TokenRef,
  labels?: TokenLabelMap,
): BookLevel | null {
  const askMatchesQuote = sameToken(order.ask_currency, quoteToken);
  const askMatchesBase = sameToken(order.ask_currency, baseToken);
  const giveMatchesBase = sameToken(order.give_currency, baseToken);
  const giveMatchesQuote = sameToken(order.give_currency, quoteToken);

  const askAmount = decimalAmount(order.ask_balance, currencyKey(order.ask_currency), labels);
  const giveAmount = decimalAmount(order.give_balance, currencyKey(order.give_currency), labels);

  if (askAmount <= 0 || giveAmount <= 0) {
    return null;
  }

  if (giveMatchesBase && askMatchesQuote) {
    return {
      side: 'ask',
      orderId: order.order_id,
      price: askAmount / giveAmount,
      baseAmount: giveAmount,
      quoteAmount: askAmount,
      ownerAddress: order.conclude_destination,
      askToken: quoteToken,
      askBalanceAtoms: String(order.ask_balance.atoms ?? '0'),
    };
  }

  if (giveMatchesQuote && askMatchesBase) {
    return {
      side: 'bid',
      orderId: order.order_id,
      price: giveAmount / askAmount,
      baseAmount: askAmount,
      quoteAmount: giveAmount,
      ownerAddress: order.conclude_destination,
      askToken: baseToken,
      askBalanceAtoms: String(order.ask_balance.atoms ?? '0'),
    };
  }

  return null;
}

export function buildSyntheticBook(
  orders: MarketOrder[],
  baseToken: TokenRef,
  quoteToken: TokenRef,
  labels?: TokenLabelMap,
): SyntheticBook {
  const levels = orders
    .filter(isActiveOrder)
    .map((order) => toBookLevel(order, baseToken, quoteToken, labels))
    .filter((level): level is BookLevel => level !== null);

  const bids = levels.filter((level) => level.side === 'bid').sort((a, b) => b.price - a.price);
  const asks = levels.filter((level) => level.side === 'ask').sort((a, b) => a.price - b.price);
  const bestBid = bids[0]?.price ?? null;
  const bestAsk = asks[0]?.price ?? null;

  return {
    bids,
    asks,
    bestBid,
    bestAsk,
    midPrice: bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : (bestBid ?? bestAsk),
  };
}

/**
 * The arithmetic mean of all currently visible prices. This is intentionally
 * distinct from the best-bid/best-ask mid so manual demo quotes remain useful
 * for a one-sided or sparse book.
 */
export function averageBookPrice(book: SyntheticBook): number | null {
  const prices = [...book.bids, ...book.asks]
    .map((level) => level.price)
    .filter((price) => Number.isFinite(price) && price > 0);

  if (prices.length === 0) return null;
  return prices.reduce((total, price) => total + price, 0) / prices.length;
}

export function isOwnOrder(order: MarketOrder, addresses: { receiving: string[]; change: string[] }): boolean {
  return [...addresses.receiving, ...addresses.change].includes(order.conclude_destination);
}

export function formatToken(token: TokenRef): string {
  return token === 'Coin' ? 'ML' : token;
}
