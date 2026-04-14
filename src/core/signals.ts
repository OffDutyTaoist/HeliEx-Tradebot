import type { MarketSnapshot } from './market.js'
import type { WalletStatus } from '../types.js'
import { runtimeConfig } from '../config/runtime.js'

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function scoreSpread(spread: number): number {
  if (spread < runtimeConfig.minSpread) return 0
  if (spread >= runtimeConfig.targetSpread) return 40

  const ratio =
    (spread - runtimeConfig.minSpread) /
    (runtimeConfig.targetSpread - runtimeConfig.minSpread)

  return Math.round(ratio * 40)
}

function scoreLiquidity(amount: number): number {
  if (amount <= 0) return 0
  if (amount >= runtimeConfig.targetTopBookAmount) return 20

  return Math.round((amount / runtimeConfig.targetTopBookAmount) * 20)
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
    snapshot.bestBidAmount < runtimeConfig.minTopBookAmount ||
    snapshot.bestAskAmount < runtimeConfig.minTopBookAmount
  ) {
    if (snapshot.bestBidAmount < runtimeConfig.minTopBookAmount) {
      reasons.push(
        `Best bid liquidity too small (${snapshot.bestBidAmount.toFixed(8)} < ${runtimeConfig.minTopBookAmount.toFixed(8)})`
      )
    }

    if (snapshot.bestAskAmount < runtimeConfig.minTopBookAmount) {
      reasons.push(
        `Best ask liquidity too small (${snapshot.bestAskAmount.toFixed(8)} < ${runtimeConfig.minTopBookAmount.toFixed(8)})`
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

  if (snapshot.spread < runtimeConfig.minSpread) {
    reasons.push(
      `Spread too small (${snapshot.spread.toFixed(8)} < ${runtimeConfig.minSpread.toFixed(8)})`
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

  if (snapshot.spread > runtimeConfig.maxSpread) {
    reasons.push(
      `Spread too large to trust (${snapshot.spread.toFixed(8)} > ${runtimeConfig.maxSpread.toFixed(8)})`
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
    askDistance > runtimeConfig.maxAskDistanceFromLastTrade ||
    bidDistance > runtimeConfig.maxBidDistanceFromLastTrade
  ) {
    if (askDistance > runtimeConfig.maxAskDistanceFromLastTrade) {
      reasons.push(
        `Best ask too far above last trade (${askDistance.toFixed(8)} > ${runtimeConfig.maxAskDistanceFromLastTrade.toFixed(8)})`
      )
    }

    if (bidDistance > runtimeConfig.maxBidDistanceFromLastTrade) {
      reasons.push(
        `Best bid too far below last trade (${bidDistance.toFixed(8)} > ${runtimeConfig.maxBidDistanceFromLastTrade.toFixed(8)})`
      )
    }

    const score =
      scoreSpread(snapshot.spread) +
      scoreLiquidity(snapshot.bestBidAmount) +
      scoreLiquidity(snapshot.bestAskAmount) +
      scoreDistance(askDistance, runtimeConfig.maxAskDistanceFromLastTrade) +
      scoreDistance(bidDistance, runtimeConfig.maxBidDistanceFromLastTrade)

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
    scoreDistance(askDistance, runtimeConfig.maxAskDistanceFromLastTrade) +
    scoreDistance(bidDistance, runtimeConfig.maxBidDistanceFromLastTrade)

  return {
    shouldTrade: true,
    state: 'candidate',
    reasons: [],
    score: clamp(score, 0, 100),
  }
}