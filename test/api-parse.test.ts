import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { POST } from '@/app/api/parse/route'
import { NextRequest } from 'next/server'

function makeRequest(file: File | null, fieldName = 'file'): NextRequest {
  const formData = new FormData()
  if (file) formData.append(fieldName, file)
  return new NextRequest('http://localhost/api/parse', { method: 'POST', body: formData })
}

describe('POST /api/parse', () => {
  it('parses an EPUB and returns chapters', async () => {
    const buf = readFileSync(join(__dirname, 'fixtures/sample.epub'))
    const file = new File([buf], 'sample.epub', { type: 'application/epub+zip' })
    const res = await POST(makeRequest(file))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.chapters)).toBe(true)
    expect(body.chapters.length).toBeGreaterThan(0)
  })

  it('parses an FB2 and returns chapters', async () => {
    const buf = readFileSync(join(__dirname, 'fixtures/sample.fb2'))
    const file = new File([buf], 'sample.fb2', { type: 'text/xml' })
    const res = await POST(makeRequest(file))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.chapters)).toBe(true)
    expect(body.chapters.length).toBeGreaterThan(0)
  })

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
})
