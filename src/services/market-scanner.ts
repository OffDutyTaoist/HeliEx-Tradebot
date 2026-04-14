import type { CanonicalMarket } from '../domain/markets.js'
import type { MarketTicker, TradingVenue, VenueMarketInfo } from '../venues/types.js'
import type { ScannedTicker, VenueStatus } from '../core/market-graph.js'

export interface ScanResult {
  scanned: ScannedTicker[]
  tickers: MarketTicker[]
  errors: Array<{
    venue: string
    market: string
    message: string
  }>
}

function classifyStatus(message: string): VenueStatus {
  const lower = message.toLowerCase()

  if (
    lower.includes('blocked by cloudflare') ||
    lower.includes('rate limited') ||
    lower.includes('forbidden') ||
    lower.includes('unauthorized')
  ) {
    return 'degraded'
  }

  if (
    lower.includes('endpoint not found') ||
    lower.includes('symbol mapping missing') ||
    lower.includes('not implemented')
  ) {
    return 'unresolved'
  }

  return 'degraded'
}

function marketKey(market: CanonicalMarket): string {
  return market.symbol
}

export async function scanMarkets(
  venues: TradingVenue[],
  trackedMarkets: CanonicalMarket[],
): Promise<ScanResult> {
  const scanned: ScannedTicker[] = []
  const tickers: MarketTicker[] = []
  const errors: ScanResult['errors'] = []

  const trackedKeys = new Set(trackedMarkets.map(marketKey))

  for (const venue of venues) {
    let venueMarkets: VenueMarketInfo[] = []

    try {
      venueMarkets = await venue.getMarkets()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown market discovery error'

      errors.push({
        venue: venue.name,
        market: '*',
        message,
      })
      continue
    }

    const supportedTrackedMarkets = venueMarkets.filter(
      (info) => info.enabled && trackedKeys.has(info.market.symbol)
    )

    for (const info of supportedTrackedMarkets) {
      try {
        const ticker = await venue.getTicker(info.market)
        tickers.push(ticker)
        scanned.push({ ticker, status: 'ok' })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown scanner error'

        errors.push({
          venue: venue.name,
          market: info.market.symbol,
          message,
        })
      }
    }
  }

  return { scanned, tickers, errors }
}

export { classifyStatus }