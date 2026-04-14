import 'dotenv/config'
import { AltQuickAdapter } from '../venues/altquick/adapter.js'
import { CoinbaseAdapter } from '../venues/coinbase/adapter.js'
import { SafeTradeAdapter } from '../venues/safetrade/adapter.js'

async function main(): Promise<void> {
  const venues = [
    new SafeTradeAdapter(),
    new AltQuickAdapter(),
    new CoinbaseAdapter(),
  ]

  const tickers = []
  const errors: Array<{ venue: string; market: string; message: string }> = []

  for (const venue of venues) {
    const marketInfos = await venue.getMarkets()

    for (const marketInfo of marketInfos) {
      try {
        const ticker = await venue.getTicker(marketInfo.market)
        tickers.push(ticker)
      } catch (error) {
        errors.push({
          venue: venue.name,
          market: marketInfo.market.symbol,
          message: error instanceof Error ? error.message : 'Unknown scanner error',
        })
      }
    }
  }

  console.log('--- Normalized Tickers ---')
  for (const ticker of tickers) {
    console.log({
      venue: ticker.venue,
      market: ticker.market.symbol,
      bid: ticker.bid,
      ask: ticker.ask,
      last: ticker.last,
      timestamp: ticker.timestamp,
    })
  }

  if (errors.length > 0) {
    console.log('\n--- Scanner Errors ---')
    for (const error of errors) {
      console.log(error)
    }
  }
}

main().catch((error) => {
  console.error('scan-markets failed')
  console.error(error)
  process.exit(1)
})