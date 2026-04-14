import type { CanonicalMarket } from '../../domain/markets.js' 
export const HELIEX_MARKETS: CanonicalMarket[] = [ 
    { 
        base: 'CURE', 
        quote: 'GRC', 
        symbol: 'CURE/GRC', 
    }, 
] 

export function listHeliExMarkets(): CanonicalMarket[] { 
    return [...HELIEX_MARKETS] 
}