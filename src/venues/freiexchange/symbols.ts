import { ASSETS } from '../../domain/assets.js'
import type { CanonicalMarket } from '../../domain/markets.js'

const CANONICAL_TO_FREIEXCHANGE: Record<string, string> = {
  'GRC/BTC': 'GRC',
}

const FREIEXCHANGE_TO_CANONICAL: Record<string, CanonicalMarket> = {
  GRC: {
    base: ASSETS.GRC,
    quote: ASSETS.BTC,
    symbol: 'GRC/BTC',
  },
}

export function toFreiExchangeSymbol(market: CanonicalMarket): string {
  const symbol = CANONICAL_TO_FREIEXCHANGE[market.symbol]
  if (!symbol) {
    throw new Error(`FreiExchange symbol mapping missing for ${market.symbol}`)
  }
  return symbol
}

export function fromFreiExchangeSymbol(symbol: string): CanonicalMarket {
  const market = FREIEXCHANGE_TO_CANONICAL[symbol.toUpperCase()]
  if (!market) {
    throw new Error(`Unsupported FreiExchange market symbol: ${symbol}`)
  }
  return market
}

export function listFreiExchangeMarkets(): CanonicalMarket[] {
  return Object.values(FREIEXCHANGE_TO_CANONICAL)
}