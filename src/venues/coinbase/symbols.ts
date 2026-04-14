import { ASSETS } from '../../domain/assets.js'
import type { CanonicalMarket } from '../../domain/markets.js'

const CANONICAL_TO_COINBASE: Record<string, string> = {
  'BTC/USD': 'BTC-USD',
}

const COINBASE_TO_CANONICAL: Record<string, CanonicalMarket> = {
  'BTC-USD': {
    base: ASSETS.BTC,
    quote: ASSETS.USD,
    symbol: 'BTC/USD',
  },
}

export function toCoinbaseSymbol(market: CanonicalMarket): string {
  const symbol = CANONICAL_TO_COINBASE[market.symbol]
  if (!symbol) {
    throw new Error(`Coinbase symbol mapping missing for ${market.symbol}`)
  }
  return symbol
}

export function fromCoinbaseSymbol(symbol: string): CanonicalMarket {
  const market = COINBASE_TO_CANONICAL[symbol.toUpperCase()]
  if (!market) {
    throw new Error(`Unsupported Coinbase market symbol: ${symbol}`)
  }
  return market
}

export function listCoinbaseMarkets(): CanonicalMarket[] {
  return Object.values(COINBASE_TO_CANONICAL)
}