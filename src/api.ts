import { ExchangeUnavailableError, isCloudflareTunnelError } from './errors.js'
import { config } from './config.js'
import type { OrderBook, Trade, WalletStatus } from './types.js'

export async function apiGet(path: string): Promise<unknown> {
  const url = new URL(path, config.heliExBaseUrl)

  const response = await fetch(url)

  if (!response.ok) {
    const body = await response.text()

    if (response.status === 530 || isCloudflareTunnelError(body)) {
      throw new ExchangeUnavailableError(
        'HeliEx unavailable: Cloudflare tunnel error'
      )
    }

    throw new Error(
      `GET ${url.toString()} failed: ${response.status} ${response.statusText}\n${body}`
    )
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  return response.text()
}

export async function getOrderBook(): Promise<OrderBook> {
  return apiGet('/api/orderbook') as Promise<OrderBook>
}

export async function getTrades(): Promise<Trade[]> {
  return apiGet('/api/trades') as Promise<Trade[]>
}

export async function getWalletStatus(): Promise<WalletStatus> {
  return apiGet('/api/wallet_status') as Promise<WalletStatus>
}