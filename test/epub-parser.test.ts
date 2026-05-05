import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { EpubParser } from '@/lib/parsers/epub-parser'

const fixturePath = join(__dirname, 'fixtures/sample.epub')

describe('EpubParser', () => {
  it('parses chapters from fixture', async () => {
    const buffer = readFileSync(fixturePath)
    const parser = new EpubParser()
    const chapters = await parser.parse(buffer)
    expect(chapters.length).toBeGreaterThan(0)
  })

  it('sets order starting at 0', async () => {
    const buffer = readFileSync(fixturePath)
    const chapters = await new EpubParser().parse(buffer)
    expect(chapters[0].order).toBe(0)
  })

  it('produces no empty paragraphs', async () => {
    const buffer = readFileSync(fixturePath)
    const chapters = await new EpubParser().parse(buffer)
    for (const ch of chapters) {
      for (const p of ch.paragraphs) {
        expect(p.length).toBeGreaterThan(0)
      }
    }
  })

  it('produces no raw HTML tags in paragraphs', async () => {
    const buffer = readFileSync(fixturePath)
    const chapters = await new EpubParser().parse(buffer)
    const htmlTagRe = /<[^>]+>/
    for (const ch of chapters) {
      for (const p of ch.paragraphs) {
        expect(htmlTagRe.test(p)).toBe(false)
      }
    }
  })

  it('is deterministic', async () => {
    const buffer = readFileSync(fixturePath)
    const parser = new EpubParser()
    const first = await parser.parse(buffer)
    const second = await parser.parse(buffer)
    expect(first).toEqual(second)
  })

  it('extracts chapter titles', async () => {
    const buffer = readFileSync(fixturePath)
    const chapters = await new EpubParser().parse(buffer)
    expect(chapters[0].title).toBe('Chapter One')
    expect(chapters[1].title).toBe('Chapter Two')
  })

  it('throws on invalid buffer', async () => {
    const parser = new EpubParser()
    await expect(parser.parse(Buffer.from('not an epub'))).rejects.toThrow()
  })

  it('works without onProgress callback', async () => {
    const buffer = readFileSync(fixturePath)
    await expect(new EpubParser().parse(buffer)).resolves.not.toThrow()
  })
})
