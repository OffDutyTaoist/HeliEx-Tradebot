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
  listCoinbaseMarkets,
  toCoinbaseSymbol,
} from './symbols.js'

interface CoinbaseTickerResponse {
  ask?: string
  bid?: string
  price?: string
  time?: string
  volume?: string
}

interface CoinbaseOrderBookResponse {
  bids?: string[][]
  asks?: string[][]
  sequence?: number
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

  return new Date().toISOString()
}

function parseOrderBookSide(levels: string[][] | undefined) {
  if (!levels) return []

  return levels
    .map((level) => {
      const price = toNumber(level[0])
      const amount = toNumber(level[1])

      if (price === null || amount === null) return null
      return { price, amount }
    })
    .filter((level): level is { price: number; amount: number } => level !== null)
}

function classifyCoinbaseHttpError(status: number, body: string): string {
  const lowerBody = body.toLowerCase()

  if (status === 404) {
    return 'Coinbase endpoint or product not found'
  }

  if (status === 429) {
    return 'Coinbase rate limited request'
  }

  if (lowerBody.includes('cloudflare')) {
    return 'Coinbase request blocked upstream'
  }

  return `Coinbase request failed with status ${status}`
}

export class CoinbaseAdapter implements TradingVenue {
  readonly name: VenueName = 'coinbase'
  readonly capabilities: VenueCapability[] = ['public_market_data']

  constructor(
    private readonly baseUrl = process.env.COINBASE_BASE_URL ?? 'https://api.exchange.coinbase.com',
  ) {}

  async ping(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/products`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HeliEx-Tradebot/1.0 (+local development)',
      },
    })

    if (!response.ok) {
      const body = await response.text()
      const reason = classifyCoinbaseHttpError(response.status, body)
      throw new Error(reason)
    }
  }

  async getMarkets(): Promise<VenueMarketInfo[]> {
    return listCoinbaseMarkets().map((market) => ({
      venue: this.name,
      market,
      nativeSymbol: toCoinbaseSymbol(market),
      enabled: true,
    }))
  }

  async getTicker(market: CanonicalMarket): Promise<MarketTicker> {
    const nativeSymbol = toCoinbaseSymbol(market)
    const response = await fetch(`${this.baseUrl}/products/${nativeSymbol}/ticker`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HeliEx-Tradebot/1.0 (+local development)',
      },
    })

    if (!response.ok) {
      const body = await response.text()
      const reason = classifyCoinbaseHttpError(response.status, body)
      throw new Error(`${reason} for ${market.symbol}`)
    }

    const data = (await response.json()) as CoinbaseTickerResponse

    return {
      venue: this.name,
      market,
      bid: toNumber(data.bid),
      ask: toNumber(data.ask),
      last: toNumber(data.price),
      timestamp: normalizeTimestamp(data.time),
    }
  }

  async getOrderBook(market: CanonicalMarket): Promise<VenueOrderBook> {
    const nativeSymbol = toCoinbaseSymbol(market)
    const response = await fetch(`${this.baseUrl}/products/${nativeSymbol}/book?level=2`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HeliEx-Tradebot/1.0 (+local development)',
      },
    })

    if (!response.ok) {
      const body = await response.text()
      const reason = classifyCoinbaseHttpError(response.status, body)
      throw new Error(`${reason} for ${market.symbol}`)
    }

    const data = (await response.json()) as CoinbaseOrderBookResponse

    return {
      venue: this.name,
      market,
      bids: parseOrderBookSide(data.bids),
      asks: parseOrderBookSide(data.asks),
      timestamp: new Date().toISOString(),
    }
  }
}