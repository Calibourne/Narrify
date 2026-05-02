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

  it('calls onProgress for each section processed', async () => {
    const buffer = readFileSync(fixturePath)
    const calls: Array<{ done: number; total: number }> = []
    const chapters = await new Fb2Parser().parse(buffer, (done, total) => {
      calls.push({ done, total })
    })
    expect(calls.length).toBe(chapters.length)
    for (let i = 1; i < calls.length; i++) {
      expect(calls[i].done).toBe(calls[i - 1].done + 1)
    }
    const total = calls[0].total
    expect(calls.every((c) => c.total === total)).toBe(true)
    expect(calls[calls.length - 1].done).toBe(total)
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

  it('awaits async onProgress callbacks between section updates', async () => {
    const buffer = readFileSync(fixturePath)
    let releaseFirstProgress: (() => void) | null = null
    let callbackCount = 0
    let parseSettled = false
    let resolveFirstProgressSeen: (() => void) | null = null
    const firstProgressSeen = new Promise<void>((resolve) => {
      resolveFirstProgressSeen = resolve
    })

    const parsePromise = new Fb2Parser().parse(buffer, async () => {
      callbackCount += 1
      if (callbackCount === 1) {
        resolveFirstProgressSeen?.()
        await new Promise<void>((resolve) => {
          releaseFirstProgress = resolve
        })
      }
    }).finally(() => {
      parseSettled = true
    })

    await firstProgressSeen
    expect(callbackCount).toBe(1)
    expect(parseSettled).toBe(false)

    releaseFirstProgress?.()
    await parsePromise
    expect(callbackCount).toBeGreaterThan(1)
  })
})
