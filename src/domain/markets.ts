import type { Asset } from './assets.js'

export interface CanonicalMarket {
  base: Asset | string
  quote: Asset | string
  symbol: string
}

export function makeMarket(base: Asset | string, quote: Asset | string): CanonicalMarket {
  return {
    base,
    quote,
    symbol: `${base}/${quote}`,
  }
}