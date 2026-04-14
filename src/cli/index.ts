import 'dotenv/config'
import { getOrderBook, getTrades, getWalletStatus } from '../api.js'
import { buildMarketSnapshot, type MarketSnapshot } from '../core/market.js'
import type { WalletStatus } from '../types.js'
import { evaluateSignal } from '../core/signals.js'
import { appendJsonLine } from '../logger.js'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function logSnapshot(snapshot: MarketSnapshot) {
  console.log('\n--- Market Snapshot ---')
  console.log(`Bid: ${snapshot.bestBid} (${snapshot.bestBidAmount})`)
  console.log(`Ask: ${snapshot.bestAsk} (${snapshot.bestAskAmount})`)
  console.log(`Spread: ${snapshot.spread.toFixed(8)}`)
  console.log(`Last: ${snapshot.lastTradePrice ?? 'N/A'}`)
}

function logDiff(prev: MarketSnapshot, next: MarketSnapshot) {
  const changes: string[] = []

  if (prev.bestBid !== next.bestBid) {
    changes.push(`Bid changed: ${prev.bestBid} → ${next.bestBid}`)
  }

  if (prev.bestAsk !== next.bestAsk) {
    changes.push(`Ask changed: ${prev.bestAsk} → ${next.bestAsk}`)
  }

  if (prev.lastTradePrice !== next.lastTradePrice) {
    changes.push(`Last trade: ${prev.lastTradePrice} → ${next.lastTradePrice}`)
  }

  if (prev.spread !== next.spread) {
    changes.push(
      `Spread: ${prev.spread.toFixed(8)} → ${next.spread.toFixed(8)}`
    )
  }

  if (changes.length === 0) {
    return
  }

  console.log('\n--- Changes ---')
  for (const change of changes) {
    console.log(change)
  }
}

function logWalletStatus(walletStatus: WalletStatus) {
  const grc = walletStatus.assets.GRC
  const cure = walletStatus.assets.CURE

  console.log('\n--- Wallet Status ---')
  console.log(`Exchange online: ${walletStatus.online ? 'yes' : 'no'}`)
  console.log(`GRC wallet: ${grc?.online ? 'online' : 'offline'}`)
  console.log(`CURE wallet: ${cure?.online ? 'online' : 'offline'}`)

  if (grc?.error) {
    console.log(`GRC error: ${grc.error}`)
  }

  if (cure?.error) {
    console.log(`CURE error: ${cure.error}`)
  }
}

function getWalletWarnings(walletStatus: WalletStatus): string[] {
  const warnings: string[] = []

  if (!walletStatus.online) {
    warnings.push('Exchange reports wallets offline')
  }

  if (walletStatus.assets.GRC && !walletStatus.assets.GRC.online) {
    warnings.push('GRC wallet offline')
  }

  if (walletStatus.assets.CURE && !walletStatus.assets.CURE.online) {
    warnings.push('CURE wallet offline')
  }

  return warnings
}

function getWatchlistLabel(score: number): string | null {
  if (score >= 85) return 'HIGH CONVICTION'
  if (score >= 70) return 'WATCHLIST'
  return null
}

function logSignal(signal: {
  shouldTrade: boolean
  state: string
  reasons: string[]
  score: number
}) {
  console.log('\n--- Signal ---')
  console.log(
    `${signal.shouldTrade ? 'WOULD TRADE' : 'NO TRADE'} | state=${signal.state} | score=${signal.score}/100`
  )

  const label = getWatchlistLabel(signal.score)
  if (label) {
    console.log(`Label: ${label}`)
  }

  if (signal.reasons.length === 0) {
    return
  }

  for (const reason of signal.reasons) {
    console.log(`- ${reason}`)
  }
}

type LoggedSignal = {
  shouldTrade: boolean
  state: string
  reasons: string[]
  score: number
}

function logSignalTransition(
  previous: LoggedSignal | null,
  next: LoggedSignal
) {
  if (!previous) {
    return
  }

  const changes: string[] = []

  if (previous.state !== next.state) {
    changes.push(`State changed: ${previous.state} -> ${next.state}`)
  }

  if (previous.shouldTrade !== next.shouldTrade) {
    changes.push(
      `Decision changed: ${previous.shouldTrade ? 'WOULD TRADE' : 'NO TRADE'} -> ${next.shouldTrade ? 'WOULD TRADE' : 'NO TRADE'}`
    )
  }

  if (previous.score !== next.score) {
    changes.push(`Score changed: ${previous.score} -> ${next.score}`)
  }

  if (changes.length === 0) {
    return
  }

  console.log('\n--- Signal Transition ---')
  for (const change of changes) {
    console.log(change)
  }
}

function logAlerts(previous: LoggedSignal | null, next: LoggedSignal) {
  const prevLabel = previous ? getWatchlistLabel(previous.score) : null
  const nextLabel = getWatchlistLabel(next.score)

  if (previous && previous.state !== 'candidate' && next.state === 'candidate') {
    console.log('\n=== ALERT: MARKET ENTERED CANDIDATE STATE ===')
  }

  if (previous && !previous.shouldTrade && next.shouldTrade) {
    console.log('\n=== ALERT: WOULD TRADE TURNED TRUE ===')
  }

  if (prevLabel !== nextLabel && nextLabel) {
    console.log(`\n=== ALERT: ${nextLabel} ===`)
  }
}

function signalsEqual(a: LoggedSignal | null, b: LoggedSignal): boolean {
  if (!a) return false
  if (a.shouldTrade !== b.shouldTrade) return false
  if (a.state !== b.state) return false
  if (a.score !== b.score) return false
  if (a.reasons.length !== b.reasons.length) return false

  for (let i = 0; i < a.reasons.length; i++) {
    if (a.reasons[i] !== b.reasons[i]) {
      return false
    }
  }

  return true
}

function getLogFilePath(date = new Date()): string {
  const day = date.toISOString().slice(0, 10)
  return `logs/market-${day}.jsonl`
}

async function main(): Promise<void> {
  console.log('Starting market watcher...\n')

  let previous: MarketSnapshot | null = null
  let previousSignal: LoggedSignal | null = null

  while (true) {
    try {
      const orderBook = await getOrderBook()
      const trades = await getTrades()
      const walletStatus = await getWalletStatus()

      const warnings = getWalletWarnings(walletStatus)
      for (const warning of warnings) {
        console.log(`\nWARNING: ${warning}`)
      }

      const snapshot = buildMarketSnapshot(orderBook, trades)
      const signal = evaluateSignal(snapshot, walletStatus)
      const now = new Date()

      if (!previous) {
        logSnapshot(snapshot)
        logWalletStatus(walletStatus)
      } else {
        logDiff(previous, snapshot)
      }

      if (!signalsEqual(previousSignal, signal)) {
        logSignalTransition(previousSignal, signal)
        logAlerts(previousSignal, signal) 
        logSignal(signal)

        previousSignal = {
          shouldTrade: signal.shouldTrade,
          state: signal.state,
          reasons: [...signal.reasons],
          score: signal.score,
        }
      }

      await appendJsonLine(getLogFilePath(now), {
        ts: now.toISOString(),
        bid: snapshot.bestBid,
        bidAmount: snapshot.bestBidAmount,
        ask: snapshot.bestAsk,
        askAmount: snapshot.bestAskAmount,
        spread: snapshot.spread,
        lastTradeTime:snapshot.lastTradeTime,
        last: snapshot.lastTradePrice,
        state: signal.state,
        score: signal.score,
        label: getWatchlistLabel(signal.score),
        shouldTrade: signal.shouldTrade,
        walletsOnline: walletStatus.online,
        grcOnline: walletStatus.assets.GRC?.online ?? false,
        cureOnline: walletStatus.assets.CURE?.online ?? false,
      })

      previous = snapshot
    } catch (err) {
      console.error('\n--- ERROR ---')
      console.error(err instanceof Error ? err.message : err)
    }

    console.log(`Checked at ${new Date().toISOString()}`)
    await sleep(15000)
  }
}

main().catch((err) => {
  console.error('Fatal startup error:')
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})