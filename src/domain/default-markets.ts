import { ASSETS } from './assets.js'
import { makeMarket } from './markets.js'

export const DEFAULT_TRACKED_MARKETS = [
  makeMarket(ASSETS.BTC, ASSETS.USD),
  makeMarket(ASSETS.BTC, ASSETS.USDT),
  makeMarket(ASSETS.GRC, ASSETS.BTC),
  makeMarket(ASSETS.GRC, ASSETS.USDT),
  makeMarket(ASSETS.CURE, ASSETS.BTC),
  makeMarket(ASSETS.CURE, ASSETS.GRC),
]