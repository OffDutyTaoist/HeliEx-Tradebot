import { PrivateStrategy } from '../strategy/private-strategy.js'
import type { StrategyContext } from '../strategy/types.js'
import type { MarketSnapshot } from '../core/market.js'
import type { TradeSignal } from '../core/signals.js'
import type { MyOrder } from '../private-api.js'

function printSection(title: string, value: unknown) {
  console.log(`\n--- ${title} ---`)
  console.dir(value, { depth: null })
}

function makeSnapshot(overrides: Partial<MarketSnapshot> = {}): MarketSnapshot {
  return {
    bestBid: 0.5,
    bestBidAmount: 2,
    bestAsk: 0.53,
    bestAskAmount: 2,
    spread: 0.03,
    lastTradePrice: 0.53,
    lastTradeAmount: 1,
    lastTradeTime: new Date().toISOString(),
    ...overrides,
  }
}

function makeSignal(overrides: Partial<TradeSignal> = {}): TradeSignal {
  return {
    shouldTrade: true,
    state: 'candidate',
    reasons: [],
    score: 50,
    ...overrides,
  }
}

function makeBuyOrder(
  overrides: Partial<MyOrder> = {}
): MyOrder {
  return {
    id: 1,
    side: 'buy',
    price: '0.50000001',
    amount: '0.10000000',
    status: 'open',
    created_at: '2026-04-10T10:00:00.000000',
    ...overrides,
  }
}

function runCase(name: string, context: StrategyContext) {
  const strategy = new PrivateStrategy()
  const plan = strategy.buildPlan(context)

  printSection(name, plan)
}

function main(): void {
  runCase('Low Score Veto', {
    snapshot: makeSnapshot(),
    signal: makeSignal({ score: 30 }),
    orders: [],
  })

  runCase('Place Buy With No Existing Order', {
    snapshot: makeSnapshot(),
    signal: makeSignal({ score: 50 }),
    orders: [],
  })

  runCase('Keep Existing Matching Buy', {
    snapshot: makeSnapshot(),
    signal: makeSignal({ score: 50 }),
    orders: [makeBuyOrder({ price: '0.50000001', status: 'open' })],
  })

  runCase('Replace Stale Buy', {
    snapshot: makeSnapshot(),
    signal: makeSignal({ score: 50 }),
    orders: [makeBuyOrder({ price: '0.49000000', status: 'open' })],
  })

  runCase('Keep Partial Buy', {
    snapshot: makeSnapshot(),
    signal: makeSignal({ score: 50 }),
    orders: [makeBuyOrder({ price: '0.49000000', status: 'partial' })],
  })

  runCase('Reject Stale Last Trade', {
    snapshot: makeSnapshot({
      lastTradeTime: '2020-01-01T00:00:00.000Z',
    }),
    signal: makeSignal({ score: 50 }),
    orders: [],
  })
}

main()