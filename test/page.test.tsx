// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import Home from '@/app/page'

vi.mock('@/lib/parsers', () => ({
  selectParser: vi.fn(),
}))

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

