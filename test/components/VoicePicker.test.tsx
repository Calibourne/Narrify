// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import VoicePicker from '@/components/VoicePicker'
import type { Voice } from '@/hooks/useSynthesis'

afterEach(cleanup)

const voices: Voice[] = [
  { ShortName: 'en-US-AriaNeural', FriendlyName: 'Aria', Locale: 'en-US', Gender: 'Female' },
  { ShortName: 'en-US-GuyNeural', FriendlyName: 'Guy', Locale: 'en-US', Gender: 'Male' },
]

test('renders locale label with chapter count', () => {
  render(<VoicePicker locale="en-US" voices={voices} chapterCount={5} selectedVoice="en-US-AriaNeural" onSelect={vi.fn()} />)
  expect(screen.getByText(/en-US \(5 chapters\)/)).toBeInTheDocument()
})

test('renders a select with all voice options', () => {
  render(<VoicePicker locale="en-US" voices={voices} chapterCount={2} selectedVoice="en-US-AriaNeural" onSelect={vi.fn()} />)
  expect(screen.getByRole('option', { name: 'en-US-AriaNeural' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'en-US-GuyNeural' })).toBeInTheDocument()
})

test('calls onSelect when user changes the dropdown', () => {
  const onSelect = vi.fn()
  render(<VoicePicker locale="en-US" voices={voices} chapterCount={1} selectedVoice="en-US-AriaNeural" onSelect={onSelect} />)
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'en-US-GuyNeural' } })
  expect(onSelect).toHaveBeenCalledWith('en-US-GuyNeural')
})

test('shows singular chapter count label when chapterCount is 1', () => {
  render(<VoicePicker locale="ja-JP" voices={voices} chapterCount={1} selectedVoice="en-US-AriaNeural" onSelect={vi.fn()} />)
  expect(screen.getByText(/1 chapter\b/)).toBeInTheDocument()
})
