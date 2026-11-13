import type { ExecutionRequest, StrategyAction } from './types';

export function strategyActionToRequest(action: StrategyAction, destination: string): ExecutionRequest {
  if (action.kind === 'conclude-order') {
    return {
      id: `exec:${action.id}`,
      kind: 'conclude-order',
      orderId: action.orderId,
      description: action.reason,
      idempotencyKey: action.id,
    };
  }

  if (action.kind === 'fill-order') {
    return {
      id: `exec:${action.id}`,
      kind: 'fill-order',
      orderId: action.orderId,
      amount: action.exactAmount ?? action.amount,
      destination,
      description: action.reason,
      idempotencyKey: action.id,
      tradeMeta: {
        side: action.side,
        orderId: action.orderId,
        fillAmount: action.amount,
        price: action.price,
        expectedBaseAmount: action.expectedBaseAmount,
        expectedQuoteAmount: action.expectedQuoteAmount,
        isOwnOrder: action.isOwnOrder,
      },
    };
  }

  return {
    id: `exec:${action.id}`,
    kind: 'create-order',
    args: action.args,
    description: action.reason,
    idempotencyKey: action.id,
  };
}
