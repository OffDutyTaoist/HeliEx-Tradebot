import crypto from 'node:crypto'
import { config } from './config.js'

type HttpMethod = 'GET' | 'POST'

export type Balance = {
  asset: 'GRC' | 'CURE' | string
  available: string
  locked: string
}

export type OrderStatus = 'open' | 'partial' | 'filled' | 'cancelled' | string

export type MyOrder = {
  id: number
  side: 'buy' | 'sell'
  price: string
  amount: string
  filled?: string
  status?: OrderStatus
  created_at?: string
}

export type PlaceOrderRequest = {
  side: 'buy' | 'sell'
  price: string
  amount: string
}

function buildBody(data?: unknown): string {
  return data ? JSON.stringify(data) : ''
}

function buildSignature(
  timestamp: string,
  method: HttpMethod,
  path: string,
  body: string
): string {
  const message = `${timestamp}${method}${path}${body}`

  return crypto
    .createHmac('sha256', config.heliExApiSecret)
    .update(message)
    .digest('hex')
}

async function privateRequest<T>(
  method: HttpMethod,
  path: string,
  data?: unknown
): Promise<T> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const body = buildBody(data)
  const signature = buildSignature(timestamp, method, path, body)

  const response = await fetch(new URL(path, config.heliExBaseUrl), {
    method,
    headers: {
      'X-API-Key': config.heliExApiKey,
      'X-API-Timestamp': timestamp,
      'X-API-Signature': signature,
      'Content-Type': 'application/json',
    },
    body: method === 'POST' ? body : undefined,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(
      `${method} ${path} failed: ${response.status} ${response.statusText}\n${text}`
    )
  }

  return response.json() as Promise<T>
}

export async function getBalances(): Promise<Balance[]> {
  return privateRequest<Balance[]>('GET', '/api/balances')
}

export async function getMyOrders(): Promise<MyOrder[]> {
  return privateRequest<MyOrder[]>('GET', '/api/orders')
}

export async function placeOrder(
  order: PlaceOrderRequest
): Promise<MyOrder> {
  return privateRequest<MyOrder>('POST', '/api/orders', order)
}

export async function cancelOrder(orderId: number): Promise<unknown> {
  return privateRequest('POST', `/api/orders/${orderId}/cancel`)
}