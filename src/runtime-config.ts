export const runtimeConfig = {
  dryRun: true,
  maxGrcPerOrder: 0.25,
  cooldownMs: 30_000,
  maxOrderAgeMs: 180_000,

  tradingEnabled: process.env.TRADING_ENABLED === 'true',
  liveConfirmation: process.env.LIVE_CONFIRMATION === 'true',
  liveTestMode: process.env.LIVE_TEST_MODE === 'true',

  strategyName: 'PrivateStrategy',

  minPrivateScore: 40,
  maxTradeAgeMs: 2 * 60 * 60 * 1000,
  maxOpenBuyOrders: 1,

  minSpread: 0.10,
  targetSpread: 0.20,
  minTopBookAmount: 0.05,
  targetTopBookAmount: 5.0,
  maxAskDistanceFromLastTrade: 0.35,
  maxBidDistanceFromLastTrade: 0.15,
  maxSpread: 1.0,
} as const