export function getEnvVar(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export const config = {
  heliExApiKey: getEnvVar('HELIEX_API_KEY'),
  heliExApiSecret: getEnvVar('HELIEX_API_SECRET'),
  heliExBaseUrl: process.env.HELIEX_BASE_URL || 'https://heliex.net',
} as const