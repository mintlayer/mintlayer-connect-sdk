import { atomsToDecimal, decimalsToAtoms } from '@mintlayer/sdk';
import { createHash } from 'node:crypto';
import type { TokenLabelMap } from '../src/lib/tokens';
import type { MarketMakerConfig, MarketOrder, StrategyAction, WalletSnapshot, BookSide, MarketBook, SyntheticBook } from '../src/lib/types';

export const asset = (currency: MarketOrder['ask_currency']): string =>
  currency.type === 'Coin' ? 'Coin' : currency.token_id!;
export const atoms = (amount: { atoms?: string | number }): bigint => BigInt(amount.atoms ?? '0');
type Price = { n: bigint; d: bigint };
const mul = (price: Price, bps: bigint): Price => ({ n: price.n * bps, d: price.d * 10_000n });
const compare = (a: Price, b: Price) => (a.n * b.d < b.n * a.d ? -1 : a.n * b.d > b.n * a.d ? 1 : 0);
export function orderPrice(order: MarketOrder, config: MarketMakerConfig): Price | null {
  if (asset(order.give_currency) === config.baseToken && asset(order.ask_currency) === config.quoteToken)
    return { n: atoms(order.initially_asked), d: atoms(order.initially_given) };
  if (asset(order.ask_currency) === config.baseToken && asset(order.give_currency) === config.quoteToken)
    return { n: atoms(order.initially_given), d: atoms(order.initially_asked) };
  return null;
}
export function referencePrice(
  orders: MarketOrder[],
  own: MarketOrder[],
  config: MarketMakerConfig,
  labels: TokenLabelMap,
  book?: MarketBook,
): Price {
  if (book) {
    const prices = (side: 'ask' | 'bid') => book[side === 'ask' ? 'asks' : 'bids'].filter(level => {
      const price = { n: BigInt(level.numerator), d: BigInt(level.denominator) };
      const ours = own.filter(order =>
        asset(order.give_currency) === (side === 'ask' ? config.baseToken : config.quoteToken) &&
        asset(order.ask_currency) === (side === 'ask' ? config.quoteToken : config.baseToken) &&
        atoms(order.ask_balance) > 0n && atoms(order.give_balance) > 0n &&
        compare(price, side === 'ask' ? { n: atoms(order.ask_balance), d: atoms(order.give_balance) }
          : { n: atoms(order.give_balance), d: atoms(order.ask_balance) }) === 0,
      ).reduce((sum, order) => sum + atoms(side === 'ask' ? order.give_balance : order.ask_balance), 0n);
      return BigInt(level.baseAtoms) > ours;
    }).map(level => ({ n: BigInt(level.numerator), d: BigInt(level.denominator) }));
    const bids = prices('bid').sort((a, b) => compare(b, a));
    const asks = prices('ask').sort(compare);
    if (bids[0] && asks[0]) return { n: bids[0].n * asks[0].d + asks[0].n * bids[0].d, d: 2n * bids[0].d * asks[0].d };
    return bids[0] ?? asks[0] ?? { n: decimalsToAtoms(String(config.referencePrice), labels[config.quoteToken].decimals), d: 10n ** BigInt(labels[config.baseToken].decimals) };
  }
  const ownIds = new Set(own.map((order) => order.order_id));
  const market = orders.filter(
    (order) => !ownIds.has(order.order_id) && atoms(order.ask_balance) > 0n && atoms(order.give_balance) > 0n,
  );
  const bids: Price[] = [],
    asks: Price[] = [];
  for (const order of market) {
    const price = orderPrice(order, config);
    if (price && price.n > 0n && price.d > 0n)
      (asset(order.give_currency) === config.baseToken ? asks : bids).push(price);
  }
  bids.sort((a, b) => compare(b, a));
  asks.sort(compare);
  if (bids[0] && asks[0]) return { n: bids[0].n * asks[0].d + asks[0].n * bids[0].d, d: 2n * bids[0].d * asks[0].d };
  return (
    bids[0] ??
    asks[0] ?? {
      n: decimalsToAtoms(String(config.referencePrice), labels[config.quoteToken].decimals),
      d: 10n ** BigInt(labels[config.baseToken].decimals),
    }
  );
}
function walletAtoms(wallet: WalletSnapshot, token: string): bigint {
  return wallet.availableUtxos.reduce((sum, entry) => {
    const value = (entry.utxo as any).value;
    return value && (value.type === 'Coin' ? 'Coin' : value.token_id) === token ? sum + atoms(value.amount) : sum;
  }, 0n);
}
function baseExposure(wallet: WalletSnapshot, orders: MarketOrder[], config: MarketMakerConfig): bigint {
  let exposure = walletAtoms(wallet, config.baseToken);
  for (const order of orders) {
    if (asset(order.give_currency) === config.baseToken) exposure += atoms(order.give_balance);
    // A resting bid can acquire its entire original ask amount: already-filled
    // proceeds plus the remaining amount. Reserve this worst-case exposure.
    if (asset(order.ask_currency) === config.baseToken) exposure += atoms(order.initially_asked);
  }
  return exposure;
}
function holdings(wallet: WalletSnapshot, orders: MarketOrder[], token: string): bigint {
  return orders.reduce(
    (total, order) =>
      total +
      (asset(order.give_currency) === token ? atoms(order.give_balance) : 0n) +
      (asset(order.ask_currency) === token ? atoms(order.initially_asked) - atoms(order.ask_balance) : 0n),
    walletAtoms(wallet, token),
  );
}
function identity(parts: unknown[]): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 24);
}
export function displayMarketBook(book: MarketBook, config: MarketMakerConfig, labels: TokenLabelMap): SyntheticBook {
  const side = (name: 'bid' | 'ask') => book[name === 'bid' ? 'bids' : 'asks'].map(level => {
    const base = Number(atomsToDecimal(level.baseAtoms, labels[config.baseToken].decimals));
    const price = Number(level.numerator) / Number(level.denominator) *
      10 ** (labels[config.baseToken].decimals - labels[config.quoteToken].decimals);
    const quoteAtoms = BigInt(level.baseAtoms) * BigInt(level.numerator) / BigInt(level.denominator);
    return { side: name, orderId: `${name}:${level.numerator}/${level.denominator}`, price,
      baseAmount: base, quoteAmount: base * price, ownerAddress: '',
      askToken: name === 'ask' ? config.quoteToken : config.baseToken,
      askBalanceAtoms: name === 'ask' ? quoteAtoms.toString() : level.baseAtoms };
  }).sort((a, b) => name === 'ask' ? a.price - b.price : b.price - a.price);
  const bids = side('bid'), asks = side('ask');
  const bestBid = bids[0]?.price ?? null, bestAsk = asks[0]?.price ?? null;
  return { bids, asks, bestBid, bestAsk, midPrice: bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : bestBid ?? bestAsk };
}

export function planServerActions(args: {
  config: MarketMakerConfig;
  wallet: WalletSnapshot;
  orders: MarketOrder[];
  ownOrders: MarketOrder[];
  labels: TokenLabelMap;
  configVersion: number;
  marketBook?: MarketBook;
}): StrategyAction[] {
  const { config, wallet, orders, ownOrders, labels, configVersion } = args;
  const destination = wallet.addresses.receiving[0];
  if (!destination || !labels[config.baseToken] || !labels[config.quoteToken]) return [];
  const baseDecimals = labels[config.baseToken].decimals,
    quoteDecimals = labels[config.quoteToken].decimals;
  const size = decimalsToAtoms(String(config.orderSize), baseDecimals);
  if (size <= 0n) throw new Error('Order size rounds to zero atoms for this asset');
  const mid = referencePrice(orders, ownOrders, config, labels, args.marketBook);
  if (mid.n <= 0n || mid.d <= 0n) throw new Error('Reference price rounds to zero');
  const fingerprint = identity([
    configVersion,
    mid.n.toString(),
    mid.d.toString(),
    wallet.availableUtxos.map((u) => `${u.txId}:${u.outputIndex}`).sort(),
    ownOrders.map((o) => [o.order_id, o.nonce, o.ask_balance.atoms, o.give_balance.atoms]).sort(),
  ]);
  const result: StrategyAction[] = [];
  const active = ownOrders.filter((order) => atoms(order.ask_balance) > 0n && atoms(order.give_balance) > 0n);
  const baseValue = (holdings(wallet, ownOrders, config.baseToken) * mid.n) / mid.d;
  const totalValue = baseValue + holdings(wallet, ownOrders, config.quoteToken);
  const targetBps = BigInt(Math.round(config.inventoryTarget * 10_000));
  const thresholdBps = BigInt(Math.round(config.rebalanceThreshold * 10_000));
  const drift = baseValue * 10_000n - totalValue * targetBps;
  const skew = totalValue > 0n ? Number(((drift / totalValue) * thresholdBps) / 10_000n) : 0;
  if (config.enableFillTrading && totalValue > 0n && (drift < 0n ? -drift : drift) > totalValue * thresholdBps) {
    const buy = drift < 0n;
    const owned = new Set(ownOrders.map((order) => order.order_id));
    const candidates = orders.filter(
      (order) =>
        atoms(order.ask_balance) > 0n &&
        atoms(order.give_balance) > 0n &&
        (config.allowSelfFills || !owned.has(order.order_id)) &&
        asset(order.give_currency) === (buy ? config.baseToken : config.quoteToken) &&
        asset(order.ask_currency) === (buy ? config.quoteToken : config.baseToken),
    );
    candidates.sort((a, b) =>
      buy
        ? compare(orderPrice(a, config)!, orderPrice(b, config)!)
        : compare(orderPrice(b, config)!, orderPrice(a, config)!),
    );
    const order = candidates[0];
    if (order) {
      const paymentToken = asset(order.ask_currency);
      let payment = buy
        ? (size * atoms(order.initially_asked) + atoms(order.initially_given) - 1n) / atoms(order.initially_given)
        : size;
      if (payment > atoms(order.ask_balance)) payment = atoms(order.ask_balance);
      const receive = (payment * atoms(order.initially_given)) / atoms(order.initially_asked);
      const maximum = decimalsToAtoms(String(config.maxPosition), baseDecimals);
      if (
        payment > 0n &&
        receive > 0n &&
        walletAtoms(wallet, paymentToken) >= payment &&
        (!buy || baseExposure(wallet, ownOrders, config) + receive <= maximum)
      ) {
        const exactAmount = atomsToDecimal(payment.toString(), labels[paymentToken].decimals);
        result.push({
          id: `fill:${order.order_id}:${order.nonce ?? 0}:${fingerprint}`,
          kind: 'fill-order',
          side: buy ? 'buy' : 'sell',
          orderId: order.order_id,
          exactAmount,
          amount: Number(exactAmount),
          price:
            Number(atomsToDecimal((buy ? payment : receive).toString(), quoteDecimals)) /
            Number(atomsToDecimal((buy ? receive : payment).toString(), baseDecimals)),
          expectedBaseAmount: Number(atomsToDecimal((buy ? receive : payment).toString(), baseDecimals)),
          expectedQuoteAmount: Number(atomsToDecimal((buy ? payment : receive).toString(), quoteDecimals)),
          isOwnOrder: owned.has(order.order_id),
          reason: 'Rebalance inventory toward configured target.',
        });
      }
    }
  }
  for (const order of ownOrders) {
    if (!active.includes(order))
      result.push({
        id: `conclude:${order.order_id}:${order.nonce ?? 0}`,
        kind: 'conclude-order',
        orderId: order.order_id,
        reason: 'Settle filled order proceeds.',
      });
  }
  const targetPerSide = Math.max(1, Math.ceil(config.maxOrders / 2));
  for (const side of ['bid', 'ask'] as const) {
    const sideOrders = active.filter(
      (order) => (asset(order.give_currency) === config.baseToken ? 'ask' : 'bid') === side,
    );
    sideOrders.sort((a, b) =>
      side === 'ask'
        ? compare(orderPrice(a, config)!, orderPrice(b, config)!)
        : compare(orderPrice(b, config)!, orderPrice(a, config)!),
    );
    const target = side === 'bid' ? targetPerSide : config.maxOrders - targetPerSide;
    for (const order of sideOrders.slice(target))
      result.push({
        id: `conclude:${order.order_id}:${order.nonce ?? 0}`,
        kind: 'conclude-order',
        orderId: order.order_id,
        reason: 'Reduce order count to configured limit.',
      });
    const spread = Math.max(1, Math.round(config.spreadBps / 2));
    for (const [level, order] of sideOrders.slice(0, target).entries()) {
      const targetPrice = mul(
        mid,
        BigInt(Math.max(1, 10_000 + (side === 'ask' ? 1 : -1) * spread * (level + 1) - skew)),
      );
      const price = orderPrice(order, config)!;
      const difference = price.n * targetPrice.d - targetPrice.n * price.d;
      if (
        (difference < 0n ? -difference : difference) * 10_000n >
        BigInt(Math.max(100, config.spreadBps * 3)) * targetPrice.n * price.d
      ) {
        result.push({
          id: `conclude:${order.order_id}:${order.nonce ?? 0}`,
          kind: 'conclude-order',
          orderId: order.order_id,
          reason: 'Requote order after market price moved.',
        });
      }
    }
    if (sideOrders.length < target && active.length < config.maxOrders) {
      const price = mul(
        mid,
        BigInt(Math.max(1, 10_000 + (side === 'ask' ? 1 : -1) * spread * (sideOrders.length + 1) - skew)),
      );
      const quote = side === 'ask' ? (size * price.n + price.d - 1n) / price.d : (size * price.n) / price.d;
      if (quote <= 0n) continue;
      const givesBase = side === 'ask';
      const giveToken = givesBase ? config.baseToken : config.quoteToken;
      const askToken = givesBase ? config.quoteToken : config.baseToken;
      const giveAtoms = givesBase ? size : quote,
        askAtoms = givesBase ? quote : size;
      if (walletAtoms(wallet, giveToken) < giveAtoms) continue;
      if (
        !givesBase &&
        baseExposure(wallet, ownOrders, config) + size > decimalsToAtoms(String(config.maxPosition), baseDecimals)
      )
        continue;
      result.push({
        id: `quote:${side}:${fingerprint}`,
        kind: 'create-order',
        side,
        reason: `Maintain ${side} liquidity at level ${sideOrders.length + 1}.`,
        price:
          Number(atomsToDecimal(quote.toString(), quoteDecimals)) /
          Number(atomsToDecimal(size.toString(), baseDecimals)),
        args: {
          conclude_destination: destination,
          ask_token: askToken,
          give_token: giveToken,
          ask_amount: atomsToDecimal(askAtoms.toString(), labels[askToken].decimals),
          give_amount: atomsToDecimal(giveAtoms.toString(), labels[giveToken].decimals),
        },
      });
    }
  }
  return result;
}

export function manualQuote(
  side: BookSide,
  config: MarketMakerConfig,
  wallet: WalletSnapshot,
  orders: MarketOrder[],
  own: MarketOrder[],
  labels: TokenLabelMap,
  id: string,
  marketBook?: MarketBook,
): StrategyAction {
  const size = decimalsToAtoms(String(config.orderSize), labels[config.baseToken].decimals);
  const price = mul(referencePrice(orders, own, config, labels, marketBook), side === 'bid' ? 9500n : 10_500n);
  const quote = side === 'ask' ? (size * price.n + price.d - 1n) / price.d : (size * price.n) / price.d;
  if (size <= 0n || quote <= 0n) throw new Error('Order rounds to zero atoms');
  if (
    side === 'bid' &&
    baseExposure(wallet, own, config) + size >
      decimalsToAtoms(String(config.maxPosition), labels[config.baseToken].decimals)
  )
    throw new Error('Order exceeds maximum position including open bids');
  const give = side === 'bid' ? config.quoteToken : config.baseToken,
    ask = side === 'bid' ? config.baseToken : config.quoteToken;
  return {
    id: `manual:${id}`,
    kind: 'create-order',
    side,
    reason: 'Manual quote.',
    price: Number(config.referencePrice),
    args: {
      conclude_destination: wallet.addresses.receiving[0],
      ask_token: ask,
      give_token: give,
      ask_amount: atomsToDecimal((side === 'bid' ? size : quote).toString(), labels[ask].decimals),
      give_amount: atomsToDecimal((side === 'bid' ? quote : size).toString(), labels[give].decimals),
    },
  };
}
