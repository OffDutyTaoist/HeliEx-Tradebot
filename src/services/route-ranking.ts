import type { RouteCandidate } from '../core/market-graph.js'

export interface RankedRoute {
  route: RouteCandidate
  impliedRate: number
  score: number
  hopCount: number
  staleSeconds: number
  degradedEdges: number
}

function routeImpliedRate(route: RouteCandidate, startAmount = 1): number {
  let amount = startAmount

  for (const edge of route.edges) {
    if (edge.action === 'sell_base') {
      amount *= edge.price
    } else {
      amount /= edge.price
    }
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

export function scoreRoute(route: RouteCandidate): RankedRoute {
  const impliedRate = routeImpliedRate(route)
  const hopCount = route.edges.length
  const staleSeconds = getRouteStaleSeconds(route)
  const degradedEdges = route.edges.filter((edge) => edge.status === 'degraded').length

  let score = impliedRate
  score -= Math.max(0, hopCount - 1) * 0.000001
  score -= staleSeconds * 0.000000001
  score -= degradedEdges * 0.00001

  return {
    route,
    impliedRate,
    score,
    hopCount,
    staleSeconds,
    degradedEdges,
  }
}

export function rankRoutes(routes: RouteCandidate[]): RankedRoute[] {
  return routes
    .map(scoreRoute)
    .sort((a, b) => b.score - a.score)
}

export function selectBestRoute(routes: RouteCandidate[]): RankedRoute | null {
  const ranked = rankRoutes(routes)

  if (ranked.length === 0) {
    return null
  }

  return ranked[0]!
}