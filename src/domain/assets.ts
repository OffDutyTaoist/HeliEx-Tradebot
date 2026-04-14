export const ASSETS = {
  USD: 'USD',
  USDT: 'USDT',
  BTC: 'BTC',
  GRC: 'GRC',
  CURE: 'CURE',
} as const

export type Asset = (typeof ASSETS)[keyof typeof ASSETS]

export function normalizeAssetSymbol(input: string): Asset | string {
  const value = input.trim().toUpperCase()

  if (value === 'XBT') return ASSETS.BTC
  if (value === 'BTC') return ASSETS.BTC
  if (value === 'USD') return ASSETS.USD
  if (value === 'USDT') return ASSETS.USDT
  if (value === 'GRC') return ASSETS.GRC
  if (value === 'CURE') return ASSETS.CURE

  return value
}

