import type { CanonicalMarket } from '../../domain/markets.js'
import type {
  MarketTicker,
  TradingVenue,
  VenueCapability,
  VenueMarketInfo,
  VenueName,
  VenueOrderBook,
} from '../types.js'

const ALTQUICK_MARKETS: CanonicalMarket[] = [
  {
    base: 'CURE',
    quote: 'BTC',
    symbol: 'CURE/BTC',
  },
]

function assertSupportedMarket(market: CanonicalMarket): void {
  const supported = ALTQUICK_MARKETS.some((m) => m.symbol === market.symbol)
  if (!supported) {
    throw new Error(`AltQuick does not support ${market.symbol}`)
  }
}

export class AltQuickAdapter implements TradingVenue {
  readonly name: VenueName = 'altquick'
  readonly capabilities: VenueCapability[] = ['public_market_data']

  constructor(
    private readonly baseUrl =
      process.env.ALTQUICK_BASE_URL ?? 'https://altquick.com/swap/api/v1',
  ) {}

  async ping(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/markets`)

    if (!response.ok) {
      throw new Error(`AltQuick ping failed with status ${response.status}`)
    }
  }

  async getMarkets(): Promise<VenueMarketInfo[]> {
    return ALTQUICK_MARKETS.map((market) => ({
      venue: this.name,
      market,
      nativeSymbol: market.symbol.replace('/', '-'),
      enabled: true,
    }))
  }

async getTicker(market: CanonicalMarket): Promise<MarketTicker> {
  assertSupportedMarket(market)

  const nativeSymbol = market.symbol.replace('/', '-')
  const response = await fetch(`${this.baseUrl}/market/${nativeSymbol}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'HeliEx-Tradebot/1.0 (+local development)',
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`AltQuick ticker failed for ${market.symbol} with status ${response.status}: ${body}`)
  }

  interface AltQuickMarketSide {
    coin?: string
    avgrate?: string
    amount?: string
    lowestrate?: string
    firstrate?: string
    btctotal?: string
  }

  interface AltQuickMarketResponse {
    rates?: {
      from?: AltQuickMarketSide
      to?: AltQuickMarketSide
      min?: string
      max?: string
    }
    ratesWithFees?: {
      from?: AltQuickMarketSide
      to?: AltQuickMarketSide
      fees?: {
        exchangeCommission?: string
        total?: string
        commission?: string
      }
    }
    min?: string
    max?: string
    closed?: boolean
  }

  const data = (await response.json()) as AltQuickMarketResponse

  if (data.closed) {
    throw new Error(`AltQuick market is closed for ${market.symbol}`)
  }

  const avgRate = Number(data.rates?.from?.avgrate)
  const firstRate = Number(data.rates?.from?.firstrate)
  const lowRate = Number(data.rates?.from?.lowestrate)

  const bid = Number.isFinite(lowRate) ? lowRate : Number.isFinite(avgRate) ? avgRate : null
  const ask = Number.isFinite(firstRate) ? firstRate : Number.isFinite(avgRate) ? avgRate : null
  const last = Number.isFinite(avgRate) ? avgRate : null

  if (bid === null && ask === null && last === null) {
    throw new Error(`AltQuick returned invalid market rates for ${market.symbol}`)
  }

  return {
    venue: this.name,
    market,
    bid,
    ask,
    last,
    timestamp: new Date().toISOString(),
  }
}

  async getOrderBook(market: CanonicalMarket): Promise<VenueOrderBook> {
    assertSupportedMarket(market)

    return {
      venue: this.name,
      market,
      bids: [],
      asks: [],
      timestamp: new Date().toISOString(),
    }
  }
}