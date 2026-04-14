import type { MarketEdge, MarketGraph, RouteCandidate, VenueStatus } from '../core/market-graph.js'

export interface DiscoverRoutesOptions {
  maxHops?: number
  includeDegraded?: boolean
  includeUnresolved?: boolean
}

function isAllowedStatus(
  status: VenueStatus,
  options: DiscoverRoutesOptions
): boolean {
  if (status === 'ok') return true
  if (status === 'degraded') return options.includeDegraded ?? false
  if (status === 'unresolved') return options.includeUnresolved ?? false
  return false
}

export function discoverRoutes(
  graph: MarketGraph,
  startAsset: string,
  endAsset?: string,
  options: DiscoverRoutesOptions = {}
): RouteCandidate[] {
  const maxHops = options.maxHops ?? 3
  const routes: RouteCandidate[] = []

  function walk(
    currentAsset: string,
    visitedAssets: Set<string>,
    path: MarketEdge[]
  ): void {
    if (path.length > maxHops) return

    if (path.length > 0 && (!endAsset || currentAsset === endAsset)) {
      routes.push({
        startAsset,
        endAsset: currentAsset,
        edges: [...path],
      })
    }

    if (path.length === maxHops) return

    const nextEdges = graph.adjacency.get(currentAsset) ?? []

    for (const edge of nextEdges) {
      if (!isAllowedStatus(edge.status, options)) continue
      if (visitedAssets.has(edge.to)) continue

      path.push(edge)
      visitedAssets.add(edge.to)
      walk(edge.to, visitedAssets, path)
      visitedAssets.delete(edge.to)
      path.pop()
    }
  }

  walk(startAsset, new Set([startAsset]), [])
  return endAsset ? routes.filter((route) => route.endAsset === endAsset) : routes
}

export function summarizeRoute(route: RouteCandidate): string {
  const parts = [route.startAsset]

  for (const edge of route.edges) {
    parts.push(edge.to)
  }

  return parts.join(' -> ')
}