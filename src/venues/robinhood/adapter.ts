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
  listRobinhoodMarkets,
  toRobinhoodSymbol,
} from './symbols.js'
import { buildRobinhoodAuthHeaders } from './signing.js'

interface RobinhoodBestBidAskResult {
  symbol?: string
  bid_inclusive_of_sell_spread?: string
  ask_inclusive_of_buy_spread?: string
  updated_at?: string
}

interface RobinhoodBestBidAskResponse {
  results?: RobinhoodBestBidAskResult[]
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

function classifyRobinhoodHttpError(status: number, body: string): string {
  const lowerBody = body.toLowerCase()

  if (status === 404) {
    return 'Robinhood endpoint or product not found'
  }

  if (status === 429) {
    return 'Robinhood rate limited request'
  }

  if (status === 400 && lowerBody.includes('missing required headers')) {
    return 'Robinhood request requires authenticated headers'
  }

  if (status === 401 || status === 403) {
    return 'Robinhood request unauthorized or forbidden'
  }

  if (lowerBody.includes('cloudflare')) {
    return 'Robinhood request blocked upstream'
  }

  return `Robinhood request failed with status ${status}`
}

function buildBestBidAskRequest(baseUrl: string, nativeSymbol: string) {
  const query = `symbol=${encodeURIComponent(nativeSymbol)}`
  const path = `/best_bid_ask/?${query}`
  const url = `${baseUrl}${path}`
  const headers = buildRobinhoodAuthHeaders({
    method: 'GET',
    path,
  })

  return { path, url, headers }
}

export class RobinhoodAdapter implements TradingVenue {
  readonly name: VenueName = 'robinhood'
  readonly capabilities: VenueCapability[] = ['public_market_data']

  constructor(
    private readonly baseUrl =
      process.env.ROBINHOOD_BASE_URL ??
      'https://trading.robinhood.com/api/v1/crypto/marketdata',
  ) {}

  async ping(): Promise<void> {
    const { url, headers } = buildBestBidAskRequest(this.baseUrl, 'BTC-USD')

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HeliEx-Tradebot/1.0 (+local development)',
        ...headers,
      },
    })

    if (!response.ok) {
      const body = await response.text()
      const reason = classifyRobinhoodHttpError(response.status, body)
      throw new Error(`${reason}: ${body}`)
    }
  }

  async getMarkets(): Promise<VenueMarketInfo[]> {
    return listRobinhoodMarkets().map((market) => ({
      venue: this.name,
      market,
      nativeSymbol: toRobinhoodSymbol(market),
      enabled: true,
    }))
  }

  async getTicker(market: CanonicalMarket): Promise<MarketTicker> {
    const nativeSymbol = toRobinhoodSymbol(market)
    const { url, headers } = buildBestBidAskRequest(this.baseUrl, nativeSymbol)

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HeliEx-Tradebot/1.0 (+local development)',
        ...headers,
      },
    })

    if (!response.ok) {
      const body = await response.text()
      const reason = classifyRobinhoodHttpError(response.status, body)
      throw new Error(`${reason} for ${market.symbol}: ${body}`)
    }

    const data = (await response.json()) as RobinhoodBestBidAskResponse
    const first = data.results?.[0]

    if (!first) {
      throw new Error(`Robinhood returned no best bid/ask data for ${market.symbol}`)
    }

    const bid = toNumber(first.bid_inclusive_of_sell_spread)
    const ask = toNumber(first.ask_inclusive_of_buy_spread)
    const last = bid !== null && ask !== null ? (bid + ask) / 2 : null

    return {
      venue: this.name,
      market,
      bid,
      ask,
      last,
      timestamp: normalizeTimestamp(first.updated_at),
    }
  }

  async getOrderBook(_market: CanonicalMarket): Promise<VenueOrderBook> {
    throw new Error('Robinhood order book not implemented yet')
  }
}