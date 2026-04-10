import { getLastActionTime, setLastActionTime } from './runtime-state.js'
import { PrivateStrategy } from './strategy/private-strategy.js'
import 'dotenv/config'
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


const DRY_RUN = true
const MAX_GRC_PER_ORDER = 1.0
const COOLDOWN_MS = 30 * 1000
const TRADING_ENABLED = process.env.TRADING_ENABLED === 'true'

function getAvailableGrcBalance(balances: Balance[]): number {
  const grc = balances.find((balance) => balance.asset === 'GRC')
  return grc ? Number(grc.available) : 0
}

function canActNow(): { allowed: boolean; reason?: string } {
  const lastActionTime = getLastActionTime()
  const elapsed = Date.now() - lastActionTime

  if (lastActionTime > 0 && elapsed < COOLDOWN_MS) {
    return {
      allowed: false,
      reason: `Cooldown active (${Math.ceil((COOLDOWN_MS - elapsed) / 1000)}s remaining)`,
    }
  }

  return { allowed: true }
}

async function main(): Promise<void> {
  console.log('Running execution cycle...\n')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Max GRC per order: ${MAX_GRC_PER_ORDER}\n`)

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

  const actionCheck = canActNow()

if (
  (plan.action === 'place_buy' || plan.action === 'replace_existing') &&
  !actionCheck.allowed
) {
  console.log(`\nBlocked: ${actionCheck.reason}`)
  return
}

if (
  (plan.action === 'place_buy' || plan.action === 'replace_existing') &&
  !DRY_RUN &&
  !TRADING_ENABLED
) {
  console.log('\nBlocked: live trading disabled (set TRADING_ENABLED=true to enable)')
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

      if (cost > MAX_GRC_PER_ORDER) {
        console.log(
          `Blocked: order cost ${cost.toFixed(8)} exceeds cap of ${MAX_GRC_PER_ORDER.toFixed(8)} GRC`
        )
        return
      }

      if (cost > availableGrc) {
        console.log(
          `Blocked: order cost ${cost.toFixed(8)} exceeds available GRC balance`
        )
        return
      }

      if (DRY_RUN) {
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

      if (cost > MAX_GRC_PER_ORDER) {
        console.log(
          `Blocked: replacement cost ${cost.toFixed(8)} exceeds cap of ${MAX_GRC_PER_ORDER.toFixed(8)} GRC`
        )
        return
      }

      if (cost > availableGrc) {
        console.log(
          `Blocked: replacement cost ${cost.toFixed(8)} exceeds available GRC balance`
        )
        return
      }

      if (DRY_RUN) {
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
  console.error('Execution cycle failed:')
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})