// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import SynthesisPanel from '@/components/SynthesisPanel'

afterEach(cleanup)

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => [] }))
})
afterEach(() => vi.unstubAllGlobals())

const noop = vi.fn()

const baseSynthesis = {
  phase: 'idle' as const,
  chapterLocales: {},
  voicesByLocale: {},
  selectedVoices: {},
  setVoice: noop,
  chapterAudios: {},
  progress: { done: 0, total: 0 },
  error: null,
  rate: 0,
  pitch: 0,
  setRate: noop,
  setPitch: noop,
  detect: noop,
  startSynthesis: noop,
  synthesizeWithLocale: noop,
  downloadZip: noop,
  cancel: noop,
}

test('renders Generate Audio button in idle phase', () => {
  render(<SynthesisPanel synthesis={baseSynthesis} />)
  expect(screen.getByRole('button', { name: /generate audio/i })).toBeInTheDocument()
})

test('calls detect when Auto-detect is clicked', () => {
  const detect = vi.fn()
  render(<SynthesisPanel synthesis={{ ...baseSynthesis, detect }} />)
  fireEvent.click(screen.getByRole('button', { name: /auto-detect/i }))
  expect(detect).toHaveBeenCalled()
})

test('shows detecting message in detecting phase', () => {
  render(<SynthesisPanel synthesis={{ ...baseSynthesis, phase: 'detecting' }} />)
  expect(screen.getByText(/detecting/i)).toBeInTheDocument()
})

test('shows VoicePicker and Start Synthesis button in selecting phase', () => {
  render(<SynthesisPanel synthesis={{
    ...baseSynthesis,
    phase: 'selecting',
    chapterLocales: { 'ch-0': 'en-US' },
    voicesByLocale: {
      'en-US': [{ ShortName: 'en-US-AriaNeural', FriendlyName: 'Aria', Locale: 'en-US', Gender: 'Female' }],
    },
    selectedVoices: { 'en-US': 'en-US-AriaNeural' },
  }} />)
  expect(screen.getByRole('combobox')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /start synthesis/i })).toBeInTheDocument()
})

test('shows progress and Download ZIP in done phase', () => {
  render(<SynthesisPanel synthesis={{
    ...baseSynthesis,
    phase: 'done',
    progress: { done: 1, total: 1 },
    chapterAudios: {
      'ch-0': { buffer: new Uint8Array(), blobUrl: 'blob:x', status: 'done' },
    },
  }} />)
  expect(screen.getByRole('button', { name: /download zip/i })).toBeInTheDocument()
})

test('shows error message in error phase', () => {
  render(<SynthesisPanel synthesis={{
    ...baseSynthesis,
    phase: 'error',
    error: 'Detection failed: timeout',
  }} />)
  expect(screen.getByText('Detection failed: timeout')).toBeInTheDocument()
})

test('renders NarrationControls speed and pitch sliders in idle phase', () => {
  render(<SynthesisPanel synthesis={baseSynthesis} />)
  expect(screen.getByRole('slider', { name: /speed/i })).toBeInTheDocument()
  expect(screen.getByRole('slider', { name: /pitch/i })).toBeInTheDocument()
})

test('renders NarrationControls speed and pitch sliders in selecting phase', () => {
  render(<SynthesisPanel synthesis={{
    ...baseSynthesis,
    phase: 'selecting',
    chapterLocales: { 'ch-0': 'en-US' },
    voicesByLocale: {
      'en-US': [{ ShortName: 'en-US-AriaNeural', FriendlyName: 'Aria', Locale: 'en-US', Gender: 'Female' }],
    },
    selectedVoices: { 'en-US': 'en-US-AriaNeural' },
  }} />)
  expect(screen.getByRole('slider', { name: /speed/i })).toBeInTheDocument()
  expect(screen.getByRole('slider', { name: /pitch/i })).toBeInTheDocument()
})
