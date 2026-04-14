import { ASSETS } from '../../domain/assets.js'
import type { CanonicalMarket } from '../../domain/markets.js'

const CANONICAL_TO_ALTQUICK: Record<string, string> = {
  'CURE/BTC': 'CURE-BTC',
}

const ALTQUICK_TO_CANONICAL: Record<string, CanonicalMarket> = {
  'CURE-BTC': {
    base: ASSETS.CURE,
    quote: ASSETS.BTC,
    symbol: 'CURE/BTC',
  },
}

export function toAltQuickSymbol(market: CanonicalMarket): string {
  const symbol = CANONICAL_TO_ALTQUICK[market.symbol]
  if (!symbol) {
    throw new Error(`AltQuick symbol mapping missing for ${market.symbol}`)
  }
  return symbol
}

export function fromAltQuickSymbol(symbol: string): CanonicalMarket {
  const market = ALTQUICK_TO_CANONICAL[symbol.toUpperCase()]
  if (!market) {
    throw new Error(`Unsupported AltQuick market symbol: ${symbol}`)
  }
  return market
}

export function listAltQuickMarkets(): CanonicalMarket[] {
  return Object.values(ALTQUICK_TO_CANONICAL)
}