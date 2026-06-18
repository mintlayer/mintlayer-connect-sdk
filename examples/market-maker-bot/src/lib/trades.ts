import type { ExecutionRecord, TradeRecord } from './types';

export function executionRecordToTrade(record: ExecutionRecord): TradeRecord | null {
  if (record.kind !== 'fill-order' || !record.tradeMeta) {
    return null;
  }

  return {
    id: record.id,
    orderId: record.tradeMeta.orderId,
    side: record.tradeMeta.side,
    fillAmount: record.tradeMeta.fillAmount,
    expectedBaseAmount: record.tradeMeta.expectedBaseAmount,
    expectedQuoteAmount: record.tradeMeta.expectedQuoteAmount,
    price: record.tradeMeta.price,
    status: record.status,
    isOwnOrder: record.tradeMeta.isOwnOrder,
    txId: record.txId,
    timestamp: record.updatedAt,
    description: record.description,
  };
}

export function listTrades(records: ExecutionRecord[]): TradeRecord[] {
  return records
    .map(executionRecordToTrade)
    .filter((trade): trade is TradeRecord => trade !== null)
    .sort((left, right) => right.timestamp - left.timestamp);
}

export function countBroadcastedTrades(records: ExecutionRecord[]): number {
  return listTrades(records).filter((trade) => trade.status === 'broadcasted' || trade.status === 'confirmed').length;
}
