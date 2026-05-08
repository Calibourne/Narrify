import { describe, it, expect } from 'vitest'
import { TxtParser, parsePlainText } from '@/lib/parsers/txt-parser'

describe('parsePlainText', () => {
  it('splits on chapter headings', () => {
    const text = 'Chapter 1\nHello world\n\nChapter 2\nGoodbye world'
    const chapters = parsePlainText(text, 'book')
    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('Chapter 1')
    expect(chapters[0].paragraphs[0]).toContain('Hello world')
    expect(chapters[1].title).toBe('Chapter 2')
  })

  it('splits on double blank lines when no headings found', () => {
    const text = 'First section text here.\n\n\nSecond section text here.'
    const chapters = parsePlainText(text, 'book')
    expect(chapters).toHaveLength(2)
  })

  it('returns single chapter when no markers found', () => {
    const text = 'Just some plain text with no structure.'
    const chapters = parsePlainText(text, 'my-title')
    expect(chapters).toHaveLength(1)
    expect(chapters[0].title).toBe('my-title')
  })

  it('assigns sequential order', () => {
    const text = 'Chapter 1\nA\n\nChapter 2\nB'
    const chapters = parsePlainText(text, 'book')
    expect(chapters[0].order).toBe(0)
    expect(chapters[1].order).toBe(1)
  })

  it('strips .txt extension from title', () => {
    const chapters = parsePlainText('some text', 'book.txt')
    expect(chapters[0].title).toBe('book')
  })

  it('recognises Russian chapter headings', () => {
    const text = 'Глава 1\nТекст\n\nГлава 2\nЕщё'
    const chapters = parsePlainText(text, 'книга')
    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('Глава 1')
  })
})

describe('TxtParser', () => {
  it('implements BookParser.parse(buffer)', async () => {
    const parser = new TxtParser('hello.txt')
    const buffer = new TextEncoder().encode('Chapter 1\nHello world')
    const chapters = await parser.parse(buffer)
    expect(chapters).toHaveLength(1)
    expect(chapters[0].title).toBe('Chapter 1')
  })
})
