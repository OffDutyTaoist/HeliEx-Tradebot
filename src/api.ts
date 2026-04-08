import { config } from './config.js'

export async function apiGet(path: string): Promise<unknown> {
  const url = new URL(path, config.heliExBaseUrl)

  const response = await fetch(url)

  if (!response.ok) {
    const body = await response.text()
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