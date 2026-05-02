// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import Home from '@/app/page'

const originalFetch = global.fetch

afterEach(() => {
  cleanup()
  global.fetch = originalFetch
  vi.restoreAllMocks()
  localStorage.clear()
})

test('shows progress bar immediately when parsing starts', async () => {
  global.fetch = vi.fn(
    () =>
      new Promise<Response>(() => {
        // Keep the request pending so the loading UI stays visible.
      })
  ) as typeof fetch

  const { container } = render(<Home />)
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['hello'], 'sample.fb2', { type: 'text/xml' })

  fireEvent.change(input, { target: { files: [file] } })
  fireEvent.click(screen.getByRole('button', { name: 'Parse Book' }))

  await waitFor(() => {
    expect(screen.getByText('Scanning book structure…')).toBeInTheDocument()
  })
})

test('shows plain-text server errors instead of falling back to generic message', async () => {
  global.fetch = vi.fn(async () => new Response('Payload too large', { status: 413 })) as typeof fetch

  const { container } = render(<Home />)
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['hello'], 'sample.fb2', { type: 'text/xml' })

  fireEvent.change(input, { target: { files: [file] } })
  fireEvent.click(screen.getByRole('button', { name: 'Parse Book' }))

  await waitFor(() => {
    expect(screen.getByText('Payload too large')).toBeInTheDocument()
  })
})

test('updates progress label from staged SSE events', async () => {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          'data: {"type":"progress","done":0,"total":12,"stage":"discovering","label":"Scanning book structure…"}\n\n'
        )
      )
      controller.enqueue(
        encoder.encode(
          'data: {"type":"progress","done":0,"total":12,"stage":"extracting","label":"Building chapter candidates…"}\n\n'
        )
      )
    },
  })

  global.fetch = vi.fn(
    async () =>
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })
  ) as typeof fetch

  const { container } = render(<Home />)
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['hello'], 'sample.fb2', { type: 'text/xml' })

  fireEvent.change(input, { target: { files: [file] } })
  fireEvent.click(screen.getByRole('button', { name: 'Parse Book' }))

  await waitFor(() => {
    expect(screen.getByText('Building chapter candidates…')).toBeInTheDocument()
  })
  expect(screen.getByText('0 / 12 chapters')).toBeInTheDocument()
})
