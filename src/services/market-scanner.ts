import type { CanonicalMarket } from '../domain/markets.js'
import type { MarketTicker, TradingVenue } from '../venues/types.js'

export interface ScanResult {
  tickers: MarketTicker[]
  errors: Array<{
    venue: string
    market: string
    message: string
  }>
}

export async function scanMarkets(
  venues: TradingVenue[],
  markets: CanonicalMarket[],
): Promise<ScanResult> {
  const tickers: MarketTicker[] = []
  const errors: ScanResult['errors'] = []

  for (const venue of venues) {
    for (const market of markets) {
      try {
        const ticker = await venue.getTicker(market)
        tickers.push(ticker)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown scanner error'

        errors.push({
          venue: venue.name,
          market: market.symbol,
          message,
        })
      }
    }
  }

  return { tickers, errors }
}