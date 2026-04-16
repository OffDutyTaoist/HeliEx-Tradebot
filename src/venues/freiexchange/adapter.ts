import type { CanonicalMarket } from '../../domain/markets.js'
import type {
  MarketTicker,
  OrderBookLevel,
  TradingVenue,
  VenueCapability,
  VenueMarketInfo,
  VenueName,
  VenueOrderBook,
} from '../types.js'
import { listFreiExchangeMarkets, toFreiExchangeSymbol } from './symbols.js'

interface FreiExchangeTickerEntry {
  marketid?: string
  volume24h?: string
  average24h?: string
  high?: string
  low?: string
  last?: string
  volume24h_btc?: string
  percent_change_24h?: string
  highestBuy?: string
  lowestSell?: string
}

interface FreiExchangeOrderBookEntry {
  id?: string
  coin?: string
  basecoin?: string
  price?: string
  amount?: string
}

interface FreiExchangeOrderBookResponse {
  BUY?: FreiExchangeOrderBookEntry[]
  SELL?: FreiExchangeOrderBookEntry[]
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function parseOrderLevels(
  entries: FreiExchangeOrderBookEntry[] | undefined
): OrderBookLevel[] {
  if (!entries) {
    return []
  }

  return entries
    .map((entry) => {
      const price = toNumber(entry.price)
      const amount = toNumber(entry.amount)

      if (price === null || amount === null) {
        return null
      }

      return { price, amount }
    })
    .filter((entry): entry is OrderBookLevel => entry !== null)
}

function classifyFreiExchangeHttpError(status: number, body: string): string {
  const lowerBody = body.toLowerCase()

  if (status === 404) {
    return 'FreiExchange endpoint not found'
  }

  if (status === 429) {
    return 'FreiExchange rate limited request'
  }

  if (lowerBody.includes('blocked')) {
    return 'FreiExchange request blocked upstream'
  }

  return `FreiExchange request failed with status ${status}`
}

export class FreiExchangeAdapter implements TradingVenue {
  readonly name: VenueName = 'freiexchange'
  readonly capabilities: VenueCapability[] = ['public_market_data']

  constructor(
    private readonly baseUrl =
      process.env.FREIEXCHANGE_BASE_URL ?? 'https://api.freiexchange.com',
  ) {}

  async ping(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/public/ticker`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HeliEx-Tradebot/1.0 (+local development)',
      },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(classifyFreiExchangeHttpError(response.status, body))
    }
  }

  async getMarkets(): Promise<VenueMarketInfo[]> {
    return listFreiExchangeMarkets().map((market) => ({
      venue: this.name,
      market,
      nativeSymbol: toFreiExchangeSymbol(market),
      enabled: true,
    }))
  }

  async getTicker(market: CanonicalMarket): Promise<MarketTicker> {
    const symbol = toFreiExchangeSymbol(market)
    const response = await fetch(`${this.baseUrl}/public/ticker/${symbol}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HeliEx-Tradebot/1.0 (+local development)',
      },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(
        `${classifyFreiExchangeHttpError(response.status, body)} for ${market.symbol}`
      )
    }

    const data = (await response.json()) as Record<string, FreiExchangeTickerEntry[]>
    const key = `${symbol.toUpperCase()}_BTC`
    const entry = Array.isArray(data[key]) ? data[key][0] : undefined

    if (!entry) {
      throw new Error(`FreiExchange returned no ticker data for ${market.symbol}`)
    }

    const bid = toNumber(entry.highestBuy)
    const ask = toNumber(entry.lowestSell)
    const last = toNumber(entry.last)

    if (bid === null && ask === null && last === null) {
      throw new Error(`FreiExchange returned invalid ticker data for ${market.symbol}`)
    }

    return {
      venue: this.name,
      market,
      bid,
      ask,
      last,
      timestamp: new Date().toISOString(),
      minAmount: null,
      maxAmount: null,
      bestBidAmount: null,
      bestAskAmount: null,
    }
  }

  async getOrderBook(market: CanonicalMarket): Promise<VenueOrderBook> {
    const symbol = toFreiExchangeSymbol(market)
    const response = await fetch(`${this.baseUrl}/public/orderbook/${symbol}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HeliEx-Tradebot/1.0 (+local development)',
      },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(
        `${classifyFreiExchangeHttpError(response.status, body)} for ${market.symbol}`
      )
    }

    const data = (await response.json()) as FreiExchangeOrderBookResponse

    return {
      venue: this.name,
      market,
      bids: parseOrderLevels(data.BUY),
      asks: parseOrderLevels(data.SELL),
      timestamp: new Date().toISOString(),
    }
  }
}