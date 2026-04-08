import 'dotenv/config'
import { config } from './config.js'
import { apiGet } from './api.js'
import { getOrderBook, getTrades } from './api.js'

async function main(): Promise<void> {
  console.log('Fetching market data...\n')

  const orderbook = await getOrderBook()
  const trades = await getTrades()

  const bestBid = orderbook.bids[0]
  const bestAsk = orderbook.asks[0]

  const lastTrade = trades[0]

  console.log('--- Market Snapshot ---')
  console.log(`Best Bid: ${bestBid.price} (${bestBid.amount})`)
  console.log(`Best Ask: ${bestAsk.price} (${bestAsk.amount})`)

  console.log(`Spread: ${(bestAsk.price - bestBid.price).toFixed(8)}`)

  console.log('\n--- Last Trade ---')
  console.log(`Price: ${lastTrade.price}`)
  console.log(`Amount: ${lastTrade.amount}`)
  console.log(`Time: ${lastTrade.created_at}`)
}

/* async function main(): Promise<void> {
  console.log('Env loaded successfully')

  const paths = [
    '/api',
    '/api/trades',
    '/api/orderbook',
    '/api/markets',
    '/api/ticker',
    '/api/wallet_status'
  ]

  for (const path of paths) {
    try {
      console.log(`\n--- Testing ${path} ---`)
      const result = await apiGet(path)
      console.log(result)
    } catch (err) {
      console.error(`Failed: ${path}`)
      console.error(err instanceof Error ? err.message : err)
    }
  }
} */

main().catch((error) => {
  console.error('Startup failed:')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})