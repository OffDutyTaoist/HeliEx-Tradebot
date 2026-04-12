import 'dotenv/config'
import { getOrderBook, getTrades, getWalletStatus } from './api.js'
import { getBalances, getMyOrders } from './private-api.js'
import { buildMarketSnapshot } from './market.js'
import { evaluateSignal } from './signals.js'
import { PrivateStrategy } from './strategy/private-strategy.js'
import { getActiveBuyOrders, getPartialBuyOrders } from './reconciliation.js'
import { runtimeConfig } from './runtime-config.js'
import { ExchangeUnavailableError } from './errors.js'

type Balances = Awaited<ReturnType<typeof getBalances>>

function getAvailableGrcBalance(balances: Balances): number {
  const grc = balances.find((balance) => balance.asset === 'GRC')
  return grc ? Number(grc.available) : 0
}

function printCheck(label: string, ok: boolean, detail?: string): void {
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${label}${detail ? ` | ${detail}` : ''}`)
}

async function main(): Promise<void> {
  console.log('Running live readiness check...\n')

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

  const activeBuyOrders = getActiveBuyOrders(orders)
  const partialBuyOrders = getPartialBuyOrders(orders)
  const availableGrc = getAvailableGrcBalance(balances)

  console.log('--- Snapshot ---')
  console.log(snapshot)

  console.log('\n--- Signal ---')
  console.log(signal)

  console.log('\n--- Strategy Plan ---')
  console.log(plan)

  console.log('\n--- Runtime Config ---')
  console.log(`Dry run: ${runtimeConfig.dryRun}`)
  console.log(`Trading enabled: ${runtimeConfig.tradingEnabled}`)
  console.log(`Live confirmation: ${runtimeConfig.liveConfirmation}`)
  console.log(`Max GRC per order: ${runtimeConfig.maxGrcPerOrder}`)
  console.log(`Cooldown: ${runtimeConfig.cooldownMs / 1000}s`)
  console.log(`Strategy: ${runtimeConfig.strategyName}`)
  console.log(`Min private score: ${runtimeConfig.minPrivateScore}`)
  console.log(`Max trade age: ${runtimeConfig.maxTradeAgeMs / 1000}s`)
  console.log(`Max open buy orders: ${runtimeConfig.maxOpenBuyOrders}`)
  console.log(`Min spread: ${runtimeConfig.minSpread}`)
  console.log(`Target spread: ${runtimeConfig.targetSpread}`)
  console.log(`Min top book amount: ${runtimeConfig.minTopBookAmount}`)
  console.log(`Target top book amount: ${runtimeConfig.targetTopBookAmount}`)
  console.log(`Max ask distance from last trade: ${runtimeConfig.maxAskDistanceFromLastTrade}`)
  console.log(`Max bid distance from last trade: ${runtimeConfig.maxBidDistanceFromLastTrade}`)
  console.log(`Max spread: ${runtimeConfig.maxSpread}`)

  console.log('\n--- Readiness Checks ---')

  const checks = [
    {
      label: 'Dry run disabled',
      ok: !runtimeConfig.dryRun,
      detail: `dryRun=${runtimeConfig.dryRun}`,
    },
    {
      label: 'Trading enabled',
      ok: runtimeConfig.tradingEnabled,
      detail: `tradingEnabled=${runtimeConfig.tradingEnabled}`,
    },
    {
    label: 'Live confirmation enabled',
    ok: runtimeConfig.liveConfirmation,
    detail: `liveConfirmation=${runtimeConfig.liveConfirmation}`,
    },
    {
      label: 'Wallets online',
      ok:
        walletStatus.online &&
        !!walletStatus.assets.GRC?.online &&
        !!walletStatus.assets.CURE?.online,
      detail: `exchange=${walletStatus.online} grc=${walletStatus.assets.GRC?.online ?? false} cure=${walletStatus.assets.CURE?.online ?? false}`,
    },
    {
      label: 'Signal is candidate',
      ok: signal.state === 'candidate' && signal.shouldTrade,
      detail: `state=${signal.state} score=${signal.score}`,
    },
    {
      label: 'No active buy orders',
      ok: activeBuyOrders.length === 0,
      detail: `count=${activeBuyOrders.length}`,
    },
    {
      label: 'No partial buy orders',
      ok: partialBuyOrders.length === 0,
      detail: `count=${partialBuyOrders.length}`,
    },
    {
      label: 'Strategy wants a place_buy action',
      ok: plan.action === 'place_buy',
      detail: `action=${plan.action}`,
    },
    {
      label: 'Enough GRC for one tiny order',
      ok: availableGrc >= runtimeConfig.maxGrcPerOrder,
      detail: `available=${availableGrc.toFixed(8)} cap=${runtimeConfig.maxGrcPerOrder.toFixed(8)}`,
    },
  ]

  for (const check of checks) {
    printCheck(check.label, check.ok, check.detail)
  }

  const liveReady = checks.every((check) => check.ok)

  console.log('\n--- Verdict ---')
  console.log(`LIVE READY: ${liveReady ? 'yes' : 'no'}`)

  if (!liveReady) {
    console.log('Reason: one or more readiness checks failed.')
  }
}

main().catch((err) => {
  if (err instanceof ExchangeUnavailableError) {
    console.log('\n--- Verdict ---')
    console.log('LIVE READY: no')
    console.log('Reason: exchange unavailable (HeliEx unavailable: Cloudflare tunnel error)')
    process.exit(1)
  }

  console.error('Live readiness check failed:')
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})