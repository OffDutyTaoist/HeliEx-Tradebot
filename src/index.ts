import 'dotenv/config'
import { getOrderBook, getTrades, getWalletStatus } from './api.js'
import { buildMarketSnapshot, type MarketSnapshot } from './market.js'
import type { WalletStatus } from './types.js'

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

async function main(): Promise<void> {
  console.log('Starting market watcher...\n')

  let previous: MarketSnapshot | null = null

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

      if (!previous) {
        logSnapshot(snapshot)
        logWalletStatus(walletStatus)
      } else {
        logDiff(previous, snapshot)
      }

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