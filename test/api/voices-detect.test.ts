import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('franc', () => ({
  francAll: vi.fn(() => [['eng', 0.9]]),
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

import { francAll } from 'franc'
import { POST } from '@/app/api/voices/detect/route'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/voices/detect', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => vi.mocked(francAll).mockReturnValue([['eng', 0.9]]))

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
    vi.mocked(francAll).mockReturnValue([['und', 0.1]])
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
