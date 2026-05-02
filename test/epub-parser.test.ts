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

  it('calls onProgress for each item processed', async () => {
    const buffer = readFileSync(fixturePath)
    const calls: Array<{ done: number; total: number }> = []
    await new EpubParser().parse(buffer, (done, total) => {
      calls.push({ done, total })
    })
    expect(calls.length).toBeGreaterThan(0)
    expect(calls[0].done).toBe(0)
    expect(calls[0].total).toBeGreaterThan(0)
    for (let i = 2; i < calls.length; i++) {
      expect(calls[i].done).toBe(calls[i - 1].done + 1)
    }
    const total = calls[0].total
    expect(calls.every((c) => c.total === total)).toBe(true)
    expect(calls[calls.length - 1].done).toBe(total)
  })

  it('works without onProgress callback', async () => {
    const buffer = readFileSync(fixturePath)
    await expect(new EpubParser().parse(buffer)).resolves.not.toThrow()
  })

  it('awaits async onProgress callbacks between chapter updates', async () => {
    const buffer = readFileSync(fixturePath)
    let releaseFirstProgress: (() => void) | null = null
    let callbackCount = 0
    let parseSettled = false
    let resolveFirstProgressSeen: (() => void) | null = null
    const firstProgressSeen = new Promise<void>((resolve) => {
      resolveFirstProgressSeen = resolve
    })

    const parsePromise = new EpubParser().parse(buffer, async () => {
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
