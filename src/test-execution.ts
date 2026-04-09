import 'dotenv/config'
import { getOrderBook, getTrades, getWalletStatus } from './api.js'
import { getMyOrders } from './private-api.js'
import { buildMarketSnapshot } from './market.js'
import { evaluateSignal } from './signals.js'
import { buildExecutionPlan } from './execution.js'

async function main(): Promise<void> {
  console.log('Testing dry-run execution...\n')

  const [orderBook, trades, walletStatus, orders] = await Promise.all([
    getOrderBook(),
    getTrades(),
    getWalletStatus(),
    getMyOrders(),
  ])

  const snapshot = buildMarketSnapshot(orderBook, trades)
  const signal = evaluateSignal(snapshot, walletStatus)
  const plan = buildExecutionPlan(snapshot, signal, orders)

  console.log('--- Snapshot ---')
  console.log(snapshot)

  console.log('\n--- Signal ---')
  console.log(signal)

  console.log('\n--- Existing Orders ---')
  console.log(orders)

  console.log('\n--- Execution Plan ---')
  console.log(plan)
}

main().catch((err) => {
  console.error('Dry-run execution test failed:')
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})