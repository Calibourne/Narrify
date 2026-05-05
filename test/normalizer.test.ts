import { describe, it, expect, vi, afterEach } from 'vitest'
import { normalizeText, normalizeParagraphs, splitLongParagraphs } from '@/lib/parsers/normalizer'

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

describe('splitLongParagraphs', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('passes short paragraphs through unchanged', () => {
    const input = ['Hello world.', 'Second paragraph.']
    expect(splitLongParagraphs(input)).toEqual(input)
  })

  it('splits a paragraph with embedded newlines', () => {
    const line1 = 'First line of text that stands alone.'
    const line2 = 'Second line of text that stands alone.'
    const result = splitLongParagraphs([`${line1}\n${line2}`])
    expect(result).toEqual([line1, line2])
  })

  it('splits a long CJK paragraph on sentence endings', () => {
    const sentence = '或日の暮方の事である。一人の下人が、羅生門の下で雨やみを待っていた。'
    // 34 chars × 10 = 340 chars, well over the 300-char limit
    const longCJK = sentence.repeat(10)
    const result = splitLongParagraphs([longCJK])
    expect(result.length).toBeGreaterThan(1)
    result.forEach((chunk) => expect(chunk.length).toBeLessThanOrEqual(300))
  })

  it('splits a long Western paragraph on sentence endings', () => {
    const sentence = 'The quick brown fox jumps over the lazy dog near the river bank. '
    const longWestern = sentence.repeat(6)
    const result = splitLongParagraphs([longWestern.trim()])
    expect(result.length).toBeGreaterThan(1)
    result.forEach((chunk) => expect(chunk.length).toBeLessThanOrEqual(300))
  })

  it('merges orphan chunks shorter than 50 chars into adjacent chunk', () => {
    // With maxLength=80: sent1 (76 chars) fills a chunk, sent2 (4 chars) becomes an
    // orphan since 76+4=80 but adding the space makes 81 > 80. mergeOrphans absorbs it.
    const sent1 = 'The fox ran quickly through the forest and leaped over the wide stream.'
    const sent2 = 'Yes.'
    const result = splitLongParagraphs([`${sent1} ${sent2}`], 80)
    result.forEach((chunk) => expect(chunk.length).toBeGreaterThanOrEqual(50))
  })

  it('falls back to regex splitting when Intl.Segmenter throws', () => {
    vi.stubGlobal('Intl', {
      ...Intl,
      Segmenter: class {
        constructor() { throw new Error('not supported') }
      },
    })

    const sentence = 'The fox jumped. The dog barked. The cat ran. The bird flew away quickly. '
    const longPara = sentence.repeat(5)
    const result = splitLongParagraphs([longPara.trim()])
    expect(result.length).toBeGreaterThan(1)
    result.forEach((chunk) => expect(chunk.length).toBeLessThanOrEqual(300))
  })

  it('splits a single sentence longer than maxLength by word boundaries', () => {
    // 400-char sentence with no punctuation — no sentence boundary possible
    const longSentence = 'word '.repeat(80).trim()
    const result = splitLongParagraphs([longSentence])
    expect(result.length).toBeGreaterThan(1)
    result.forEach((chunk) => expect(chunk.length).toBeLessThanOrEqual(300))
  })

  it('does not merge orphan when doing so would exceed maxLength', () => {
    // With maxLength=80: a 75-char sentence + a 40-char sentence stay separate
    // (75+40=115 > 80). The 40-char orphan is NOT merged since it would overflow.
    const sent1 = 'The fox ran quickly through the forest and leaped high.'
    const sent2 = 'Yes, it did so beautifully and swiftly.'
    const result = splitLongParagraphs([`${sent1} ${sent2}`], 80)
    result.forEach((chunk) => expect(chunk.length).toBeLessThanOrEqual(80))
  })
})
