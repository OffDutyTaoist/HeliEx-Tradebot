import 'dotenv/config'
import { AltQuickAdapter } from '../venues/altquick/adapter.js'
import { CoinbaseAdapter } from '../venues/coinbase/adapter.js'
import { DEFAULT_TRACKED_MARKETS } from '../domain/default-markets.js'
import { scanMarkets, classifyStatus } from '../services/market-scanner.js'
import { buildMarketGraph, summarizeMarketGraph } from '../core/market-graph.js'
import { discoverRoutes, summarizeRoute } from '../services/route-discovery.js'
import { HeliExAdapter } from '../venues/heliex/adapter.js'
import { selectBestRoute } from '../services/route-ranking.js'
import { FreiExchangeAdapter } from '../venues/freiexchange/adapter.js'

const START_AMOUNTS: Record<string, number[]> = {
  GRC: [1, 1000, 5000, 10000],
  CURE: [1, 1000, 3000, 10000],
}

function startAmountsForAsset(asset: string): number[] {
  return START_AMOUNTS[asset] ?? [1]
}

async function main(): Promise<void> {
  const venues = [
    new HeliExAdapter(),
    new AltQuickAdapter(),
    new FreiExchangeAdapter(),
    new CoinbaseAdapter(),
  ]

  const { scanned, tickers, errors } = await scanMarkets(venues, DEFAULT_TRACKED_MARKETS)

  console.log('--- Normalized Tickers ---')
  for (const ticker of tickers) {
    console.log({
      venue: ticker.venue,
      market: ticker.market.symbol,
      bid: ticker.bid,
      ask: ticker.ask,
      last: ticker.last,
      timestamp: ticker.timestamp,
      minAmount: ticker.minAmount ?? null,
      maxAmount: ticker.maxAmount ?? null,
    })
  }

  const venueStatuses = new Map<string, 'ok' | 'degraded' | 'unresolved'>()

  for (const venue of venues) {
    venueStatuses.set(venue.name, 'ok')
  }

  for (const error of errors) {
    const current = venueStatuses.get(error.venue) ?? 'ok'
    const next = classifyStatus(error.message)

    if (current === 'ok') {
      venueStatuses.set(error.venue, next)
    } else if (current === 'degraded' && next === 'unresolved') {
      // keep degraded
    } else {
      venueStatuses.set(error.venue, next)
    }
  }

  console.log('\n--- Venue Status ---')
  for (const [venue, status] of venueStatuses.entries()) {
    console.log({ venue, status })
  }

  const graph = buildMarketGraph(scanned)

  console.log('\n--- Market Graph ---')
  console.log({
    assets: graph.adjacency.size,
    edges: graph.edges.length,
  })

  const summary = summarizeMarketGraph(graph)

  for (const row of summary) {
    console.log(`\n${row.asset}`)
    for (const edge of row.edges) {
      console.log(
        `  -> ${edge.to} via ${edge.venue} (${edge.market}) [${edge.action} @ ${edge.priceSide}=${edge.price}]`
      )
    }
  }

  const targets: Array<[string, string]> = [
    ['GRC', 'BTC'],
    ['GRC', 'USD'],
    ['GRC', 'USDT'],
    ['CURE', 'BTC'],
    ['CURE', 'USD'],
    ['CURE', 'USDT'],
  ]

  console.log('\n--- Route Candidates ---')
  for (const [from, to] of targets) {
    const routes = discoverRoutes(graph, from, to, {
      maxHops: 3,
      includeDegraded: false,
      includeUnresolved: false,
    })

    if (routes.length === 0) {
      console.log({ from, to, routes: [] })
      continue
    }

    const amounts = startAmountsForAsset(from)
    const results: any[] = []

    for (const startAmount of amounts) {
      const best = selectBestRoute(routes, startAmount)

      if (!best) {
        results.push({ startAmount, bestRoute: 'none' })
        continue
      }

      results.push({
        startAmount,
        bestRoute: summarizeRoute(best.route),
        impliedRate: best.impliedRate,
        score: best.score,
      })
    }

    console.log({ from, to, results })
  }
}

main().catch((error) => {
  console.error('scan-markets failed')
  console.error(error)
  process.exit(1)
})