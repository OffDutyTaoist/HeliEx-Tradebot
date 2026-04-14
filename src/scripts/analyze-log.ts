import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

type LogEntry = {
  ts: string
  bid: number
  bidAmount: number
  ask: number
  askAmount: number
  spread: number
  last: number | null
  lastTradeTime?: string | null
  state: string
  score: number
  label: string | null
  shouldTrade: boolean
  walletsOnline: boolean
  grcOnline: boolean
  cureOnline: boolean
}

type StateCounts = Record<string, number>
type LabelCounts = Record<string, number>

async function getLogFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl'))
    .map((entry) => join(dir, entry.name))
    .sort()
}

function parseJsonLines(content: string): LogEntry[] {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const parsed: LogEntry[] = []

  for (const line of lines) {
    try {
      parsed.push(JSON.parse(line) as LogEntry)
    } catch (error) {
      console.warn(`Skipping invalid JSONL line: ${line.slice(0, 120)}`)
    }
  }

  return parsed
}

function incrementCount(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1
}

function formatNumber(value: number, digits = 8): string {
  return value.toFixed(digits)
}

async function main(): Promise<void> {
  const logDir = 'logs'
  const files = await getLogFiles(logDir)

  if (files.length === 0) {
    console.log('No log files found in logs/')
    return
  }

  const allEntries: LogEntry[] = []

  for (const file of files) {
    const content = await readFile(file, 'utf8')
    const entries = parseJsonLines(content)
    allEntries.push(...entries)
  }

  if (allEntries.length === 0) {
    console.log('No valid log entries found.')
    return
  }

  const totalEntries = allEntries.length
  const averageSpread =
    allEntries.reduce((sum, entry) => sum + entry.spread, 0) / totalEntries
  const highestScore = Math.max(...allEntries.map((entry) => entry.score))
  const shouldTradeCount = allEntries.filter((entry) => entry.shouldTrade).length

  const stateCounts: StateCounts = {}
  const labelCounts: LabelCounts = {}

  for (const entry of allEntries) {
    incrementCount(stateCounts, entry.state)

    if (entry.label) {
      incrementCount(labelCounts, entry.label)
    }
  }

  const bestEntry = allEntries.reduce((best, current) => {
    if (!best) return current
    if (current.score > best.score) return current
    return best
  }, null as LogEntry | null)

  console.log('\n=== HeliEx Log Analysis ===')
  console.log(`Files analyzed: ${files.length}`)
  console.log(`Entries analyzed: ${totalEntries}`)
  console.log(`Average spread: ${formatNumber(averageSpread)}`)
  console.log(`Highest score: ${highestScore}/100`)
  console.log(`Would-trade entries: ${shouldTradeCount}`)

  console.log('\n--- State Counts ---')
  for (const [state, count] of Object.entries(stateCounts).sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    console.log(`${state}: ${count}`)
  }

  console.log('\n--- Label Counts ---')
  if (Object.keys(labelCounts).length === 0) {
    console.log('No labels recorded')
  } else {
    for (const [label, count] of Object.entries(labelCounts).sort((a, b) =>
      a[0].localeCompare(b[0])
    )) {
      console.log(`${label}: ${count}`)
    }
  }

  if (bestEntry) {
    console.log('\n--- Best Entry Seen ---')
    console.log(`Timestamp: ${bestEntry.ts}`)
    console.log(`State: ${bestEntry.state}`)
    console.log(`Score: ${bestEntry.score}/100`)
    console.log(`Label: ${bestEntry.label ?? 'none'}`)
    console.log(`Should trade: ${bestEntry.shouldTrade ? 'yes' : 'no'}`)
    console.log(
      `Bid/Ask: ${formatNumber(bestEntry.bid)} / ${formatNumber(bestEntry.ask)}`
    )
    console.log(`Spread: ${formatNumber(bestEntry.spread)}`)
    console.log(
      `Liquidity: bid=${formatNumber(bestEntry.bidAmount)} ask=${formatNumber(bestEntry.askAmount)}`
    )
    console.log(`Last trade: ${bestEntry.last ?? 'N/A'}`)
    console.log(
      `Wallets online: ${bestEntry.walletsOnline ? 'yes' : 'no'} | GRC: ${bestEntry.grcOnline ? 'yes' : 'no'} | CURE: ${bestEntry.cureOnline ? 'yes' : 'no'}`
    )
  }
}

main().catch((err) => {
  console.error('Log analysis failed:')
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})