import type { SyncCursor, WalletTx } from '@mintlayer/sdk';
import { ChainApi, HttpError } from './chain';
import { BotDatabase, txJson, type Attempt } from './database';

/** Resolve account-command races using canonical evidence, never a timeout. */
export async function reconcileOrderAttempt(
  api: ChainApi, db: BotDatabase, account: string, attempt: Attempt, tip: SyncCursor,
): Promise<{ confirmed?: WalletTx; conflict?: string }> {
  if (!attempt.tx || !attempt.record.txId || !attempt.submittedAt || attempt.record.status !== 'unknown') return {};
  const commands = (txJson(attempt.tx).inputs as any[]).map(e => e.input)
    .filter(input => input?.order_id && ['FillOrder', 'ConcludeOrder'].includes(input.command));
  if (!commands.length) return {};
  const earliest = () => {
    if (attempt.submittedCursor) return attempt.submittedCursor.height;
    // Compatibility with attempts signed before submission cursors were stored:
    // the candidate cannot precede its latest confirmed funding ancestor.
    const known = new Map(db.transactions(account).map(tx => [tx.txId, tx]));
    let floor = 0;
    const visited = new Set<string>();
    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      const tx = known.get(id);
      if (tx?.state === 'confirmed' && tx.blockHeight !== undefined) floor = Math.max(floor, tx.blockHeight);
      else if (tx) for (const entry of txJson(tx.tx).inputs as any[]) if (entry.input?.source_id) visit(entry.input.source_id);
    };
    for (const entry of txJson(attempt.tx!).inputs as any[]) if (entry.input?.source_id) visit(entry.input.source_id);
    return floor;
  };
  let scan = attempt.orderScan;
  if (!scan || (scan.anchor && (scan.anchor.height > tip.height || await api.blockId(scan.anchor.height) !== scan.anchor.blockHash)))
    scan = { nextHeight: earliest(), concluded: [] };
  for (let count = 0; count < 10 && scan.nextHeight <= tip.height; count++) {
    const height = scan.nextHeight;
    const hash = await api.blockId(height);
    const block = await api.get(`/block/${hash}`);
    const transactions = block.body?.transactions;
    if (!Array.isArray(transactions)) return {};
    const candidate = transactions.find(tx => tx.id === attempt.record.txId);
    if (candidate) return { confirmed: await api.observe({ ...candidate, block_id: hash }, tip, true) };
    if (await api.blockId(height) !== hash) return {};
    for (const tx of transactions) {
      if (typeof tx.id !== 'string' || !/^[0-9a-f]{64}$/i.test(tx.id) || !Array.isArray(tx.inputs)) continue;
      for (const entry of tx.inputs)
        if (entry.input?.command === 'ConcludeOrder' && commands.some(command => command.order_id === entry.input.order_id))
          scan.concluded.push(entry.input.order_id);
    }
    scan.nextHeight++;
    scan.anchor = { height, blockHash: hash, updatedAt: Date.now() };
  }
  attempt.orderScan = scan;
  db.saveAttempt(attempt);
  if (scan.nextHeight <= tip.height) return {};
  // Our tx was absent from every canonical block since it could first mine.
  // A later state change cannot be mistaken for our own mined-but-index-lagged tx.
  for (const command of commands) {
    let reason: string | undefined;
    if (scan.concluded.includes(command.order_id)) reason = 'Order was concluded by a different canonical transaction';
    else if (command.command === 'FillOrder') {
      try {
        const order = await api.get(`/order/${command.order_id}`);
        api.validateOrder(order);
        const paid = BigInt(command.fill_atoms?.atoms ?? command.fill_atoms);
        if (paid > BigInt(order.ask_balance.atoms)) reason = 'Canonical order balance no longer permits this fill';
      } catch (error) {
        if (!(error instanceof HttpError) || error.status !== 404) throw error;
        // An absent indexer record alone is not evidence of a conclusion.
      }
    }
    if (reason && (await api.tip()).blockHash === tip.blockHash) return { conflict: reason };
  }
  return {};
}
