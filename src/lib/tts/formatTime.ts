export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatEta(
  elapsed: number,
  done: number,
  total: number,
  now = Date.now(),
): string | null {
  if (done === 0 || done >= total) return null
  const secsPerSegment = elapsed / done
  const remaining = Math.round(secsPerSegment * (total - done))
  const completesAt = new Date(now + remaining * 1000)
  const hhmm = completesAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return remaining < 60
    ? `Will complete at ${hhmm} (<1 min)`
    : `Will complete at ${hhmm} (~${Math.round(remaining / 60)} min)`
}
