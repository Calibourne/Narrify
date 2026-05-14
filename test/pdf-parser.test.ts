import { describe, it, expect } from 'vitest'
import { parsePdfText } from '@/lib/parsers/pdf-parser'

const repeat = (text: string, n: number) => Array.from({ length: n }, (_, i) => `${text} ${i + 1}`)

describe('parsePdfText — heading-based split', () => {
  it('splits on chapter keyword headings', () => {
    const paragraphs = [
      'Chapter 1',
      'First paragraph of chapter one.',
      'Second paragraph of chapter one.',
      'Chapter 2',
      'First paragraph of chapter two.',
    ]
    const chapters = parsePdfText(paragraphs)
    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('Chapter 1')
    expect(chapters[0].paragraphs).toContain('First paragraph of chapter one.')
    expect(chapters[1].title).toBe('Chapter 2')
  })

  it('splits on numbered headings like "1. Title"', () => {
    const paragraphs = [
      '1. Introduction',
      'Some intro text here that is longer.',
      '2. Background',
      'Background content goes here.',
    ]
    const chapters = parsePdfText(paragraphs)
    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('1. Introduction')
    expect(chapters[1].title).toBe('2. Background')
  })

  it('splits on short all-caps headings', () => {
    const paragraphs = [
      'INTRODUCTION',
      'Some intro text that is long enough to not be filtered.',
      'CONCLUSION',
      'Some conclusion text that is long enough to not be filtered.',
    ]
    const chapters = parsePdfText(paragraphs)
    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('INTRODUCTION')
  })

  it('ignores heading with no following content (lone heading at end)', () => {
    const paragraphs = [
      'Chapter 1',
      'Content for chapter one.',
      'Chapter 2',
    ]
    const chapters = parsePdfText(paragraphs)
    expect(chapters).toHaveLength(1)
    expect(chapters[0].title).toBe('Chapter 1')
  })

  it('assigns sequential order starting at 0', () => {
    const paragraphs = [
      'Chapter 1', 'Text A.',
      'Chapter 2', 'Text B.',
      'Chapter 3', 'Text C.',
    ]
    const chapters = parsePdfText(paragraphs)
    expect(chapters.map((c) => c.order)).toEqual([0, 1, 2])
  })

  it('assigns pdf-N IDs', () => {
    const paragraphs = ['Chapter 1', 'Content.', 'Chapter 2', 'More content.']
    const chapters = parsePdfText(paragraphs)
    expect(chapters[0].id).toBe('pdf-0')
    expect(chapters[1].id).toBe('pdf-1')
  })

  it('recognises Russian chapter headings', () => {
    const paragraphs = [
      'Глава 1',
      'Текст первой главы.',
      'Глава 2',
      'Текст второй главы.',
    ]
    const chapters = parsePdfText(paragraphs)
    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('Глава 1')
  })
})

describe('parsePdfText — paragraph-group fallback', () => {
  it('groups into chunks of 25 paragraphs when no headings found', () => {
    const paragraphs = repeat('This is a paragraph of sufficient length.', 50)
    const chapters = parsePdfText(paragraphs)
    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('Part 1')
    expect(chapters[1].title).toBe('Part 2')
  })

  it('returns single chapter for short content with no headings', () => {
    const paragraphs = ['Just a short paragraph.', 'And another one.']
    const chapters = parsePdfText(paragraphs)
    expect(chapters).toHaveLength(1)
    expect(chapters[0].title).toBe('Part 1')
  })

  it('assigns sequential order in fallback mode', () => {
    const paragraphs = repeat('A paragraph that is long enough to count.', 75)
    const chapters = parsePdfText(paragraphs)
    expect(chapters.map((c) => c.order)).toEqual([0, 1, 2])
  })
})
