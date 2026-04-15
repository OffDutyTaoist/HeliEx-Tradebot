import type { RouteCandidate } from '../core/market-graph.js'

export interface RankedRoute {
  route: RouteCandidate
  impliedRate: number
  score: number
  hopCount: number
  staleSeconds: number
  degradedEdges: number
  isAmountValid: boolean
  amountWarnings: string[]
}

const VENUE_FEES: Record<string, number> = {
  heliex: 0.002,
  altquick: 0.012,
  coinbase: 0.005,
}

function routeImpliedRate(route: RouteCandidate, startAmount = 1): number {
  let amount = startAmount

  for (const edge of route.edges) {
    const fee = VENUE_FEES[edge.venue] ?? 0

    if (edge.action === 'sell_base') {
      amount *= edge.price
    } else {
      amount /= edge.price
    }

    amount *= (1 - fee)
  }

  return amount
}

function getRouteStaleSeconds(route: RouteCandidate): number {
  const now = Date.now()

  const ages = route.edges.map((edge) => {
    const t = new Date(edge.timestamp).getTime()
    if (Number.isNaN(t)) return 3600
    return Math.max(0, (now - t) / 1000)
  })

  return ages.length > 0 ? Math.max(...ages) : 0
}

function validateRouteAmount(
  route: RouteCandidate,
  startAmount: number
): {
  isAmountValid: boolean
  amountWarnings: string[]
} {
  const warnings: string[] = []

  for (const edge of route.edges) {
    if (edge.venue === 'altquick') {
      // Placeholder for future AltQuick min/max validation
      // when min/max is threaded into adapter metadata.
      if (startAmount <= 0) {
        warnings.push(`Invalid start amount ${startAmount} for AltQuick route`)
      }
    }
  }

  return {
    isAmountValid: warnings.length === 0,
    amountWarnings: warnings,
  }
}

export function scoreRoute(route: RouteCandidate, startAmount = 1): RankedRoute {
  const impliedRate = routeImpliedRate(route, startAmount)
  const hopCount = route.edges.length
  const staleSeconds = getRouteStaleSeconds(route)
  const degradedEdges = route.edges.filter((edge) => edge.status === 'degraded').length
  const { isAmountValid, amountWarnings } = validateRouteAmount(route, startAmount)

  return {
    route,
    impliedRate,
    score: 0,
    hopCount,
    staleSeconds,
    degradedEdges,
    isAmountValid,
    amountWarnings,
  }
}

export function rankRoutes(routes: RouteCandidate[], startAmount = 1): RankedRoute[] {
  const scored = routes.map((route) => scoreRoute(route, startAmount))

  if (scored.length === 0) {
    return []
  }

  const maxRate = Math.max(...scored.map((route) => route.impliedRate))
  const minRate = Math.min(...scored.map((route) => route.impliedRate))

  return scored
    .map((route) => {
      const normalizedRate =
        maxRate === minRate
          ? 1
          : (route.impliedRate - minRate) / (maxRate - minRate)

      const normalizedScore =
        (route.isAmountValid ? normalizedRate : -1)
        - Math.max(0, route.hopCount - 1) * 0.1
        - route.staleSeconds * 0.00001
        - route.degradedEdges * 0.2

      return {
        ...route,
        score: normalizedScore,
      }
    })
    .sort((a, b) => b.score - a.score)
}

export function selectBestRoute(
  routes: RouteCandidate[],
  startAmount = 1
): RankedRoute | null {
  const ranked = rankRoutes(routes, startAmount)

  if (ranked.length === 0) {
    return null
  }

  return ranked[0]!
}