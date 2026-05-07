import { describe, it, expect } from 'vitest'
import { getLocale } from '@/lib/tts/langMap'

describe('getLocale', () => {
  it('maps English ISO code to en-US', () => {
    expect(getLocale('eng')).toBe('en-US')
  })

  it('maps Japanese ISO code to ja-JP', () => {
    expect(getLocale('jpn')).toBe('ja-JP')
  })

  it('maps French ISO code to fr-FR', () => {
    expect(getLocale('fra')).toBe('fr-FR')
  })

  it('maps Chinese ISO code to zh-CN', () => {
    expect(getLocale('zho')).toBe('zh-CN')
  })

  it('falls back to en-US for unknown codes', () => {
    expect(getLocale('xyz')).toBe('en-US')
  })

  it('falls back to en-US for undetermined (und)', () => {
    expect(getLocale('und')).toBe('en-US')
  })
})
