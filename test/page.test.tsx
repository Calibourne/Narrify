// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import Home from '@/app/page'

const originalFetch = global.fetch

afterEach(() => {
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
    expect(screen.getByText('Preparing book…')).toBeInTheDocument()
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
