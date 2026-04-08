import 'dotenv/config'
import { config } from './config.js'
import { apiGet } from './api.js'

async function main(): Promise<void> {
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
}

main().catch((error) => {
  console.error('Startup failed:')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})