import 'dotenv/config'
import { getOrderBook, getTrades, getWalletStatus } from './api.js'
import { getBalances, getMyOrders } from './private-api.js'
import { PrivateStrategy } from './strategy/private-strategy.js'
import { ExchangeUnavailableError } from './errors.js'
import { buildMarketSnapshot } from './core/market.js'
import { evaluateSignal } from './core/signals.js'
import { runtimeConfig } from './config/runtime.js'

type SummaryBucket =
  | 'base_signal_blocked'
  | 'private_low_score'
  | 'private_stale_trade'
  | 'private_open_order_limit'
  | 'private_partial_fill_keep'
  | 'candidate_action'

type Counts = Record<SummaryBucket, number>

const SAMPLE_COUNT = 10
const SAMPLE_DELAY_MS = 15_000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function classify(plan: { action: string; reason?: string }): SummaryBucket {
  const reason = plan.reason ?? ''

  if (reason.startsWith('Signal is not tradable')) {
    return 'base_signal_blocked'
  }

  if (reason.startsWith('Private strategy rejected low score')) {
    return 'private_low_score'
  }

  if (reason.startsWith('Last trade too old')) {
    return 'private_stale_trade'
  }

  if (reason.startsWith('Open buy order already exists')) {
    return 'private_open_order_limit'
  }

  if (reason.startsWith('Order partially filled, leaving it alone')) {
    return 'private_partial_fill_keep'
  }

  return 'candidate_action'
}

async function takeSample(sampleNumber: number) {
  const [orderBook, trades, walletStatus, orders, balances] =
    await Promise.all([
      getOrderBook(),
      getTrades(),
      getWalletStatus(),
      getMyOrders(),
      getBalances(),
    ])

  const snapshot = buildMarketSnapshot(orderBook, trades)
  const signal = evaluateSignal(snapshot, walletStatus)
  const strategy = new PrivateStrategy()

  const plan = strategy.buildPlan({
    snapshot,
    signal,
    orders,
  })

  const bucket = classify(plan)

  console.log(`\n[Sample ${sampleNumber}/${SAMPLE_COUNT}]`)
  console.log({
    bucket,
    signalState: signal.state,
    signalScore: signal.score,
    action: plan.action,
    reason: plan.reason ?? null,
    bestBid: snapshot.bestBid,
    bestAsk: snapshot.bestAsk,
    bestAskAmount: snapshot.bestAskAmount,
    spread: snapshot.spread,
    orderCount: orders.length,
    balances,
  })

  return {
    bucket,
    signalState: signal.state,
    signalScore: signal.score,
  }
}

async function main(): Promise<void> {
  console.log('Running strategy sampler...\n')

  console.log('--- Runtime Config ---')
  console.log(`Strategy: ${runtimeConfig.strategyName}`)
  console.log(`Min private score: ${runtimeConfig.minPrivateScore}`)
  console.log(`Max trade age: ${runtimeConfig.maxTradeAgeMs / 1000}s`)
  console.log(`Max open buy orders: ${runtimeConfig.maxOpenBuyOrders}`)
  console.log(`Samples: ${SAMPLE_COUNT}`)
  console.log(`Delay: ${SAMPLE_DELAY_MS / 1000}s`)

  const counts: Counts = {
    base_signal_blocked: 0,
    private_low_score: 0,
    private_stale_trade: 0,
    private_open_order_limit: 0,
    private_partial_fill_keep: 0,
    candidate_action: 0,
  }

  const signalStateCounts: Record<string, number> = {}
  const scores: number[] = []

  for (let i = 1; i <= SAMPLE_COUNT; i++) {
    const result = await takeSample(i)

    counts[result.bucket] += 1
    signalStateCounts[result.signalState] =
      (signalStateCounts[result.signalState] ?? 0) + 1
    scores.push(result.signalScore)

    if (i < SAMPLE_COUNT) {
      await sleep(SAMPLE_DELAY_MS)
    }
  }

  const minScore = Math.min(...scores)
  const maxScore = Math.max(...scores)
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length

  console.log('\n--- Totals ---')
  console.log(counts)

  console.log('\n--- Signal States ---')
  console.log(signalStateCounts)

  console.log('\n--- Score Stats ---')
  console.log({
    min: minScore,
    max: maxScore,
    avg: Number(avgScore.toFixed(2)),
  })
}

main().catch((err) => {
  if (err instanceof ExchangeUnavailableError) {
    console.error('Strategy sampler aborted: HeliEx unavailable (Cloudflare tunnel error).')
    process.exit(1)
  }

  console.error('Strategy sampler failed:')
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})