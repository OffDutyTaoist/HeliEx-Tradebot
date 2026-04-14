import type { CanonicalMarket } from '../../domain/markets.js'
import type {
  MarketTicker,
  TradingVenue,
  VenueCapability,
  VenueMarketInfo,
  VenueName,
  VenueOrderBook,
} from '../types.js'
import { HELIEX_MARKETS } from './symbols.js'

interface HeliExOrderLevelResponse {
  price?: string
  amount?: string
}

interface HeliExOrderBookResponse {
  bids?: HeliExOrderLevelResponse[]
  asks?: HeliExOrderLevelResponse[]
}

interface HeliExTradeResponse {
  id?: number
  price?: string
  amount?: string
  side?: 'buy' | 'sell'
  created_at?: string
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

function parseOrderLevels(
  levels: HeliExOrderLevelResponse[] | undefined
): Array<{ price: number; amount: number }> {
  if (!levels) return []

  return levels
    .map((level) => {
      const price = toNumber(level.price)
      const amount = toNumber(level.amount)

      if (price === null || amount === null) return null
      return { price, amount }
    })
    .filter((level): level is { price: number; amount: number } => level !== null)
}

function classifyHeliExHttpError(status: number, body: string): string {
  const lowerBody = body.toLowerCase()

  if (status === 404) {
    return 'HeliEx endpoint not found'
  }

  if (status === 429) {
    return 'HeliEx rate limited request'
  }

  if (lowerBody.includes('cloudflare')) {
    return 'HeliEx request blocked upstream'
  }

  return `HeliEx request failed with status ${status}`
}

function assertSupportedMarket(market: CanonicalMarket): void {
  const supported = HELIEX_MARKETS.some((candidate) => candidate.symbol === market.symbol)

  if (!supported) {
    throw new Error(`HeliEx does not support ${market.symbol}`)
  }
}

export class HeliExAdapter implements TradingVenue {
  readonly name: VenueName = 'heliex'
  readonly capabilities: VenueCapability[] = ['public_market_data']

  constructor(
    private readonly baseUrl = process.env.HELIEX_BASE_URL ?? 'https://heliex.net',
  ) {}

  async ping(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/orderbook`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HeliEx-Tradebot/1.0 (+local development)',
      },
    })

    if (!response.ok) {
      const body = await response.text()
      const reason = classifyHeliExHttpError(response.status, body)
      throw new Error(reason)
    }
  }

  async getMarkets(): Promise<VenueMarketInfo[]> {
    return HELIEX_MARKETS.map((market) => ({
      venue: this.name,
      market,
      nativeSymbol: market.symbol,
      enabled: true,
    }))
  }

  async getTicker(market: CanonicalMarket): Promise<MarketTicker> {
    assertSupportedMarket(market)

    const [orderBookResponse, tradesResponse] = await Promise.all([
      fetch(`${this.baseUrl}/api/orderbook`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'HeliEx-Tradebot/1.0 (+local development)',
        },
      }),
      fetch(`${this.baseUrl}/api/trades`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'HeliEx-Tradebot/1.0 (+local development)',
        },
      }),
    ])

    if (!orderBookResponse.ok) {
      const body = await orderBookResponse.text()
      const reason = classifyHeliExHttpError(orderBookResponse.status, body)
      throw new Error(`${reason} for ${market.symbol}`)
    }

    if (!tradesResponse.ok) {
      const body = await tradesResponse.text()
      const reason = classifyHeliExHttpError(tradesResponse.status, body)
      throw new Error(`${reason} for ${market.symbol}`)
    }

    const orderBookData = (await orderBookResponse.json()) as HeliExOrderBookResponse
    const tradesData = (await tradesResponse.json()) as HeliExTradeResponse[]

    const bids = parseOrderLevels(orderBookData.bids)
    const asks = parseOrderLevels(orderBookData.asks)

    const bestBid = bids.length > 0 ? Math.max(...bids.map((x) => x.price)) : null
    const bestAsk = asks.length > 0 ? Math.min(...asks.map((x) => x.price)) : null

    const mostRecentTrade = Array.isArray(tradesData) && tradesData.length > 0
      ? tradesData[0]
      : undefined

    return {
      venue: this.name,
      market,
      bid: bestBid,
      ask: bestAsk,
      last: toNumber(mostRecentTrade?.price),
      timestamp: normalizeTimestamp(mostRecentTrade?.created_at),
    }
  }

  async getOrderBook(market: CanonicalMarket): Promise<VenueOrderBook> {
    assertSupportedMarket(market)

    const response = await fetch(`${this.baseUrl}/api/orderbook`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HeliEx-Tradebot/1.0 (+local development)',
      },
    })

    if (!response.ok) {
      const body = await response.text()
      const reason = classifyHeliExHttpError(response.status, body)
      throw new Error(`${reason} for ${market.symbol}`)
    }

    const data = (await response.json()) as HeliExOrderBookResponse

    return {
      venue: this.name,
      market,
      bids: parseOrderLevels(data.bids),
      asks: parseOrderLevels(data.asks),
      timestamp: new Date().toISOString(),
    }
  }
}