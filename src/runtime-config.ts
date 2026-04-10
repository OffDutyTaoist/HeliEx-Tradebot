export const runtimeConfig = {
  dryRun: true,
  maxGrcPerOrder: 0.25,
  cooldownMs: 30_000,
  tradingEnabled: process.env.TRADING_ENABLED === 'true',
  liveConfirmation: process.env.LIVE_CONFIRMATION === 'true',
  strategyName: 'PrivateStrategy',
} as const