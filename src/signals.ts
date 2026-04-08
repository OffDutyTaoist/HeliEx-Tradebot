import type { MarketSnapshot } from './market.js'
import type { WalletStatus } from './types.js'

export type TradeSignal = {
  shouldTrade: boolean
  reasons: string[]
}

const MIN_SPREAD = 0.10

export function evaluateSignal(
  snapshot: MarketSnapshot,
  walletStatus: WalletStatus
): TradeSignal {
  const reasons: string[] = []

  if (!walletStatus.online) {
    reasons.push('Exchange wallets are offline')
  }

  if (!walletStatus.assets.GRC?.online) {
    reasons.push('GRC wallet is offline')
  }

  if (!walletStatus.assets.CURE?.online) {
    reasons.push('CURE wallet is offline')
  }

  if (snapshot.bestBid <= 0 || snapshot.bestAsk <= 0) {
    reasons.push('Order book is incomplete')
  }

  if (snapshot.spread < MIN_SPREAD) {
    reasons.push(
      `Spread too small (${snapshot.spread.toFixed(8)} < ${MIN_SPREAD.toFixed(8)})`
    )
  }

  if (snapshot.lastTradePrice === null) {
    reasons.push('No recent trade price available')
  }

  return {
    shouldTrade: reasons.length === 0,
    reasons,
  }
}