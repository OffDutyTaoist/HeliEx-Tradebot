export class ExchangeUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExchangeUnavailableError'
  }
}

export function isCloudflareTunnelError(body: string): boolean {
  const text = body.toLowerCase()

  return (
    text.includes('cloudflare tunnel error') ||
    text.includes('error 1033') ||
    text.includes('unable to resolve it')
  )
}