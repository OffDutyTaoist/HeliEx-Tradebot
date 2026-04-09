import { appendFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

export async function appendJsonLine(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await appendFile(path, JSON.stringify(data) + '\n', 'utf8')
}

