import type { ExecutionPlan } from '../execution.js'
import type { StrategyContext, TradingStrategy } from './types.js'
import { findActiveBuyOrder } from '../reconciliation.js'

const BUY_AMOUNT = 0.1
const PRICE_TICK = 0.00000001
const PRICE_MATCH_TOLERANCE = 0.00000002

function format8(value: number): string {
  return value.toFixed(8)
}

function pricesRoughlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= PRICE_MATCH_TOLERANCE
}

export class BaseStrategy implements TradingStrategy {
  buildPlan(context: StrategyContext): ExecutionPlan {
    const { snapshot, signal, orders } = context

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

    const existing = findActiveBuyOrder(orders)

    if (!existing) {
      return {
        action: 'place_buy',
        price: format8(targetPrice),
        amount: format8(BUY_AMOUNT),
        reason: 'No existing open buy order found',
      }
    }

    const existingPrice = Number(existing.price)

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
      newAmount: format8(BUY_AMOUNT),
      reason: 'Existing buy order is stale and should be replaced',
    }
  }
}