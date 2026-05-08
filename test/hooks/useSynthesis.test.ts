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

  it('exposes rate and pitch defaulting to 0', () => {
    const { result } = renderHook(() => useSynthesis(chapters))
    expect(result.current.rate).toBe(0)
    expect(result.current.pitch).toBe(0)
  })

  it('setRate updates rate', () => {
    const { result } = renderHook(() => useSynthesis(chapters))
    act(() => { result.current.setRate(25) })
    expect(result.current.rate).toBe(25)
  })

  it('setPitch updates pitch', () => {
    const { result } = renderHook(() => useSynthesis(chapters))
    act(() => { result.current.setPitch(-5) })
    expect(result.current.pitch).toBe(-5)
  })

  it('cancel in idle resets rate and pitch to 0', () => {
    const { result } = renderHook(() => useSynthesis(chapters))
    act(() => { result.current.setRate(50) })
    act(() => { result.current.setPitch(10) })
    act(() => { result.current.cancel() })
    expect(result.current.rate).toBe(0)
    expect(result.current.pitch).toBe(0)
  })

  it('startSynthesis sends rate and pitch in fetch body', async () => {
    const fetchCalls: Array<{ url: string; body: unknown }> = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      fetchCalls.push({ url, body: init?.body ? JSON.parse(init.body as string) : null })
      if (url.includes('voices/detect')) {
        return { ok: true, json: async () => detectResponse }
      }
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(100) }
    }))
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() })

    const { result } = renderHook(() => useSynthesis(chapters))
    await act(async () => { result.current.detect() })
    act(() => { result.current.setRate(20) })
    act(() => { result.current.setPitch(-5) })
    await act(async () => { result.current.startSynthesis() })

    const synthesisCalls = fetchCalls.filter(c => c.url.includes('synthesize'))
    expect(synthesisCalls.length).toBeGreaterThan(0)
    for (const call of synthesisCalls) {
      expect((call.body as any).rate).toBe('+20%')
      expect((call.body as any).pitch).toBe('-5Hz')
    }
  })
})
