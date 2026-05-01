import { describe, it, expect } from 'vitest'
import { normalizeText, normalizeParagraphs } from '@/lib/parsers/normalizer'

describe('normalizeText', () => {
  it('trims whitespace', () => {
    expect(normalizeText('  hello  ')).toBe('hello')
  })

  it('collapses multiple spaces', () => {
    expect(normalizeText('hello   world')).toBe('hello world')
  })

  it('decodes HTML entities', () => {
    expect(normalizeText('&amp;')).toBe('&')
    expect(normalizeText('&lt;p&gt;')).toBe('<p>')
  })

  it('strips non-breaking spaces', () => {
    expect(normalizeText('hello world')).toBe('hello world')
  })

  it('strips zero-width characters', () => {
    expect(normalizeText('hel​lo')).toBe('hello')
  })

  it('handles empty string', () => {
    expect(normalizeText('')).toBe('')
  })
})

describe('normalizeParagraphs', () => {
  it('filters empty strings after normalization', () => {
    expect(normalizeParagraphs(['', '  ', 'hello'])).toEqual(['hello'])
  })

  it('decodes entities in paragraphs', () => {
    expect(normalizeParagraphs(['hello &amp; world'])).toEqual(['hello & world'])
  })

  it('drops short paragraphs when dropShort is true', () => {
    expect(normalizeParagraphs(['hi', 'this is a long enough paragraph'], true)).toEqual([
      'this is a long enough paragraph',
    ])
  })

  it('keeps short paragraphs when dropShort is false (default)', () => {
    expect(normalizeParagraphs(['hi'])).toEqual(['hi'])
  })
})
