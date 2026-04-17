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

function formatEdgeAnnotations(edge: {
  status: 'ok' | 'degraded' | 'unresolved'
  minAmount?: number | null
  maxAmount?: number | null
  availableAmount?: number | null
}): string {
  const annotations: string[] = []

  if (edge.status !== 'ok') {
    annotations.push(edge.status)
  }

  if (edge.minAmount != null) {
    annotations.push(`min=${edge.minAmount}`)
  }

  if (edge.maxAmount != null) {
    annotations.push(`max=${edge.maxAmount}`)
  }

  if (edge.availableAmount != null) {
    annotations.push(`liq=${edge.availableAmount}`)
  }

  return annotations.length > 0 ? ` [${annotations.join(' ')}]` : ''
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
      const annotations = formatEdgeAnnotations(edge)
      console.log(
        `  -> ${edge.to} via ${edge.venue} (${edge.market}) [${edge.action} @ ${edge.priceSide}=${edge.price}]${annotations}`
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
    const results: Array<{
      startAmount: number
      bestRoute: string
      impliedRate: number
      score: number
      hops: number
      staleSeconds: number
      degradedEdges: number
      isAmountValid: boolean
      amountWarnings: string[]
      venues: string[]
      markets: string[]
    }> = []

    for (const startAmount of amounts) {
      const best = selectBestRoute(routes, startAmount)

      if (!best) {
        results.push({
          startAmount,
          bestRoute: 'none',
          impliedRate: 0,
          score: Number.NEGATIVE_INFINITY,
          hops: 0,
          staleSeconds: 0,
          degradedEdges: 0,
          isAmountValid: false,
          amountWarnings: ['No valid route found'],
          venues: [],
          markets: [],
        })
        continue
      }

      results.push({
        startAmount,
        bestRoute: summarizeRoute(best.route),
        impliedRate: best.impliedRate,
        score: best.score,
        hops: best.hopCount,
        staleSeconds: best.staleSeconds,
        degradedEdges: best.degradedEdges,
        isAmountValid: best.isAmountValid,
        amountWarnings: best.amountWarnings,
        venues: best.route.edges.map((edge) => edge.venue),
        markets: best.route.edges.map((edge) => edge.market.symbol),
      })
    }

    const validResults = results.filter((result) => result.isAmountValid)
    const firstValid = validResults.at(0) ?? null
    const lastValid = validResults.at(-1) ?? null

    console.log({
      from,
      to,
      testedAmounts: results.map((result) => result.startAmount),
      validAmounts: validResults.map((result) => result.startAmount),
      firstValidAmount: firstValid?.startAmount ?? null,
      lastValidAmount: lastValid?.startAmount ?? null,
      bestRoute: results[0]?.bestRoute ?? 'none',
      venues: results[0]?.venues ?? [],
      markets: results[0]?.markets ?? [],
    })

    for (const result of results) {
      console.log({
        from,
        to,
        startAmount: result.startAmount,
        bestRoute: result.bestRoute,
        impliedRate: result.impliedRate,
        score: result.score,
        hops: result.hops,
        staleSeconds: result.staleSeconds,
        degradedEdges: result.degradedEdges,
        isAmountValid: result.isAmountValid,
        amountWarnings: result.amountWarnings,
        venues: result.venues,
        markets: result.markets,
      })
    }
  }
}

main().catch((error) => {
  console.error('scan-markets failed')
  console.error(error)
  process.exit(1)
})