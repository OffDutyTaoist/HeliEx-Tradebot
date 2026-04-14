import { ASSETS } from '../../domain/assets.js'
import type { CanonicalMarket } from '../../domain/markets.js'

const CANONICAL_TO_SAFETRADE: Record<string, string> = {
  'GRC/BTC': 'GRC_BTC',
  'GRC/USDT': 'GRC_USDT',
}

const SAFETRADE_TO_CANONICAL: Record<string, CanonicalMarket> = {
  GRC_BTC: {
    base: ASSETS.GRC,
    quote: ASSETS.BTC,
    symbol: 'GRC/BTC',
  },
  GRC_USDT: {
    base: ASSETS.GRC,
    quote: ASSETS.USDT,
    symbol: 'GRC/USDT',
  },
}

export function toSafeTradeSymbol(market: CanonicalMarket): string {
  const symbol = CANONICAL_TO_SAFETRADE[market.symbol]
  if (!symbol) {
    throw new Error(`SafeTrade symbol mapping missing for ${market.symbol}`)
  }
  return symbol
}

export function fromSafeTradeSymbol(symbol: string): CanonicalMarket {
  const market = SAFETRADE_TO_CANONICAL[symbol.toUpperCase()]
  if (!market) {
    throw new Error(`Unsupported SafeTrade market symbol: ${symbol}`)
  }
  return market
}

export function listSafeTradeMarkets(): CanonicalMarket[] {
  return Object.values(SAFETRADE_TO_CANONICAL)
}