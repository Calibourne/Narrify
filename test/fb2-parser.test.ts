import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { Fb2Parser } from '@/lib/parsers/fb2-parser'

const fixturePath = join(__dirname, 'fixtures/sample.fb2')

describe('Fb2Parser', () => {
  it('parses chapters from fixture', async () => {
    const buffer = readFileSync(fixturePath)
    const parser = new Fb2Parser()
    const chapters = await parser.parse(buffer)
    expect(chapters.length).toBeGreaterThan(0)
  })

  it('sets order starting at 0', async () => {
    const buffer = readFileSync(fixturePath)
    const chapters = await new Fb2Parser().parse(buffer)
    expect(chapters[0].order).toBe(0)
  })

  it('produces no empty paragraphs', async () => {
    const buffer = readFileSync(fixturePath)
    const chapters = await new Fb2Parser().parse(buffer)
    for (const ch of chapters) {
      for (const p of ch.paragraphs) {
        expect(p.length).toBeGreaterThan(0)
      }
    }
  })

  it('produces no raw XML tags in paragraphs', async () => {
    const buffer = readFileSync(fixturePath)
    const chapters = await new Fb2Parser().parse(buffer)
    const tagRe = /<[^>]+>/
    for (const ch of chapters) {
      for (const p of ch.paragraphs) {
        expect(tagRe.test(p)).toBe(false)
      }
    }
  })

  it('is deterministic', async () => {
    const buffer = readFileSync(fixturePath)
    const parser = new Fb2Parser()
    const first = await parser.parse(buffer)
    const second = await parser.parse(buffer)
    expect(first).toEqual(second)
  })

  it('extracts chapter titles', async () => {
    const buffer = readFileSync(fixturePath)
    const chapters = await new Fb2Parser().parse(buffer)
    expect(chapters[0].title).toBe('Chapter One')
    expect(chapters[1].title).toBe('Chapter Two')
  })

  it('falls back to single chapter when no sections', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
  <body>
    <p>Only paragraph here, no sections.</p>
  </body>
</FictionBook>`
    const parser = new Fb2Parser()
    const chapters = await parser.parse(Buffer.from(xml))
    expect(chapters.length).toBe(1)
    expect(chapters[0].order).toBe(0)
  })
})
