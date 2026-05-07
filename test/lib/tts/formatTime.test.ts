import { describe, it, expect } from 'vitest'
import { formatElapsed, formatEta } from '@/lib/tts/formatTime'

describe('formatElapsed', () => {
  it('formats zero as 0:00', () => {
    expect(formatElapsed(0)).toBe('0:00')
  })
  it('pads single-digit seconds', () => {
    expect(formatElapsed(7)).toBe('0:07')
  })
  it('formats over a minute', () => {
    expect(formatElapsed(83)).toBe('1:23')
  })
})

describe('formatEta', () => {
  it('returns null when no segments done yet', () => {
    expect(formatEta(30, 0, 10, 0)).toBeNull()
  })
  it('shows ~N min when over a minute remains', () => {
    // 60s elapsed for 2 of 10 segments → 8 remaining × 30s = 240s = ~4 min
    const result = formatEta(60, 2, 10, 0)
    expect(result).toMatch(/~4 min/)
  })
  it('shows <1 min when under 60 seconds remains', () => {
    // 10s elapsed for 5 of 6 segments → 1 remaining × 2s = 2s
    const result = formatEta(10, 5, 6, 0)
    expect(result).toMatch(/<1 min/)
  })
  it('shows <1 min when 45 seconds remain', () => {
    // 45s elapsed, 1 of 2 done → 1 remaining × 45s = 45s remaining
    const result = formatEta(45, 1, 2, 0)
    expect(result).toMatch(/<1 min/)
  })
  it('returns null when all segments are done', () => {
    expect(formatEta(60, 10, 10, 0)).toBeNull()
  })
})
