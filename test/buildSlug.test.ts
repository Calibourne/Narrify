import { describe, it, expect } from 'vitest'
import { deriveBuildVisuals } from '@/lib/buildSlug'

describe('deriveBuildVisuals', () => {
  it('returns hue in 0-359 range', () => {
    const { hue } = deriveBuildVisuals('a3f9c2d1e4b5f6a7')
    expect(hue).toBeGreaterThanOrEqual(0)
    expect(hue).toBeLessThan(360)
  })

  it('returns a hyphenated two-word name', () => {
    const { name } = deriveBuildVisuals('a3f9c2d1e4b5f6a7')
    expect(name).toMatch(/^[a-z]+-[a-z]+$/)
  })

  it('is deterministic for the same input', () => {
    const sha = 'deadbeef1234'
    expect(deriveBuildVisuals(sha)).toEqual(deriveBuildVisuals(sha))
  })

  it('produces different results for different SHAs', () => {
    expect(deriveBuildVisuals('000000')).not.toEqual(deriveBuildVisuals('ffffff'))
  })

  it('handles the "dev" fallback string without throwing', () => {
    const { hue, name } = deriveBuildVisuals('dev')
    expect(hue).toBeGreaterThanOrEqual(0)
    expect(hue).toBeLessThan(360)
    expect(name).toMatch(/^[a-z]+-[a-z]+$/)
  })
})
