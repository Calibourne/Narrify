import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('edge-tts-universal', () => {
  const mockSynthesize = vi.fn(async () => ({
    audio: { arrayBuffer: vi.fn(async () => new ArrayBuffer(64)) },
  }))
  return {
    EdgeTTS: vi.fn(function (this: any, text: string, voice: string, opts?: object) {
      this._text = text
      this._voice = voice
      this._opts = opts
      this.synthesize = mockSynthesize
    }),
  }
})

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
      { rate: '+0%', pitch: '+0Hz' },
    )
  })

  it('forwards rate and pitch to EdgeTTS when provided', async () => {
    await POST(makeRequest({
      paragraphs: ['Hello.'],
      voice: 'en-US-AriaNeural',
      rate: '+25%',
      pitch: '-5Hz',
    }))
    expect(vi.mocked(EdgeTTS)).toHaveBeenCalledWith(
      'Hello.',
      'en-US-AriaNeural',
      { rate: '+25%', pitch: '-5Hz' },
    )
  })

  it('defaults rate to +0% and pitch to +0Hz when omitted', async () => {
    await POST(makeRequest({
      paragraphs: ['Hello.'],
      voice: 'en-US-AriaNeural',
    }))
    expect(vi.mocked(EdgeTTS)).toHaveBeenCalledWith(
      'Hello.',
      'en-US-AriaNeural',
      { rate: '+0%', pitch: '+0Hz' },
    )
  })

  it('returns 400 for invalid rate format', async () => {
    const res = await POST(makeRequest({
      paragraphs: ['Hello.'],
      voice: 'en-US-AriaNeural',
      rate: 'fast',
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/rate/)
  })

  it('returns 400 for invalid pitch format', async () => {
    const res = await POST(makeRequest({
      paragraphs: ['Hello.'],
      voice: 'en-US-AriaNeural',
      pitch: '5',
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/pitch/)
  })
})
