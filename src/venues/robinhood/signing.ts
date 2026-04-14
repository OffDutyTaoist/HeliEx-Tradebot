import nacl from 'tweetnacl'

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export interface RobinhoodAuthHeaders {
  'x-api-key': string
  'x-timestamp': string
  'x-signature': string
}

function buildSigningMessage(args: {
  apiKey: string
  timestamp: string
  path: string
  method: string
  body?: string
}): string {
  const body = args.body ?? ''
  return `${args.apiKey}${args.timestamp}${args.path}${args.method.toUpperCase()}${body}`
}

export function buildRobinhoodAuthHeaders(args: {
  method: string
  path: string
  body?: string
}): RobinhoodAuthHeaders {
  const apiKey = requiredEnv('ROBINHOOD_API_KEY')
  const privateKeyBase64 = requiredEnv('ROBINHOOD_PRIVATE_KEY_BASE64')

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const seed = Buffer.from(privateKeyBase64, 'base64')

  if (seed.length !== 32) {
    throw new Error(
      `Robinhood private key must decode to 32 bytes, got ${seed.length} bytes`,
    )
  }

  const message = buildSigningMessage({
    apiKey,
    timestamp,
    path: args.path,
    method: args.method,
    ...(args.body !== undefined ? { body: args.body } : {}),
  })

  if (process.env.DEBUG_ROBINHOOD_SIGNING === '1') {
    console.log('--- Robinhood Signing Debug ---')
    console.log({
      method: args.method.toUpperCase(),
      path: args.path,
      hasBody: args.body !== undefined && args.body !== '',
      timestamp,
      timestampLength: timestamp.length,
      seedLength: seed.length,
      messageLength: message.length,
      messagePrefix: `${apiKey.slice(0, 10)}...`,
    })
  }

  const keyPair = nacl.sign.keyPair.fromSeed(new Uint8Array(seed))
  const signature = nacl.sign.detached(
    new TextEncoder().encode(message),
    keyPair.secretKey,
  )

  return {
    'x-api-key': apiKey,
    'x-timestamp': timestamp,
    'x-signature': Buffer.from(signature).toString('base64'),
  }
}