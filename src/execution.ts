import type { MarketSnapshot } from './market.js'
import type { TradeSignal } from './signals.js'
import type { MyOrder } from './private-api.js'

export type ExecutionPlan =
  | {
      action: 'none'
      reason: string
    }
  | {
      action: 'place_buy'
      price: string
      amount: string
      reason: string
    }
  | {
      action: 'keep_existing'
      orderId: number
      price: string
      amount: string
      reason: string
    }
  | {
      action: 'replace_existing'
      orderId: number
      newPrice: string
      newAmount: string
      reason: string
    }

const BUY_AMOUNT = 0.1
const PRICE_TICK = 0.00000001
const PRICE_MATCH_TOLERANCE = 0.00000002

function format8(value: number): string {
  return value.toFixed(8)
}

function parseOrderPrice(order: MyOrder): number {
  return Number(order.price)
}

function isOpenOrder(order: MyOrder): boolean {
  return order.status === 'open' || order.status === 'partial'
}

function isBuyOrder(order: MyOrder): boolean {
  return order.side === 'buy'
}

function findExistingBuyOrder(orders: MyOrder[]): MyOrder | undefined {
  return orders.find((order) => isOpenOrder(order) && isBuyOrder(order))
}

function pricesRoughlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= PRICE_MATCH_TOLERANCE
}

export function buildExecutionPlan(
  snapshot: MarketSnapshot,
  signal: TradeSignal,
  orders: MyOrder[]
): ExecutionPlan {
  if (signal.state !== 'candidate' || !signal.shouldTrade) {
    return {
      action: 'none',
      reason: `Signal is not tradable (state=${signal.state}, score=${signal.score})`,
    }
  }

  if (snapshot.bestBid <= 0 || snapshot.bestAsk <= 0) {
    return {
      action: 'none',
      reason: 'Order book is incomplete',
    }
  }

  const targetPrice = snapshot.bestBid + PRICE_TICK

  if (targetPrice >= snapshot.bestAsk) {
    return {
      action: 'none',
      reason: 'Target buy price would cross the ask',
    }
  }

  const targetAmount = BUY_AMOUNT
  const existing = findExistingBuyOrder(orders)

  if (!existing) {
    return {
      action: 'place_buy',
      price: format8(targetPrice),
      amount: format8(targetAmount),
      reason: 'No existing open buy order found',
    }
  }

  const existingPrice = parseOrderPrice(existing)

  if (pricesRoughlyEqual(existingPrice, targetPrice)) {
    return {
      action: 'keep_existing',
      orderId: existing.id,
      price: existing.price,
      amount: existing.amount,
      reason: 'Existing buy order is already close to target price',
    }
  }

  return {
    action: 'replace_existing',
    orderId: existing.id,
    newPrice: format8(targetPrice),
    newAmount: format8(targetAmount),
    reason: 'Existing buy order is stale and should be replaced',
  }
}