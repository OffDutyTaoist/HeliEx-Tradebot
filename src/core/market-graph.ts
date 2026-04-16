import type { CanonicalMarket } from '../domain/markets.js'
import type { MarketTicker, VenueName } from '../venues/types.js'

export type VenueStatus = 'ok' | 'degraded' | 'unresolved'

export interface ScannedTicker {
  ticker: MarketTicker
  status: VenueStatus
}

export interface MarketEdge {
  venue: VenueName
  market: CanonicalMarket
  from: string
  to: string
  action: 'sell_base' | 'buy_base'
  price: number
  priceSide: 'bid' | 'ask'
  timestamp: string
  status: VenueStatus
  minAmount?: number | null
  maxAmount?: number | null
  availableAmount?: number | null
}

export interface MarketGraph {
  edges: MarketEdge[]
  adjacency: Map<string, MarketEdge[]>
}

export interface RouteCandidate {
  startAsset: string
  endAsset: string
  edges: MarketEdge[]
}

function assetSymbol(asset: string | { toString(): string }): string {
  return String(asset)
}

function addEdge(adjacency: Map<string, MarketEdge[]>, edge: MarketEdge): void {
  const current = adjacency.get(edge.from) ?? []
  current.push(edge)
  adjacency.set(edge.from, current)
}

export function buildMarketGraph(scanned: ScannedTicker[]): MarketGraph {
  const edges: MarketEdge[] = []
  const adjacency = new Map<string, MarketEdge[]>()

  for (const entry of scanned) {
    const { ticker, status } = entry
    const base = assetSymbol(ticker.market.base)
    const quote = assetSymbol(ticker.market.quote)

    if (ticker.bid !== null && ticker.bid > 0) {
      const edge: MarketEdge = {
        venue: ticker.venue,
        market: ticker.market,
        from: base,
        to: quote,
        action: 'sell_base',
        price: ticker.bid,
        priceSide: 'bid',
        timestamp: ticker.timestamp,
        status,
        minAmount: ticker.minAmount ?? null,
        maxAmount: ticker.maxAmount ?? null,
        availableAmount: ticker.bestBidAmount ?? null,
      }

      edges.push(edge)
      addEdge(adjacency, edge)
    }

    if (ticker.ask !== null && ticker.ask > 0) {
      const edge: MarketEdge = {
        venue: ticker.venue,
        market: ticker.market,
        from: quote,
        to: base,
        action: 'buy_base',
        price: ticker.ask,
        priceSide: 'ask',
        timestamp: ticker.timestamp,
        status,
        minAmount: ticker.minAmount ?? null,
        maxAmount: ticker.maxAmount ?? null,
        availableAmount: ticker.bestAskAmount ?? null,
      }

      edges.push(edge)
      addEdge(adjacency, edge)
    }
  }

  return { edges, adjacency }
}

export function priceRoute(route: RouteCandidate, startAmount = 1): number {
  let amount = startAmount

  for (const edge of route.edges) {
    if (edge.action === 'sell_base') {
      amount *= edge.price
    } else {
      amount /= edge.price
    }
  }

  return amount
}