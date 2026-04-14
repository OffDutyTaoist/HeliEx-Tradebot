import type { MarketSnapshot } from '../core/market.js'
import type { TradeSignal } from '../core/signals.js'
import type { MyOrder } from '../private-api.js'
import type { ExecutionPlan } from '../core/execution.js'

export type StrategyContext = {
  snapshot: MarketSnapshot
  signal: TradeSignal
  orders: MyOrder[]
}

export interface TradingStrategy {
  buildPlan(context: StrategyContext): ExecutionPlan
}