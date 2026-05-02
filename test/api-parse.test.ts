import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { POST } from '@/app/api/parse/route'
import { NextRequest } from 'next/server'

function makeRequest(file: File | null): NextRequest {
  if (!file) {
    return new NextRequest('http://localhost/api/parse', { method: 'POST', body: '' })
  }
  return new NextRequest('http://localhost/api/parse', {
    method: 'POST',
    body: file,
    headers: { 'x-filename': file.name },
  })
}

async function collectSSEEvents(res: Response): Promise<Array<Record<string, unknown>>> {
  const text = await res.text()
  return text
    .split('\n\n')
    .filter((chunk) => chunk.trim().startsWith('data: '))
    .map((chunk) => JSON.parse(chunk.trim().slice(6)))
}

describe('POST /api/parse', () => {
  it('returns 400 when no file is provided', async () => {
    const res = await POST(makeRequest(null))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns 400 for unsupported file format', async () => {
    const file = new File(['hello'], 'book.txt', { type: 'text/plain' })
    const res = await POST(makeRequest(file))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Unsupported/)
  })

  it('streams SSE with progress and done events for EPUB', async () => {
    const buf = readFileSync(join(__dirname, 'fixtures/sample.epub'))
    const file = new File([buf], 'sample.epub', { type: 'application/epub+zip' })
    const res = await POST(makeRequest(file))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    const events = await collectSSEEvents(res)
    const progressEvents = events.filter((e) => e.type === 'progress')
    const doneEvent = events.find((e) => e.type === 'done')
    expect(progressEvents.length).toBeGreaterThan(0)
    expect(doneEvent).toBeDefined()
    expect(progressEvents[0]?.done).toBe(0)
    expect(progressEvents[0]?.total).toBeGreaterThan(0)
    expect(progressEvents[1]?.done).toBe(1)
    expect(progressEvents.at(-1)?.done).toBe(progressEvents.at(-1)?.total)
    expect(events.at(-1)?.type).toBe('done')
    expect(Array.isArray((doneEvent as { chapters: unknown[] }).chapters)).toBe(true)
    expect((doneEvent as { chapters: unknown[] }).chapters.length).toBeGreaterThan(0)
  })

  it('streams SSE with progress and done events for FB2', async () => {
    const buf = readFileSync(join(__dirname, 'fixtures/sample.fb2'))
    const file = new File([buf], 'sample.fb2', { type: 'text/xml' })
    const res = await POST(makeRequest(file))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    const events = await collectSSEEvents(res)
    const progressEvents = events.filter((e) => e.type === 'progress')
    const doneEvent = events.find((e) => e.type === 'done')
    expect(progressEvents.length).toBeGreaterThan(0)
    expect(doneEvent).toBeDefined()
    expect(progressEvents[0]?.stage).toBe('discovering')
    expect(progressEvents[0]?.done).toBe(0)
    expect(progressEvents[0]?.total).toBeGreaterThan(0)
    expect(progressEvents[1]?.stage).toBe('extracting')
    expect(progressEvents[1]?.done).toBe(0)
    expect(progressEvents.at(-1)?.done).toBe(progressEvents.at(-1)?.total)
    expect(events.at(-1)?.type).toBe('done')
    expect(Array.isArray((doneEvent as { chapters: unknown[] }).chapters)).toBe(true)
  })

  it('streams an error event when parse fails', async () => {
    const file = new File([Buffer.from('not a valid epub')], 'bad.epub', {
      type: 'application/epub+zip',
    })
    const res = await POST(makeRequest(file))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    const events = await collectSSEEvents(res)
    const errorEvent = events.find((e) => e.type === 'error')
    expect(errorEvent).toBeDefined()
    expect(typeof (errorEvent as { message: string }).message).toBe('string')
  })
})
