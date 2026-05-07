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
