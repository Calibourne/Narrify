// test/components/PasteInput.test.tsx
// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, test, expect, describe, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import PasteInput from '@/components/PasteInput'

afterEach(cleanup)

describe('PasteInput', () => {
  test('renders textarea and Dub button', () => {
    render(<PasteInput onChapters={() => {}} onError={() => {}} disabled={false} />)
    expect(screen.getByPlaceholderText(/paste any text/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^dub$/i })).toBeInTheDocument()
  })

  test('Dub button disabled when textarea empty', () => {
    render(<PasteInput onChapters={() => {}} onError={() => {}} disabled={false} />)
    expect(screen.getByRole('button', { name: /^dub$/i })).toBeDisabled()
  })

  test('Dub button enabled when text entered', () => {
    render(<PasteInput onChapters={() => {}} onError={() => {}} disabled={false} />)
    fireEvent.change(screen.getByPlaceholderText(/paste any text/i), { target: { value: 'Hello world' } })
    expect(screen.getByRole('button', { name: /^dub$/i })).toBeEnabled()
  })

  test('shows warning when text exceeds 50k chars', () => {
    render(<PasteInput onChapters={() => {}} onError={() => {}} disabled={false} />)
    fireEvent.change(screen.getByPlaceholderText(/paste any text/i), { target: { value: 'x'.repeat(50001) } })
    expect(screen.getByText(/large text/i)).toBeInTheDocument()
  })

  test('calls onChapters with parsed chapters on Dub', () => {
    const onChapters = vi.fn()
    render(<PasteInput onChapters={onChapters} onError={() => {}} disabled={false} />)
    fireEvent.change(screen.getByPlaceholderText(/paste any text/i), { target: { value: 'Chapter 1\nHello world' } })
    fireEvent.click(screen.getByRole('button', { name: /^dub$/i }))
    expect(onChapters).toHaveBeenCalledOnce()
    expect(onChapters.mock.calls[0][0]).toHaveLength(1)
  })
})
