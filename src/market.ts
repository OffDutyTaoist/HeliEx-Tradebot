import type { OrderBook, Trade } from './types.js'

export type MarketSnapshot = {
  bestBid: number
  bestBidAmount: number
  bestAsk: number
  bestAskAmount: number
  spread: number
  lastTradePrice: number | null
  lastTradeAmount: number | null
  lastTradeTime: string | null
}

export function buildMarketSnapshot(
  orderBook: OrderBook,
  trades: Trade[]
): MarketSnapshot {
  const bestBid = orderBook.bids[0]
  const bestAsk = orderBook.asks[0]
  const lastTrade = trades[0]

  return {
    bestBid: bestBid?.price ?? 0,
    bestBidAmount: bestBid?.amount ?? 0,
    bestAsk: bestAsk?.price ?? 0,
    bestAskAmount: bestAsk?.amount ?? 0,
    spread: bestBid && bestAsk ? Number((bestAsk.price - bestBid.price).toFixed(8)) : 0,
    lastTradePrice: lastTrade ? Number(lastTrade.price) : null,
    lastTradeAmount: lastTrade ? Number(lastTrade.amount) : null,
    lastTradeTime: lastTrade?.created_at ?? null,
  }
}