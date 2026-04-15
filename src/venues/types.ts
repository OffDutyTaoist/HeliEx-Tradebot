import type { CanonicalMarket } from '../domain/markets.js'

export type VenueName =
  | 'heliex'
  | 'safetrade'
  | 'altquick'
  | 'coinbase'
  | 'robinhood'

export type VenueCapability =
  | 'public_market_data'
  | 'private_read'
  | 'execution'

export interface OrderBookLevel {
  price: number
  amount: number
}

export interface MarketTicker {
  venue: VenueName
  market: CanonicalMarket
  bid: number | null
  ask: number | null
  last: number | null
  timestamp: string
  minAmount?: number | null
  maxAmount?: number | null
}

export interface VenueOrderBook {
  venue: VenueName
  market: CanonicalMarket
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  timestamp: string
}

export interface VenueMarketInfo {
  venue: VenueName
  market: CanonicalMarket
  nativeSymbol: string
  enabled: boolean
}

export interface TradingVenue {
  readonly name: VenueName
  readonly capabilities: VenueCapability[]

  ping(): Promise<void>
  getMarkets(): Promise<VenueMarketInfo[]>
  getTicker(market: CanonicalMarket): Promise<MarketTicker>
  getOrderBook(market: CanonicalMarket): Promise<VenueOrderBook>
}