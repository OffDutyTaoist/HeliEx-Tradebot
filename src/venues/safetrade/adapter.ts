import type { CanonicalMarket } from '../../domain/markets.js'
import type {
  MarketTicker,
  TradingVenue,
  VenueCapability,
  VenueMarketInfo,
  VenueName,
  VenueOrderBook,
} from '../types.js'
import {
  listSafeTradeMarkets,
  toSafeTradeSymbol,
} from './symbols.js'

interface SafeTradeTickerResponse {
  bid?: string | number
  ask?: string | number
  last?: string | number
  updated_at?: string | number
  timestamp?: string | number
}

interface SafeTradeOrderBookLevel {
  price?: string | number
  amount?: string | number
}

interface SafeTradeOrderBookResponse {
  bids?: Array<[string | number, string | number]> | SafeTradeOrderBookLevel[]
  asks?: Array<[string | number, string | number]> | SafeTradeOrderBookLevel[]
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function normalizeTimestamp(value: unknown): string {
  if (typeof value === 'string' && value.trim() !== '') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toISOString()
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 10_000_000_000 ? value : value * 1000
    return new Date(ms).toISOString()
  }

  return new Date().toISOString()
}

function parseOrderBookSide(
  levels: Array<[string | number, string | number]> | SafeTradeOrderBookLevel[] | undefined,
) {
  if (!levels) return []

  return levels
    .map((level) => {
      if (Array.isArray(level)) {
        const [priceRaw, amountRaw] = level
        const price = toNumber(priceRaw)
        const amount = toNumber(amountRaw)
        if (price === null || amount === null) return null
        return { price, amount }
      }

      const price = toNumber(level.price)
      const amount = toNumber(level.amount)
      if (price === null || amount === null) return null
      return { price, amount }
    })
    .filter((level): level is { price: number; amount: number } => level !== null)
}

function classifySafeTradeHttpError(status: number, body: string): string {
  const lowerBody = body.toLowerCase()

  if (
    status === 403 &&
    (
      lowerBody.includes('cloudflare') ||
      lowerBody.includes('attention required') ||
      lowerBody.includes('please enable cookies') ||
      lowerBody.includes('sorry, you have been blocked')
    )
  ) {
    return 'SafeTrade blocked by Cloudflare'
  }

  return `SafeTrade request failed with status ${status}`
}

export class SafeTradeAdapter implements TradingVenue {
  readonly name: VenueName = 'safetrade'
  readonly capabilities: VenueCapability[] = ['public_market_data']

  constructor(
    private readonly baseUrl = process.env.SAFETRADE_BASE_URL ?? 'https://safe.trade/api/v2',
  ) {}

  async ping(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/markets`)
    if (!response.ok) {
      throw new Error(`SafeTrade ping failed with status ${response.status}`)
    }
  }

  async getMarkets(): Promise<VenueMarketInfo[]> {
    return listSafeTradeMarkets().map((market) => ({
      venue: this.name,
      market,
      nativeSymbol: toSafeTradeSymbol(market),
      enabled: true,
    }))
  }

  async getTicker(market: CanonicalMarket): Promise<MarketTicker> {
    const nativeSymbol = toSafeTradeSymbol(market)
    const response = await fetch(`${this.baseUrl}/tickers/${nativeSymbol}`)

    if (!response.ok) {
    const body = await response.text()
    const reason = classifySafeTradeHttpError(response.status, body)
    throw new Error(`${reason} for ${market.symbol}`)
    }

    const data = (await response.json()) as SafeTradeTickerResponse

    return {
      venue: this.name,
      market,
      bid: toNumber(data.bid),
      ask: toNumber(data.ask),
      last: toNumber(data.last),
      timestamp: normalizeTimestamp(data.updated_at ?? data.timestamp),
    }
  }

  async getOrderBook(market: CanonicalMarket): Promise<VenueOrderBook> {
    const nativeSymbol = toSafeTradeSymbol(market)
    const response = await fetch(`${this.baseUrl}/order_book?market=${nativeSymbol}`)

    if (!response.ok) {
    const body = await response.text()
    const reason = classifySafeTradeHttpError(response.status, body)
    throw new Error(`${reason} for ${market.symbol}`)
    }

    const data = (await response.json()) as SafeTradeOrderBookResponse

    return {
      venue: this.name,
      market,
      bids: parseOrderBookSide(data.bids),
      asks: parseOrderBookSide(data.asks),
      timestamp: new Date().toISOString(),
    }
  }
}