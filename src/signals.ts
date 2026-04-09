import type { MarketSnapshot } from './market.js'
import type { WalletStatus } from './types.js'

export type MarketState =
  | 'candidate'
  | 'too_tight'
  | 'too_wide'
  | 'illiquid'
  | 'dislocated'
  | 'unhealthy'

export type TradeSignal = {
  shouldTrade: boolean
  state: MarketState
  reasons: string[]
  score: number
}

const MIN_SPREAD = 0.10
const TARGET_SPREAD = 0.20
const MIN_TOP_BOOK_AMOUNT = 1.0
const TARGET_TOP_BOOK_AMOUNT = 5.0
const MAX_ASK_DISTANCE_FROM_LAST_TRADE = 0.15
const MAX_BID_DISTANCE_FROM_LAST_TRADE = 0.15
const MAX_SPREAD = 1.0

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function scoreSpread(spread: number): number {
  if (spread < MIN_SPREAD) return 0
  if (spread >= TARGET_SPREAD) return 40

  const ratio = (spread - MIN_SPREAD) / (TARGET_SPREAD - MIN_SPREAD)
  return Math.round(ratio * 40)
}

function scoreLiquidity(amount: number): number {
  if (amount <= 0) return 0
  if (amount >= TARGET_TOP_BOOK_AMOUNT) return 20

  return Math.round((amount / TARGET_TOP_BOOK_AMOUNT) * 20)
}

function scoreDistance(distance: number, maxDistance: number): number {
  if (distance < 0) return 0
  if (distance >= maxDistance) return 0

  const ratio = 1 - distance / maxDistance
  return Math.round(ratio * 10)
}

export function evaluateSignal(
  snapshot: MarketSnapshot,
  walletStatus: WalletStatus
): TradeSignal {
  const reasons: string[] = []

  const walletsHealthy =
    walletStatus.online &&
    !!walletStatus.assets.GRC?.online &&
    !!walletStatus.assets.CURE?.online

  if (!walletsHealthy) {
    if (!walletStatus.online) {
      reasons.push('Exchange wallets are offline')
    }

    if (!walletStatus.assets.GRC?.online) {
      reasons.push('GRC wallet is offline')
    }

    if (!walletStatus.assets.CURE?.online) {
      reasons.push('CURE wallet is offline')
    }

    return {
      shouldTrade: false,
      state: 'unhealthy',
      reasons,
      score: 0,
    }
  }

  if (snapshot.bestBid <= 0 || snapshot.bestAsk <= 0) {
    reasons.push('Order book is incomplete')

    return {
      shouldTrade: false,
      state: 'unhealthy',
      reasons,
      score: 0,
    }
  }

  if (
    snapshot.bestBidAmount < MIN_TOP_BOOK_AMOUNT ||
    snapshot.bestAskAmount < MIN_TOP_BOOK_AMOUNT
  ) {
    if (snapshot.bestBidAmount < MIN_TOP_BOOK_AMOUNT) {
      reasons.push(
        `Best bid liquidity too small (${snapshot.bestBidAmount.toFixed(8)} < ${MIN_TOP_BOOK_AMOUNT.toFixed(8)})`
      )
    }

    if (snapshot.bestAskAmount < MIN_TOP_BOOK_AMOUNT) {
      reasons.push(
        `Best ask liquidity too small (${snapshot.bestAskAmount.toFixed(8)} < ${MIN_TOP_BOOK_AMOUNT.toFixed(8)})`
      )
    }

    const score =
      scoreSpread(snapshot.spread) +
      scoreLiquidity(snapshot.bestBidAmount) +
      scoreLiquidity(snapshot.bestAskAmount)

    return {
      shouldTrade: false,
      state: 'illiquid',
      reasons,
      score: clamp(score, 0, 100),
    }
  }

  if (snapshot.spread < MIN_SPREAD) {
    reasons.push(
      `Spread too small (${snapshot.spread.toFixed(8)} < ${MIN_SPREAD.toFixed(8)})`
    )

    const score =
      scoreSpread(snapshot.spread) +
      scoreLiquidity(snapshot.bestBidAmount) +
      scoreLiquidity(snapshot.bestAskAmount)

    return {
      shouldTrade: false,
      state: 'too_tight',
      reasons,
      score: clamp(score, 0, 100),
    }
  }

  if (snapshot.spread > MAX_SPREAD) {
    reasons.push(
      `Spread too large to trust (${snapshot.spread.toFixed(8)} > ${MAX_SPREAD.toFixed(8)})`
    )

    const score =
      scoreLiquidity(snapshot.bestBidAmount) +
      scoreLiquidity(snapshot.bestAskAmount)

    return {
      shouldTrade: false,
      state: 'too_wide',
      reasons,
      score: clamp(score, 0, 100),
    }
  }

  if (snapshot.lastTradePrice === null) {
    reasons.push('No recent trade price available')

    const score =
      scoreSpread(snapshot.spread) +
      scoreLiquidity(snapshot.bestBidAmount) +
      scoreLiquidity(snapshot.bestAskAmount)

    return {
      shouldTrade: false,
      state: 'dislocated',
      reasons,
      score: clamp(score, 0, 100),
    }
  }

  const askDistance = snapshot.bestAsk - snapshot.lastTradePrice
  const bidDistance = snapshot.lastTradePrice - snapshot.bestBid

  if (
    askDistance > MAX_ASK_DISTANCE_FROM_LAST_TRADE ||
    bidDistance > MAX_BID_DISTANCE_FROM_LAST_TRADE
  ) {
    if (askDistance > MAX_ASK_DISTANCE_FROM_LAST_TRADE) {
      reasons.push(
        `Best ask too far above last trade (${askDistance.toFixed(8)} > ${MAX_ASK_DISTANCE_FROM_LAST_TRADE.toFixed(8)})`
      )
    }

    if (bidDistance > MAX_BID_DISTANCE_FROM_LAST_TRADE) {
      reasons.push(
        `Best bid too far below last trade (${bidDistance.toFixed(8)} > ${MAX_BID_DISTANCE_FROM_LAST_TRADE.toFixed(8)})`
      )
    }

    const score =
      scoreSpread(snapshot.spread) +
      scoreLiquidity(snapshot.bestBidAmount) +
      scoreLiquidity(snapshot.bestAskAmount) +
      scoreDistance(askDistance, MAX_ASK_DISTANCE_FROM_LAST_TRADE) +
      scoreDistance(bidDistance, MAX_BID_DISTANCE_FROM_LAST_TRADE)

    return {
      shouldTrade: false,
      state: 'dislocated',
      reasons,
      score: clamp(score, 0, 100),
    }
  }

  const score =
    scoreSpread(snapshot.spread) +
    scoreLiquidity(snapshot.bestBidAmount) +
    scoreLiquidity(snapshot.bestAskAmount) +
    scoreDistance(askDistance, MAX_ASK_DISTANCE_FROM_LAST_TRADE) +
    scoreDistance(bidDistance, MAX_BID_DISTANCE_FROM_LAST_TRADE)

  return {
    shouldTrade: true,
    state: 'candidate',
    reasons: [],
    score: clamp(score, 0, 100),
  }
}