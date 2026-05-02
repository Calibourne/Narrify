// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import Home from '@/app/page'

vi.mock('@/lib/parsers', () => ({
  selectParser: vi.fn(),
}))

import { selectParser } from '@/lib/parsers'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

function renderAndSelectFile(filename = 'sample.fb2') {
  const { container } = render(<Home />)
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['hello'], filename, { type: 'text/xml' })
  fireEvent.change(input, { target: { files: [file] } })
  return { container, file }
}

test('shows progress bar immediately when parsing starts', async () => {
  vi.mocked(selectParser).mockReturnValue({
    parse: () => new Promise(() => {}),
  })

  renderAndSelectFile()
  fireEvent.click(screen.getByRole('button', { name: 'Parse Book' }))

  await waitFor(() => {
    expect(screen.getByText('Scanning book structure…')).toBeInTheDocument()
  })
})

test('shows error message when parser throws', async () => {
  vi.mocked(selectParser).mockReturnValue({
    parse: () => Promise.reject(new Error('File is corrupted')),
  })

  renderAndSelectFile()
  fireEvent.click(screen.getByRole('button', { name: 'Parse Book' }))

  await waitFor(() => {
    expect(screen.getByText('File is corrupted')).toBeInTheDocument()
  })
})

test('updates progress label from parse events', async () => {
  vi.mocked(selectParser).mockReturnValue({
    parse: async (_buf, onProgress) => {
      await onProgress?.({ done: 0, total: 12, stage: 'discovering', label: 'Scanning book structure…' })
      await onProgress?.({ done: 0, total: 12, stage: 'extracting', label: 'Building chapter candidates…' })
      return new Promise(() => {})
    },
  })

  renderAndSelectFile()
  fireEvent.click(screen.getByRole('button', { name: 'Parse Book' }))

  await waitFor(() => {
    expect(screen.getByText('Building chapter candidates…')).toBeInTheDocument()
  })
  expect(screen.getByText('0 / 12 chapters')).toBeInTheDocument()
})
