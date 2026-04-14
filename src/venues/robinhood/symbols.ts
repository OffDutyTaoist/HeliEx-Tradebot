import { ASSETS } from '../../domain/assets.js'
import type { CanonicalMarket } from '../../domain/markets.js'

const CANONICAL_TO_ROBINHOOD: Record<string, string> = {
  'BTC/USD': 'BTC-USD',
}

const ROBINHOOD_TO_CANONICAL: Record<string, CanonicalMarket> = {
  'BTC-USD': {
    base: ASSETS.BTC,
    quote: ASSETS.USD,
    symbol: 'BTC/USD',
  },
}

export function toRobinhoodSymbol(market: CanonicalMarket): string {
  const symbol = CANONICAL_TO_ROBINHOOD[market.symbol]
  if (!symbol) {
    throw new Error(`Robinhood symbol mapping missing for ${market.symbol}`)
  }
  return symbol
}

export function fromRobinhoodSymbol(symbol: string): CanonicalMarket {
  const market = ROBINHOOD_TO_CANONICAL[symbol.toUpperCase()]
  if (!market) {
    throw new Error(`Unsupported Robinhood market symbol: ${symbol}`)
  }
  return market
}

export function listRobinhoodMarkets(): CanonicalMarket[] {
  return Object.values(ROBINHOOD_TO_CANONICAL)
}