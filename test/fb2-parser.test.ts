import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import JSZip from 'jszip'
import { Fb2Parser } from '@/lib/parsers/fb2-parser'

const fixturePath = join(__dirname, 'fixtures/sample.fb2')

async function makeFb2Zip(entryName = 'book.fb2'): Promise<Uint8Array> {
  const fb2Bytes = readFileSync(join(__dirname, 'fixtures/sample.fb2'))
  const zip = new JSZip()
  zip.file(entryName, fb2Bytes)
  return new Uint8Array(await zip.generateAsync({ type: 'arraybuffer' }))
}

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

  it('works without onProgress callback', async () => {
    const buffer = readFileSync(fixturePath)
    await expect(new Fb2Parser().parse(buffer)).resolves.not.toThrow()
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

  it('parses chapters from a .fb2.zip buffer', async () => {
    const zipBuffer = await makeFb2Zip()
    const chapters = await new Fb2Parser().parse(zipBuffer)
    expect(chapters.length).toBeGreaterThan(0)
  })

  it('throws when ZIP contains no .fb2 entry', async () => {
    const zip = new JSZip()
    zip.file('readme.txt', 'hello')
    const buffer = new Uint8Array(await zip.generateAsync({ type: 'arraybuffer' }))
    await expect(new Fb2Parser().parse(buffer)).rejects.toThrow(
      'No .fb2 file found inside the uploaded ZIP archive'
    )
  })
})
