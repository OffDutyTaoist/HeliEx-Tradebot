import 'dotenv/config'
import { getLastActionTime, setLastActionTime } from './runtime-state.js'
import { PrivateStrategy } from './strategy/private-strategy.js'
import { getOrderBook, getTrades, getWalletStatus } from './api.js'
import {
  getBalances,
  getMyOrders,
  placeOrder,
  cancelOrder,
  type Balance,
} from './private-api.js'
import { buildMarketSnapshot } from './market.js'
import { evaluateSignal } from './signals.js'
import { calculateOrderCost } from './execution.js'
import {
  getActiveBuyOrders,
  getOpenBuyOrders,
  getPartialBuyOrders,
} from './reconciliation.js'
import { runtimeConfig } from './runtime-config.js'
import { ExchangeUnavailableError } from './errors.js'

function getAvailableGrcBalance(balances: Balance[]): number {
  const grc = balances.find((balance) => balance.asset === 'GRC')
  return grc ? Number(grc.available) : 0
}

function logEntryGeometry(
  plan:
    | { action: 'place_buy'; price: string; amount: string }
    | { action: 'replace_existing'; newPrice: string; newAmount: string }
    | { action: string },
  snapshot: {
    bestAsk: number
    spread: number
    lastTradePrice: number | null
  }
): void {
  if (plan.action !== 'place_buy' && plan.action !== 'replace_existing') {
    console.log('\n--- Entry Geometry ---')
    console.log('No entry geometry available because no actionable order was produced.')
    return
  }

  const targetPrice =
    plan.action === 'place_buy' ? Number(plan.price) : Number(plan.newPrice)
  const targetAmount =
    plan.action === 'place_buy' ? Number(plan.amount) : Number(plan.newAmount)

  const orderCost = calculateOrderCost(
    targetPrice.toFixed(8),
    targetAmount.toFixed(8)
  )

  const askDistance =
    snapshot.lastTradePrice === null
      ? null
      : snapshot.bestAsk - snapshot.lastTradePrice

  const wouldCross = targetPrice >= snapshot.bestAsk

  console.log('\n--- Entry Geometry ---')
  console.log(`Target buy price: ${targetPrice.toFixed(8)}`)
  console.log(`Best ask: ${snapshot.bestAsk.toFixed(8)}`)
  console.log(`Spread: ${snapshot.spread.toFixed(8)}`)

  if (askDistance === null) {
    console.log('Ask distance from last trade: n/a')
  } else {
    console.log(`Ask distance from last trade: ${askDistance.toFixed(8)}`)
  }

  console.log(`Order amount: ${targetAmount.toFixed(8)} CURE`)
  console.log(`Order cost: ${orderCost.toFixed(8)} GRC`)
  console.log(`Classification: ${wouldCross ? 'crossing' : 'resting'}`)
}

function canActNow(): { allowed: boolean; reason?: string } {
  const lastActionTime = getLastActionTime()
  const elapsed = Date.now() - lastActionTime

  if (lastActionTime > 0 && elapsed < runtimeConfig.cooldownMs) {
    return {
      allowed: false,
      reason: `Cooldown active (${Math.ceil((runtimeConfig.cooldownMs - elapsed) / 1000)}s remaining)`,
    }
  }

  return { allowed: true }
}

function logPreflight(): void {
  console.log('--- Preflight ---')
  console.log(`Mode: ${runtimeConfig.dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Trading enabled: ${runtimeConfig.tradingEnabled ? 'yes' : 'no'}`)
  console.log(`Live confirmation: ${runtimeConfig.liveConfirmation ? 'yes' : 'no'}`)
  console.log(`Max GRC per order: ${runtimeConfig.maxGrcPerOrder}`)
  console.log(`Cooldown: ${runtimeConfig.cooldownMs / 1000}s`)
  console.log(`Strategy: ${runtimeConfig.strategyName}`)
  console.log(`Min private score: ${runtimeConfig.minPrivateScore}`)
  console.log(`Max trade age: ${runtimeConfig.maxTradeAgeMs / 1000}s`)
  console.log(`Max open buy orders: ${runtimeConfig.maxOpenBuyOrders}`)

  if (!runtimeConfig.dryRun && runtimeConfig.tradingEnabled) {
    console.log('WARNING: LIVE TRADING IS ENABLED')
  }
}

async function main(): Promise<void> {
  console.log('Running execution cycle...\n')
  logPreflight()
  console.log('')

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
  const availableGrc = getAvailableGrcBalance(balances)
  const strategy = new PrivateStrategy()

  const plan = strategy.buildPlan({
    snapshot,
    signal,
    orders,
  })

  console.log('--- Snapshot ---')
  console.log(snapshot)

  console.log('\n--- Signal ---')
  console.log(signal)

  console.log('\n--- Balances ---')
  console.log(balances)

  console.log('\n--- Existing Orders ---')
  console.log(orders)

  console.log('\n--- Reconciliation View ---')
  console.log('Active buy orders:', getActiveBuyOrders(orders))
  console.log('Open buy orders:', getOpenBuyOrders(orders))
  console.log('Partial buy orders:', getPartialBuyOrders(orders))

  console.log('\n--- Execution Plan ---')
  console.log(plan)

  console.log('\n--- Decision Gate ---')
  console.log(`Action: ${plan.action}`)
  console.log(`Reason: ${'reason' in plan ? plan.reason : 'n/a'}`)

  logEntryGeometry(plan, snapshot)

  const actionCheck = canActNow()

  if (
  (plan.action === 'place_buy' || plan.action === 'replace_existing') &&
  !runtimeConfig.dryRun &&
  (!runtimeConfig.tradingEnabled || !runtimeConfig.liveConfirmation)
  ) {
    console.log(
      '\nBlocked: live trading confirmation not satisfied (requires TRADING_ENABLED=true and LIVE_CONFIRMATION=true)'
    )
    return
  }

  if (
    (plan.action === 'place_buy' || plan.action === 'replace_existing') &&
    !runtimeConfig.dryRun &&
    !runtimeConfig.tradingEnabled
  ) {
    console.log('\nBlocked: live trading disabled (set runtimeConfig.tradingEnabled=true to enable)')
    return
  }

  switch (plan.action) {
    case 'none': {
      console.log('\nNo action taken.')
      return
    }

    case 'keep_existing': {
      console.log(
        `\nKeeping existing buy order #${plan.orderId} at price ${plan.price}`
      )
      return
    }

    case 'place_buy': {
      const cost = calculateOrderCost(plan.price, plan.amount)

      console.log('\n--- Place Buy Check ---')
      console.log(`Price: ${plan.price}`)
      console.log(`Amount: ${plan.amount}`)
      console.log(`Cost: ${cost.toFixed(8)} GRC`)
      console.log(`Available GRC: ${availableGrc.toFixed(8)}`)

      if (cost > runtimeConfig.maxGrcPerOrder) {
        console.log(
          `Blocked: order cost ${cost.toFixed(8)} exceeds cap of ${runtimeConfig.maxGrcPerOrder.toFixed(8)} GRC`
        )
        return
      }

      if (cost > availableGrc) {
        console.log(
          `Blocked: order cost ${cost.toFixed(8)} exceeds available GRC balance`
        )
        return
      }

      if (runtimeConfig.dryRun) {
        console.log('\nDRY RUN: would place buy order now.')
        return
      }

      const placed = await placeOrder({
        side: 'buy',
        price: plan.price,
        amount: plan.amount,
      })

      setLastActionTime(Date.now())

      console.log('\n--- Buy Order Placed ---')
      console.log(placed)
      return
    }

    case 'replace_existing': {
      const cost = calculateOrderCost(plan.newPrice, plan.newAmount)

      console.log('\n--- Replace Buy Check ---')
      console.log(`Existing order id: ${plan.orderId}`)
      console.log(`New price: ${plan.newPrice}`)
      console.log(`New amount: ${plan.newAmount}`)
      console.log(`New cost: ${cost.toFixed(8)} GRC`)
      console.log(`Available GRC: ${availableGrc.toFixed(8)}`)

      if (cost > runtimeConfig.maxGrcPerOrder) {
        console.log(
          `Blocked: replacement cost ${cost.toFixed(8)} exceeds cap of ${runtimeConfig.maxGrcPerOrder.toFixed(8)} GRC`
        )
        return
      }

      if (cost > availableGrc) {
        console.log(
          `Blocked: replacement cost ${cost.toFixed(8)} exceeds available GRC balance`
        )
        return
      }

      if (runtimeConfig.dryRun) {
        console.log(
          `\nDRY RUN: would cancel order #${plan.orderId} and place replacement buy order.`
        )
        return
      }

      const cancelResult = await cancelOrder(plan.orderId)
      console.log('\n--- Cancel Result ---')
      console.log(cancelResult)

      const placed = await placeOrder({
        side: 'buy',
        price: plan.newPrice,
        amount: plan.newAmount,
      })

      setLastActionTime(Date.now())

      console.log('\n--- Replacement Buy Order Placed ---')
      console.log(placed)
      return
    }

    default: {
      const exhaustiveCheck: never = plan
      throw new Error(`Unhandled execution plan: ${JSON.stringify(exhaustiveCheck)}`)
    }
  }
}

main().catch((err) => {
  if (err instanceof ExchangeUnavailableError) {
    console.error('Execution cycle aborted: HeliEx unavailable (Cloudflare tunnel error).')
    process.exit(1)
  }

  console.error('Execution cycle failed:')
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})