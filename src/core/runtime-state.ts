let lastActionTime = 0

export function getLastActionTime(): number {
  return lastActionTime
}

export function setLastActionTime(timestamp: number): void {
  lastActionTime = timestamp
}