import 'dotenv/config'
import { AltQuickAdapter } from '../venues/altquick/adapter.js'
import { CoinbaseAdapter } from '../venues/coinbase/adapter.js'
import { RobinhoodAdapter } from '../venues/robinhood/adapter.js'
import { SafeTradeAdapter } from '../venues/safetrade/adapter.js'
import { DEFAULT_TRACKED_MARKETS } from '../domain/default-markets.js'
import { scanMarkets, classifyStatus } from '../services/market-scanner.js'
import { buildMarketGraph } from '../core/market-graph.js'
import { discoverRoutes, summarizeRoute } from '../services/route-discovery.js'
import { priceRoute } from '../core/market-graph.js'
import { HeliExAdapter } from '../venues/heliex/adapter.js'

async function main(): Promise<void> {
  const venues = [
    new HeliExAdapter(),
    //new SafeTradeAdapter(),
    new AltQuickAdapter(),
    new CoinbaseAdapter(),
    //new RobinhoodAdapter(),
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

    for (const route of routes) {
      console.log({
        from,
        to,
        route: summarizeRoute(route),
        hops: route.edges.length,
        impliedRate: priceRoute(route),
        venues: route.edges.map((edge) => edge.venue),
        markets: route.edges.map((edge) => edge.market.symbol),
      })
    }
  }

  if (errors.length > 0) {
    console.log('\n--- Scanner Errors ---')
    for (const error of errors) {
      console.log(error)
    }
  }
}

main().catch((error) => {
  console.error('scan-markets failed')
  console.error(error)
  process.exit(1)
})