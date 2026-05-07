# Edge-TTS Chapter Synthesis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synthesize each parsed book chapter into an MP3 via `edge-tts-universal`, with per-language voice selection, in-browser preview, and ZIP download.

**Architecture:** Client posts one chapter at a time to `/api/synthesize/chapter`; the server synthesizes it with `EdgeTTS` and streams back raw MP3. A `useSynthesis` hook orchestrates detection → voice picking → sequential synthesis → JSZip assembly. Voice selection is per detected language (using `franc`), not per book.

**Tech Stack:** `edge-tts-universal`, `franc`, `jszip` (already installed), Vitest, `@testing-library/react`, Next.js App Router API routes.

---

## File Map

| File | Status | Role |
|------|--------|------|
| `src/lib/tts/langMap.ts` | Create | ISO 639-3 → BCP47 locale lookup |
| `src/lib/tts/buildZip.ts` | Create | Assemble chapter MP3s into a JSZip blob |
| `src/app/api/voices/detect/route.ts` | Create | POST: detect language per chapter, return grouped voices |
| `src/app/api/synthesize/chapter/route.ts` | Create | POST: synthesize one chapter, return MP3 binary |
| `src/hooks/useSynthesis.ts` | Create | Client hook: detect → select → synthesize → zip |
| `src/components/VoicePicker.tsx` | Create | Per-locale voice dropdown |
| `src/components/VoicePicker.module.css` | Create | Styles |
| `src/components/SynthesisPanel.tsx` | Create | Progress UI + download button (uses useSynthesis) |
| `src/components/SynthesisPanel.module.css` | Create | Styles |
| `src/app/page.tsx` | Modify | Add `<SynthesisPanel>` after book parsed |
| `test/lib/tts/langMap.test.ts` | Create | Unit tests for locale mapping |
| `test/lib/tts/buildZip.test.ts` | Create | Unit tests for ZIP assembly |
| `test/api/voices-detect.test.ts` | Create | Route handler tests (mocked franc + VoicesManager) |
| `test/api/synthesize-chapter.test.ts` | Create | Route handler tests (mocked EdgeTTS) |
| `test/hooks/useSynthesis.test.ts` | Create | Hook tests (mocked fetch) |
| `test/components/VoicePicker.test.tsx` | Create | Component render tests |
| `test/components/SynthesisPanel.test.tsx` | Create | Component render tests |

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json` (via npm install)
- Create: `next.config.ts` (server external packages)

- [ ] **Step 1: Install packages**

```bash
npm install franc edge-tts-universal
```

Expected: both packages added to `node_modules/` and `package.json` dependencies.

- [ ] **Step 2: Create `next.config.ts` to mark edge-tts-universal as server-external**

`edge-tts-universal` uses native WebSocket features that must not be bundled by Next.js.

```ts
// next.config.ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  serverExternalPackages: ['edge-tts-universal'],
}

export default config
```

- [ ] **Step 3: Verify the dev server starts**

```bash
npm run dev
```

Expected: server starts on port 3000 with no import errors. Stop with Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json next.config.ts
git commit -m "chore: install edge-tts-universal and franc"
```

---

## Task 2: Language Map Utility

**Files:**
- Create: `src/lib/tts/langMap.ts`
- Create: `test/lib/tts/langMap.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/lib/tts/langMap.test.ts
import { describe, it, expect } from 'vitest'
import { getLocale } from '@/lib/tts/langMap'

describe('getLocale', () => {
  it('maps English ISO code to en-US', () => {
    expect(getLocale('eng')).toBe('en-US')
  })

  it('maps Japanese ISO code to ja-JP', () => {
    expect(getLocale('jpn')).toBe('ja-JP')
  })

  it('maps French ISO code to fr-FR', () => {
    expect(getLocale('fra')).toBe('fr-FR')
  })

  it('maps Chinese ISO code to zh-CN', () => {
    expect(getLocale('zho')).toBe('zh-CN')
  })

  it('falls back to en-US for unknown codes', () => {
    expect(getLocale('xyz')).toBe('en-US')
  })

  it('falls back to en-US for undetermined (und)', () => {
    expect(getLocale('und')).toBe('en-US')
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- test/lib/tts/langMap.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/tts/langMap'`

- [ ] **Step 3: Implement `langMap.ts`**

```ts
// src/lib/tts/langMap.ts
const ISO_TO_BCP47: Record<string, string> = {
  eng: 'en-US',
  jpn: 'ja-JP',
  fra: 'fr-FR',
  deu: 'de-DE',
  spa: 'es-ES',
  ita: 'it-IT',
  por: 'pt-BR',
  rus: 'ru-RU',
  zho: 'zh-CN',
  kor: 'ko-KR',
  ara: 'ar-SA',
  nld: 'nl-NL',
  pol: 'pl-PL',
  swe: 'sv-SE',
  nor: 'nb-NO',
  dan: 'da-DK',
  fin: 'fi-FI',
  tur: 'tr-TR',
  hin: 'hi-IN',
  vie: 'vi-VN',
  tha: 'th-TH',
  ind: 'id-ID',
  msa: 'ms-MY',
  ces: 'cs-CZ',
  ron: 'ro-RO',
  hun: 'hu-HU',
  ukr: 'uk-UA',
  cat: 'ca-ES',
}

const FALLBACK = 'en-US'

export function getLocale(iso639_3: string): string {
  return ISO_TO_BCP47[iso639_3] ?? FALLBACK
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- test/lib/tts/langMap.test.ts
```

Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/tts/langMap.ts test/lib/tts/langMap.test.ts
git commit -m "feat: add ISO 639-3 to BCP47 locale mapping"
```

---

## Task 3: ZIP Assembly Utility

**Files:**
- Create: `src/lib/tts/buildZip.ts`
- Create: `test/lib/tts/buildZip.test.ts`

- [ ] **Step 1: Write the failing test**

The test runs in jsdom (needed for `Blob`).

```ts
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
```

- [ ] **Step 2: Run to confirm fail**

```bash
npm test -- test/lib/tts/buildZip.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/tts/buildZip'`

- [ ] **Step 3: Implement `buildZip.ts`**

```ts
// src/lib/tts/buildZip.ts
import JSZip from 'jszip'
import type { Chapter } from '@/lib/parsers/types'

export function slugifyTitle(title: string | undefined, fallback: string): string {
  const raw = (title ?? fallback).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return raw || fallback
}

export async function buildZip(chapters: Chapter[], audios: Map<string, Uint8Array>): Promise<Blob> {
  const zip = new JSZip()
  const total = chapters.length
  const padLen = String(total).length
  for (const ch of chapters) {
    const buf = audios.get(ch.id)
    if (!buf) continue
    const num = String(ch.order + 1).padStart(padLen, '0')
    const slug = slugifyTitle(ch.title, ch.id)
    zip.file(`${num}-${slug}.mp3`, buf)
  }
  return zip.generateAsync({ type: 'blob' })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- test/lib/tts/buildZip.test.ts
```

Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/tts/buildZip.ts test/lib/tts/buildZip.test.ts
git commit -m "feat: add ZIP assembly utility for chapter MP3s"
```

---

## Task 4: Voice Detection API Route

**Files:**
- Create: `src/app/api/voices/detect/route.ts`
- Create: `test/api/voices-detect.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/api/voices-detect.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('franc', () => ({
  franc: vi.fn(() => 'eng'),
}))

vi.mock('edge-tts-universal', () => ({
  VoicesManager: {
    create: vi.fn(async () => ({
      find: vi.fn(() => [
        { ShortName: 'en-US-AriaNeural', FriendlyName: 'Aria', Locale: 'en-US', Gender: 'Female' },
        { ShortName: 'en-US-GuyNeural', FriendlyName: 'Guy', Locale: 'en-US', Gender: 'Male' },
      ]),
    })),
  },
}))

import { franc } from 'franc'
import { POST } from '@/app/api/voices/detect/route'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/voices/detect', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => vi.mocked(franc).mockReturnValue('eng'))

describe('POST /api/voices/detect', () => {
  it('returns chapterLocales keyed by chapter id', async () => {
    const res = await POST(makeRequest({
      chapters: [{ id: 'ch-0', sample: 'Hello world.' }],
    }))
    const data = await res.json()
    expect(data.chapterLocales['ch-0']).toBe('en-US')
  })

  it('returns voicesByLocale with available voices', async () => {
    const res = await POST(makeRequest({
      chapters: [{ id: 'ch-0', sample: 'Hello world.' }],
    }))
    const data = await res.json()
    expect(data.voicesByLocale['en-US']).toHaveLength(2)
    expect(data.voicesByLocale['en-US'][0].ShortName).toBe('en-US-AriaNeural')
  })

  it('falls back to en-US when franc returns und', async () => {
    vi.mocked(franc).mockReturnValue('und')
    const res = await POST(makeRequest({
      chapters: [{ id: 'ch-0', sample: 'xyz' }],
    }))
    const data = await res.json()
    expect(data.chapterLocales['ch-0']).toBe('en-US')
  })

  it('groups multiple chapters sharing a locale under one voicesByLocale key', async () => {
    const res = await POST(makeRequest({
      chapters: [
        { id: 'ch-0', sample: 'Hello.' },
        { id: 'ch-1', sample: 'World.' },
      ],
    }))
    const data = await res.json()
    expect(Object.keys(data.voicesByLocale)).toHaveLength(1)
    expect(data.chapterLocales['ch-1']).toBe('en-US')
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npm test -- test/api/voices-detect.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/voices/detect/route'`

- [ ] **Step 3: Implement the route**

```ts
// src/app/api/voices/detect/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { franc } from 'franc'
import { VoicesManager } from 'edge-tts-universal'
import { getLocale } from '@/lib/tts/langMap'

type ChapterSample = { id: string; sample: string }

export async function POST(req: NextRequest) {
  const { chapters }: { chapters: ChapterSample[] } = await req.json()

  const chapterLocales: Record<string, string> = {}
  const localeSet = new Set<string>()

  for (const { id, sample } of chapters) {
    const iso = franc(sample, { minLength: 20 })
    const locale = getLocale(iso)
    chapterLocales[id] = locale
    localeSet.add(locale)
  }

  const manager = await VoicesManager.create()
  const voicesByLocale: Record<string, unknown[]> = {}

  for (const locale of localeSet) {
    const [lang] = locale.split('-')
    const voices = manager.find({ Language: lang })
    voicesByLocale[locale] = voices.length > 0
      ? voices
      : manager.find({ Language: 'en' })
  }

  return NextResponse.json({ chapterLocales, voicesByLocale })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- test/api/voices-detect.test.ts
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/app/api/voices/detect/route.ts test/api/voices-detect.test.ts
git commit -m "feat: add /api/voices/detect route for per-chapter language detection"
```

---

## Task 5: Chapter Synthesis API Route

**Files:**
- Create: `src/app/api/synthesize/chapter/route.ts`
- Create: `test/api/synthesize-chapter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/api/synthesize-chapter.test.ts
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('edge-tts-universal', () => ({
  EdgeTTS: vi.fn().mockImplementation((text: string, voice: string) => ({
    _text: text,
    _voice: voice,
    synthesize: vi.fn(async () => ({
      audio: { arrayBuffer: vi.fn(async () => new ArrayBuffer(64)) },
    })),
  })),
}))

import { EdgeTTS } from 'edge-tts-universal'
import { POST } from '@/app/api/synthesize/chapter/route'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/synthesize/chapter', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/synthesize/chapter', () => {
  it('returns audio/mpeg response', async () => {
    const res = await POST(makeRequest({
      paragraphs: ['Hello world.'],
      voice: 'en-US-AriaNeural',
    }))
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg')
    expect(res.status).toBe(200)
  })

  it('returns the synthesized MP3 bytes', async () => {
    const res = await POST(makeRequest({
      paragraphs: ['Hello world.'],
      voice: 'en-US-AriaNeural',
    }))
    const buf = await res.arrayBuffer()
    expect(buf.byteLength).toBe(64)
  })

  it('joins paragraphs with double newline before synthesis', async () => {
    await POST(makeRequest({
      paragraphs: ['Para one.', 'Para two.'],
      voice: 'en-US-AriaNeural',
    }))
    expect(vi.mocked(EdgeTTS)).toHaveBeenCalledWith(
      'Para one.\n\nPara two.',
      'en-US-AriaNeural',
    )
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npm test -- test/api/synthesize-chapter.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/synthesize/chapter/route'`

- [ ] **Step 3: Implement the route**

```ts
// src/app/api/synthesize/chapter/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { EdgeTTS } from 'edge-tts-universal'

export async function POST(req: NextRequest) {
  const { paragraphs, voice }: { paragraphs: string[]; voice: string } = await req.json()
  const text = paragraphs.join('\n\n')
  const tts = new EdgeTTS(text, voice)
  const result = await tts.synthesize()
  const mp3 = Buffer.from(await result.audio.arrayBuffer())
  return new NextResponse(mp3, {
    headers: { 'Content-Type': 'audio/mpeg' },
  })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- test/api/synthesize-chapter.test.ts
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/app/api/synthesize/chapter/route.ts test/api/synthesize-chapter.test.ts
git commit -m "feat: add /api/synthesize/chapter route for per-chapter MP3 synthesis"
```

---

## Task 6: `useSynthesis` Hook

**Files:**
- Create: `src/hooks/useSynthesis.ts`
- Create: `test/hooks/useSynthesis.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// @vitest-environment jsdom
// test/hooks/useSynthesis.test.ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { useSynthesis } from '@/hooks/useSynthesis'
import type { Chapter } from '@/lib/parsers/types'

const chapters: Chapter[] = [
  { id: 'ch-0', title: 'Chapter One', paragraphs: ['Hello world.'], order: 0 },
  { id: 'ch-1', title: 'Chapter Two', paragraphs: ['Goodbye world.'], order: 1 },
]

const detectResponse = {
  chapterLocales: { 'ch-0': 'en-US', 'ch-1': 'en-US' },
  voicesByLocale: {
    'en-US': [
      { ShortName: 'en-US-AriaNeural', FriendlyName: 'Aria', Locale: 'en-US', Gender: 'Female' },
      { ShortName: 'en-US-GuyNeural', FriendlyName: 'Guy', Locale: 'en-US', Gender: 'Male' },
    ],
  },
}

afterEach(() => vi.restoreAllMocks())

describe('useSynthesis', () => {
  it('starts in idle phase', () => {
    const { result } = renderHook(() => useSynthesis(chapters))
    expect(result.current.phase).toBe('idle')
    expect(result.current.progress).toEqual({ done: 0, total: 0 })
  })

  it('transitions to selecting after successful detect', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => detectResponse,
    })))
    const { result } = renderHook(() => useSynthesis(chapters))
    await act(async () => { result.current.detect() })
    expect(result.current.phase).toBe('selecting')
    expect(result.current.voicesByLocale['en-US']).toHaveLength(2)
  })

  it('auto-selects first voice per locale after detect', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => detectResponse,
    })))
    const { result } = renderHook(() => useSynthesis(chapters))
    await act(async () => { result.current.detect() })
    expect(result.current.selectedVoices['en-US']).toBe('en-US-AriaNeural')
  })

  it('transitions to error phase when detect fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      statusText: 'Internal Server Error',
    })))
    const { result } = renderHook(() => useSynthesis(chapters))
    await act(async () => { result.current.detect() })
    expect(result.current.phase).toBe('error')
    expect(result.current.error).toContain('Detection failed')
  })

  it('setVoice updates selectedVoices for the given locale', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => detectResponse,
    })))
    const { result } = renderHook(() => useSynthesis(chapters))
    await act(async () => { result.current.detect() })
    act(() => { result.current.setVoice('en-US', 'en-US-GuyNeural') })
    expect(result.current.selectedVoices['en-US']).toBe('en-US-GuyNeural')
  })

  it('transitions to done after synthesis completes', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('voices/detect')) {
        return { ok: true, json: async () => detectResponse }
      }
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(100),
      }
    }))
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() })

    const { result } = renderHook(() => useSynthesis(chapters))
    await act(async () => { result.current.detect() })
    await act(async () => { result.current.startSynthesis() })

    expect(result.current.phase).toBe('done')
    expect(result.current.progress).toEqual({ done: 2, total: 2 })
    expect(result.current.chapterAudios['ch-0'].status).toBe('done')
    expect(result.current.chapterAudios['ch-1'].status).toBe('done')
  })

  it('marks chapter as failed after two failed fetch attempts', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('voices/detect')) {
        return { ok: true, json: async () => detectResponse }
      }
      return { ok: false, status: 500 }
    }))
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() })

    const { result } = renderHook(() => useSynthesis(chapters))
    await act(async () => { result.current.detect() })
    await act(async () => { result.current.startSynthesis() })

    expect(result.current.chapterAudios['ch-0'].status).toBe('failed')
    expect(result.current.phase).toBe('done')
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npm test -- test/hooks/useSynthesis.test.ts
```

Expected: FAIL — `Cannot find module '@/hooks/useSynthesis'`

- [ ] **Step 3: Implement `useSynthesis.ts`**

```ts
// src/hooks/useSynthesis.ts
'use client'
import { useState, useCallback, useRef } from 'react'
import type { Chapter } from '@/lib/parsers/types'
import { buildZip } from '@/lib/tts/buildZip'

export type Voice = {
  ShortName: string
  FriendlyName: string
  Locale: string
  Gender: string
}

export type ChapterStatus = 'pending' | 'synthesizing' | 'done' | 'failed'

export type ChapterAudio = {
  buffer: Uint8Array
  blobUrl: string
  status: ChapterStatus
}

export type SynthesisPhase = 'idle' | 'detecting' | 'selecting' | 'synthesizing' | 'done' | 'error'

export function useSynthesis(chapters: Chapter[]) {
  const [phase, setPhase] = useState<SynthesisPhase>('idle')
  const [chapterLocales, setChapterLocales] = useState<Record<string, string>>({})
  const [voicesByLocale, setVoicesByLocale] = useState<Record<string, Voice[]>>({})
  const [selectedVoices, setSelectedVoices] = useState<Record<string, string>>({})
  const [chapterAudios, setChapterAudios] = useState<Record<string, ChapterAudio>>({})
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)
  const audioBuffers = useRef(new Map<string, Uint8Array>())

  const detect = useCallback(async () => {
    setPhase('detecting')
    try {
      const samples = chapters.map((ch) => ({
        id: ch.id,
        sample: ch.paragraphs.slice(0, 3).join(' ').slice(0, 500),
      }))
      const res = await fetch('/api/voices/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapters: samples }),
      })
      if (!res.ok) throw new Error(`Detection failed: ${res.statusText}`)
      const { chapterLocales: locales, voicesByLocale: voices } = await res.json()
      setChapterLocales(locales)
      setVoicesByLocale(voices)
      const defaults: Record<string, string> = {}
      for (const [locale, voiceList] of Object.entries(voices as Record<string, Voice[]>)) {
        if (voiceList.length > 0) defaults[locale] = voiceList[0].ShortName
      }
      setSelectedVoices(defaults)
      setPhase('selecting')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection failed')
      setPhase('error')
    }
  }, [chapters])

  const setVoice = useCallback((locale: string, voiceName: string) => {
    setSelectedVoices((prev) => ({ ...prev, [locale]: voiceName }))
  }, [])

  const startSynthesis = useCallback(async () => {
    setPhase('synthesizing')
    setProgress({ done: 0, total: chapters.length })
    audioBuffers.current.clear()

    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i]
      const voice = selectedVoices[chapterLocales[ch.id]] ?? 'en-US-AriaNeural'

      setChapterAudios((prev) => ({
        ...prev,
        [ch.id]: { buffer: new Uint8Array(), blobUrl: '', status: 'synthesizing' },
      }))

      let buffer: Uint8Array | null = null
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch('/api/synthesize/chapter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paragraphs: ch.paragraphs, voice }),
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          buffer = new Uint8Array(await res.arrayBuffer())
          break
        } catch {
          if (attempt === 1) break
        }
      }

      if (buffer) {
        const blob = new Blob([buffer], { type: 'audio/mpeg' })
        const blobUrl = URL.createObjectURL(blob)
        audioBuffers.current.set(ch.id, buffer)
        setChapterAudios((prev) => ({
          ...prev,
          [ch.id]: { buffer, blobUrl, status: 'done' },
        }))
      } else {
        setChapterAudios((prev) => ({
          ...prev,
          [ch.id]: { buffer: new Uint8Array(), blobUrl: '', status: 'failed' },
        }))
      }

      setProgress({ done: i + 1, total: chapters.length })
    }

    setPhase('done')
  }, [chapters, selectedVoices, chapterLocales])

  const downloadZip = useCallback(async () => {
    const blob = await buildZip(chapters, audioBuffers.current)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'audiobook.zip'
    a.click()
    URL.revokeObjectURL(url)
  }, [chapters])

  return {
    phase,
    chapterLocales,
    voicesByLocale,
    selectedVoices,
    setVoice,
    chapterAudios,
    progress,
    error,
    detect,
    startSynthesis,
    downloadZip,
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- test/hooks/useSynthesis.test.ts
```

Expected: PASS — 7 tests

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSynthesis.ts test/hooks/useSynthesis.test.ts
git commit -m "feat: add useSynthesis hook for orchestrated TTS synthesis"
```

---

## Task 7: `VoicePicker` Component

**Files:**
- Create: `src/components/VoicePicker.tsx`
- Create: `src/components/VoicePicker.module.css`
- Create: `test/components/VoicePicker.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment jsdom
// test/components/VoicePicker.test.tsx
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import VoicePicker from '@/components/VoicePicker'
import type { Voice } from '@/hooks/useSynthesis'

afterEach(cleanup)

const voices: Voice[] = [
  { ShortName: 'en-US-AriaNeural', FriendlyName: 'Aria', Locale: 'en-US', Gender: 'Female' },
  { ShortName: 'en-US-GuyNeural', FriendlyName: 'Guy', Locale: 'en-US', Gender: 'Male' },
]

test('renders locale label with chapter count', () => {
  render(<VoicePicker locale="en-US" voices={voices} chapterCount={5} selectedVoice="en-US-AriaNeural" onSelect={vi.fn()} />)
  expect(screen.getByText(/en-US/)).toBeInTheDocument()
  expect(screen.getByText(/5 chapters/)).toBeInTheDocument()
})

test('renders a select with all voice options', () => {
  render(<VoicePicker locale="en-US" voices={voices} chapterCount={2} selectedVoice="en-US-AriaNeural" onSelect={vi.fn()} />)
  expect(screen.getByRole('option', { name: 'en-US-AriaNeural' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'en-US-GuyNeural' })).toBeInTheDocument()
})

test('calls onSelect when user changes the dropdown', () => {
  const onSelect = vi.fn()
  render(<VoicePicker locale="en-US" voices={voices} chapterCount={1} selectedVoice="en-US-AriaNeural" onSelect={onSelect} />)
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'en-US-GuyNeural' } })
  expect(onSelect).toHaveBeenCalledWith('en-US-GuyNeural')
})

test('shows singular chapter count label when chapterCount is 1', () => {
  render(<VoicePicker locale="ja-JP" voices={voices} chapterCount={1} selectedVoice="en-US-AriaNeural" onSelect={vi.fn()} />)
  expect(screen.getByText(/1 chapter\b/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npm test -- test/components/VoicePicker.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/VoicePicker'`

- [ ] **Step 3: Implement `VoicePicker.tsx`**

```tsx
// src/components/VoicePicker.tsx
import type { Voice } from '@/hooks/useSynthesis'
import styles from './VoicePicker.module.css'

type Props = {
  locale: string
  voices: Voice[]
  chapterCount: number
  selectedVoice: string
  onSelect: (voiceName: string) => void
}

export default function VoicePicker({ locale, voices, chapterCount, selectedVoice, onSelect }: Props) {
  const label = `${locale} (${chapterCount} chapter${chapterCount !== 1 ? 's' : ''})`
  return (
    <div className={styles.picker}>
      <label htmlFor={`voice-${locale}`} className={styles.label}>{label}</label>
      <select
        id={`voice-${locale}`}
        value={selectedVoice}
        onChange={(e) => onSelect(e.target.value)}
        className={styles.select}
      >
        {voices.map((v) => (
          <option key={v.ShortName} value={v.ShortName}>
            {v.ShortName}
          </option>
        ))}
      </select>
    </div>
  )
}
```

- [ ] **Step 4: Create `VoicePicker.module.css`**

```css
/* src/components/VoicePicker.module.css */
.picker {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.label {
  font-size: 0.85rem;
  font-weight: 600;
}

.select {
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--border, #ccc);
  background: var(--bg, #fff);
  color: var(--fg, #000);
  font-size: 0.9rem;
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test -- test/components/VoicePicker.test.tsx
```

Expected: PASS — 4 tests

- [ ] **Step 6: Commit**

```bash
git add src/components/VoicePicker.tsx src/components/VoicePicker.module.css test/components/VoicePicker.test.tsx
git commit -m "feat: add VoicePicker component for per-locale voice selection"
```

---

## Task 8: `SynthesisPanel` Component

**Files:**
- Create: `src/components/SynthesisPanel.tsx`
- Create: `src/components/SynthesisPanel.module.css`
- Create: `test/components/SynthesisPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

The test mocks `useSynthesis` to control the rendered state.

```tsx
// @vitest-environment jsdom
// test/components/SynthesisPanel.test.tsx
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import SynthesisPanel from '@/components/SynthesisPanel'
import type { Chapter } from '@/lib/parsers/types'

afterEach(cleanup)

const chapters: Chapter[] = [
  { id: 'ch-0', title: 'Chapter One', paragraphs: ['Hello.'], order: 0 },
]

vi.mock('@/hooks/useSynthesis', () => {
  const detect = vi.fn()
  const startSynthesis = vi.fn()
  const downloadZip = vi.fn()
  const setVoice = vi.fn()

  return {
    useSynthesis: vi.fn(() => ({
      phase: 'idle',
      chapterLocales: {},
      voicesByLocale: {},
      selectedVoices: {},
      setVoice,
      chapterAudios: {},
      progress: { done: 0, total: 0 },
      error: null,
      detect,
      startSynthesis,
      downloadZip,
    })),
  }
})

import { useSynthesis } from '@/hooks/useSynthesis'

test('renders Generate Audio button in idle phase', () => {
  render(<SynthesisPanel chapters={chapters} />)
  expect(screen.getByRole('button', { name: /generate audio/i })).toBeInTheDocument()
})

test('calls detect when Generate Audio is clicked', () => {
  render(<SynthesisPanel chapters={chapters} />)
  fireEvent.click(screen.getByRole('button', { name: /generate audio/i }))
  const { detect } = vi.mocked(useSynthesis)(chapters)
  expect(detect).toHaveBeenCalled()
})

test('shows detecting message in detecting phase', () => {
  vi.mocked(useSynthesis).mockReturnValueOnce({
    ...vi.mocked(useSynthesis)(chapters),
    phase: 'detecting',
  })
  render(<SynthesisPanel chapters={chapters} />)
  expect(screen.getByText(/detecting/i)).toBeInTheDocument()
})

test('shows VoicePicker and Start Synthesis button in selecting phase', () => {
  vi.mocked(useSynthesis).mockReturnValueOnce({
    ...vi.mocked(useSynthesis)(chapters),
    phase: 'selecting',
    chapterLocales: { 'ch-0': 'en-US' },
    voicesByLocale: {
      'en-US': [{ ShortName: 'en-US-AriaNeural', FriendlyName: 'Aria', Locale: 'en-US', Gender: 'Female' }],
    },
    selectedVoices: { 'en-US': 'en-US-AriaNeural' },
  })
  render(<SynthesisPanel chapters={chapters} />)
  expect(screen.getByRole('combobox')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /start synthesis/i })).toBeInTheDocument()
})

test('shows progress and Download ZIP in done phase', () => {
  vi.mocked(useSynthesis).mockReturnValueOnce({
    ...vi.mocked(useSynthesis)(chapters),
    phase: 'done',
    progress: { done: 1, total: 1 },
    chapterAudios: {
      'ch-0': { buffer: new Uint8Array(), blobUrl: 'blob:x', status: 'done' },
    },
  })
  render(<SynthesisPanel chapters={chapters} />)
  expect(screen.getByText('1/1 chapters')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /download zip/i })).toBeInTheDocument()
})

test('shows error message in error phase', () => {
  vi.mocked(useSynthesis).mockReturnValueOnce({
    ...vi.mocked(useSynthesis)(chapters),
    phase: 'error',
    error: 'Detection failed: timeout',
  })
  render(<SynthesisPanel chapters={chapters} />)
  expect(screen.getByText('Detection failed: timeout')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npm test -- test/components/SynthesisPanel.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/SynthesisPanel'`

- [ ] **Step 3: Implement `SynthesisPanel.tsx`**

```tsx
// src/components/SynthesisPanel.tsx
'use client'
import { useSynthesis } from '@/hooks/useSynthesis'
import VoicePicker from '@/components/VoicePicker'
import type { Chapter } from '@/lib/parsers/types'
import styles from './SynthesisPanel.module.css'

type Props = { chapters: Chapter[] }

export default function SynthesisPanel({ chapters }: Props) {
  const {
    phase,
    voicesByLocale,
    chapterLocales,
    selectedVoices,
    setVoice,
    chapterAudios,
    progress,
    error,
    detect,
    startSynthesis,
    downloadZip,
  } = useSynthesis(chapters)

  if (phase === 'idle') {
    return (
      <button onClick={detect} className={styles.btn}>
        Generate Audio
      </button>
    )
  }

  if (phase === 'detecting') {
    return <p className={styles.status}>Detecting languages…</p>
  }

  if (phase === 'error') {
    return <p className={styles.error}>{error}</p>
  }

  if (phase === 'selecting') {
    return (
      <div className={styles.panel}>
        {Object.entries(voicesByLocale).map(([locale, voices]) => {
          const count = Object.values(chapterLocales).filter((l) => l === locale).length
          return (
            <VoicePicker
              key={locale}
              locale={locale}
              voices={voices}
              chapterCount={count}
              selectedVoice={selectedVoices[locale] ?? ''}
              onSelect={(v) => setVoice(locale, v)}
            />
          )
        })}
        <button onClick={startSynthesis} className={styles.btn}>
          Start Synthesis
        </button>
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <p className={styles.progress}>{progress.done}/{progress.total} chapters</p>
      {chapters.map((ch) => {
        const audio = chapterAudios[ch.id]
        return (
          <div key={ch.id} className={styles.chapterRow}>
            <span className={styles.chapterTitle}>{ch.title ?? ch.id}</span>
            {audio?.status === 'done' && (
              <audio controls src={audio.blobUrl} className={styles.player} />
            )}
            {audio?.status === 'synthesizing' && (
              <span className={styles.synthesizing}>Synthesizing…</span>
            )}
            {audio?.status === 'failed' && (
              <span className={styles.failed}>Failed</span>
            )}
          </div>
        )
      })}
      {phase === 'done' && (
        <button onClick={downloadZip} className={styles.btn}>
          Download ZIP
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create `SynthesisPanel.module.css`**

```css
/* src/components/SynthesisPanel.module.css */
.panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  background: var(--accent, #0070f3);
  color: #fff;
  font-size: 0.9rem;
  cursor: pointer;
  align-self: flex-start;
}

.btn:hover {
  opacity: 0.85;
}

.status {
  font-size: 0.9rem;
  color: var(--fg-muted, #666);
}

.error {
  font-size: 0.9rem;
  color: #c00;
}

.progress {
  font-size: 0.85rem;
  font-weight: 600;
}

.chapterRow {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}

.chapterTitle {
  flex: 1;
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player {
  height: 28px;
}

.synthesizing {
  font-size: 0.8rem;
  color: var(--fg-muted, #888);
}

.failed {
  font-size: 0.8rem;
  color: #c00;
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test -- test/components/SynthesisPanel.test.tsx
```

Expected: PASS — 6 tests

- [ ] **Step 6: Commit**

```bash
git add src/components/SynthesisPanel.tsx src/components/SynthesisPanel.module.css test/components/SynthesisPanel.test.tsx
git commit -m "feat: add SynthesisPanel component with progress UI and download"
```

---

## Task 9: Wire into `page.tsx`

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `test/page.test.tsx`

- [ ] **Step 1: Add a failing test for the Generate Audio button appearing after parse**

Add a top-level `vi.mock` for `useSynthesis` and a new test to `test/page.test.tsx`.

At the top of the file, after the existing `vi.mock('@/lib/parsers', ...)` call, add:

```ts
vi.mock('@/hooks/useSynthesis', () => ({
  useSynthesis: vi.fn(() => ({
    phase: 'idle',
    chapterLocales: {},
    voicesByLocale: {},
    selectedVoices: {},
    setVoice: vi.fn(),
    chapterAudios: {},
    progress: { done: 0, total: 0 },
    error: null,
    detect: vi.fn(),
    startSynthesis: vi.fn(),
    downloadZip: vi.fn(),
  })),
}))
```

Then add this test after the existing ones:

```ts
test('shows SynthesisPanel after book is parsed', async () => {
  vi.mocked(selectParser).mockReturnValue({
    parse: async () => [
      { id: 'ch-0', title: 'Chapter One', paragraphs: ['Hello.'], order: 0 },
    ],
  })

  renderAndSelectFile('sample.epub')
  fireEvent.click(screen.getByRole('button', { name: 'Parse Book' }))

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /generate audio/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm the new test fails**

```bash
npm test -- test/page.test.tsx
```

Expected: the new test FAILS, existing tests PASS.

- [ ] **Step 3: Modify `page.tsx` to include `SynthesisPanel`**

Add the import at the top of `src/app/page.tsx`:

```ts
import SynthesisPanel from '@/components/SynthesisPanel'
```

In the success block (after `<ChapterList chapters={chapters} />`), add:

```tsx
{status === 'success' && chapters.length > 0 && (
  <>
    <StatsBadge chapters={chapters} />
    <ChapterList chapters={chapters} />
    <SynthesisPanel chapters={chapters} />
  </>
)}
```

- [ ] **Step 4: Run the full test suite to confirm everything passes**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx test/page.test.tsx
git commit -m "feat: wire SynthesisPanel into main page after book parse"
```

---

## Verification

1. `npm run dev` — dev server starts cleanly
2. Upload `test_files/rashomon.epub` → parse → chapters appear
3. Click "Generate Audio" → "Detecting languages…" appears briefly
4. Two voice pickers appear: one for `en-US` (preamble chapters), one for `ja-JP` (main chapters)
5. Each picker shows multiple voices in the dropdown
6. Select voices, click "Start Synthesis" → chapter rows appear with progress
7. Each chapter row shows an `<audio>` player when its synthesis completes
8. `1/N chapters`, `2/N chapters`, … updates as synthesis proceeds
9. When all done, "Download ZIP" button appears
10. Download ZIP → open it → contains numbered MP3 files, one per chapter
11. Play an MP3 → audio is in the correct language and voice
12. Simulate a network failure on one chapter → that row shows "Failed", others continue
