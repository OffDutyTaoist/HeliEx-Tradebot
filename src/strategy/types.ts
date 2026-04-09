import type { MarketSnapshot } from '../market.js'
import type { TradeSignal } from '../signals.js'
import type { MyOrder } from '../private-api.js'
import type { ExecutionPlan } from '../execution.js'

export type StrategyContext = {
  snapshot: MarketSnapshot
  signal: TradeSignal
  orders: MyOrder[]
}

export interface TradingStrategy {
  buildPlan(context: StrategyContext): ExecutionPlan
}