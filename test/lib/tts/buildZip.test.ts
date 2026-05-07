// @vitest-environment jsdom
// test/lib/tts/buildZip.test.ts
import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import type { Chapter } from '@/lib/parsers/types'
import { buildZip, slugifyTitle } from '@/lib/tts/buildZip'

describe('slugifyTitle', () => {
  it('lowercases and replaces non-alphanumeric with hyphens', () => {
    expect(slugifyTitle('Chapter One!', 'fallback')).toBe('chapter-one')
  })

  it('uses fallback when title is undefined', () => {
    expect(slugifyTitle(undefined, 'ch-0')).toBe('ch-0')
  })

  it('strips leading and trailing hyphens', () => {
    expect(slugifyTitle('  Hello  ', 'x')).toBe('hello')
  })
})

describe('buildZip', () => {
  const chapters: Chapter[] = [
    { id: 'ch-0', title: 'Introduction', paragraphs: [], order: 0 },
    { id: 'ch-1', title: 'Chapter One', paragraphs: [], order: 1 },
  ]

  it('produces a Blob', async () => {
    const audios = new Map<string, Uint8Array>([
      ['ch-0', new Uint8Array([1, 2, 3])],
      ['ch-1', new Uint8Array([4, 5, 6])],
    ])
    const blob = await buildZip(chapters, audios)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('names files with zero-padded order and slugified title', async () => {
    const audios = new Map<string, Uint8Array>([
      ['ch-0', new Uint8Array([1])],
      ['ch-1', new Uint8Array([2])],
    ])
    const blob = await buildZip(chapters, audios)
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    expect(zip.file('1-introduction.mp3')).not.toBeNull()
    expect(zip.file('2-chapter-one.mp3')).not.toBeNull()
  })

  it('skips chapters with no audio buffer', async () => {
    const audios = new Map<string, Uint8Array>([
      ['ch-0', new Uint8Array([1])],
      // ch-1 missing
    ])
    const blob = await buildZip(chapters, audios)
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    expect(zip.file('1-introduction.mp3')).not.toBeNull()
    expect(zip.file('2-chapter-one.mp3')).toBeNull()
  })
})
