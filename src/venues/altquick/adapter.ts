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
  listAltQuickMarkets,
  toAltQuickSymbol,
} from './symbols.js'

interface AltQuickTickerResponse {
  bid?: string | number
  ask?: string | number
  last?: string | number
  updated_at?: string | number
  timestamp?: string | number
}

interface AltQuickOrderBookLevel {
  price?: string | number
  amount?: string | number
}

interface AltQuickOrderBookResponse {
  bids?: Array<[string | number, string | number]> | AltQuickOrderBookLevel[]
  asks?: Array<[string | number, string | number]> | AltQuickOrderBookLevel[]
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
  levels: Array<[string | number, string | number]> | AltQuickOrderBookLevel[] | undefined,
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

function classifyAltQuickHttpError(status: number, body: string): string {
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
    return 'AltQuick blocked by Cloudflare'
  }

  if (status === 404) {
    return 'AltQuick endpoint not found'
  }

  return `AltQuick request failed with status ${status}`
}

export class AltQuickAdapter implements TradingVenue {
  readonly name: VenueName = 'altquick'
  readonly capabilities: VenueCapability[] = ['public_market_data']

  constructor(
    private readonly baseUrl = process.env.ALTQUICK_BASE_URL ?? 'https://altquick.com/api/v2',
  ) {}

  async ping(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/markets`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HeliEx-Tradebot/1.0 (+local development)',
      },
    })

    if (!response.ok) {
      const body = await response.text()
      const reason = classifyAltQuickHttpError(response.status, body)
      throw new Error(reason)
    }
  }

  async getMarkets(): Promise<VenueMarketInfo[]> {
    return listAltQuickMarkets().map((market) => ({
      venue: this.name,
      market,
      nativeSymbol: toAltQuickSymbol(market),
      enabled: true,
    }))
  }

  async getTicker(market: CanonicalMarket): Promise<MarketTicker> {
    const nativeSymbol = toAltQuickSymbol(market)
    const response = await fetch(`${this.baseUrl}/ticker/${nativeSymbol}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HeliEx-Tradebot/1.0 (+local development)',
      },
    })

    if (!response.ok) {
      const body = await response.text()
      const reason = classifyAltQuickHttpError(response.status, body)
      throw new Error(`${reason} for ${market.symbol}`)
    }

    const data = (await response.json()) as AltQuickTickerResponse

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
    const nativeSymbol = toAltQuickSymbol(market)
    const response = await fetch(`${this.baseUrl}/order_book?market=${nativeSymbol}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HeliEx-Tradebot/1.0 (+local development)',
      },
    })

    if (!response.ok) {
      const body = await response.text()
      const reason = classifyAltQuickHttpError(response.status, body)
      throw new Error(`${reason} for ${market.symbol}`)
    }

    const data = (await response.json()) as AltQuickOrderBookResponse

    return {
      venue: this.name,
      market,
      bids: parseOrderBookSide(data.bids),
      asks: parseOrderBookSide(data.asks),
      timestamp: new Date().toISOString(),
    }
  }
}