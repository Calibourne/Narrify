// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, test, expect, describe, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import UrlInput from '@/components/UrlInput'
import { useUrlParsing } from '@/hooks/useUrlParsing'
import type { Chapter } from '@/lib/parsers/types'

afterEach(() => { vi.restoreAllMocks(); cleanup() })

const stubChapter: Chapter = { id: '0', title: 'Ch1', paragraphs: ['Hello'], order: 0 }

function TestWrapper({ onChapters = () => {}, onError = () => {} }) {
  const urlParsing = useUrlParsing(onChapters, onError)
  return <UrlInput urlParsing={urlParsing} disabled={false} />
}

describe('UrlInput', () => {
  test('renders URL input and Go button', () => {
    render(<TestWrapper />)
    expect(screen.getByPlaceholderText(/https:\/\//i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^go$/i })).toBeInTheDocument()
  })

  test('Go button disabled when URL empty', () => {
    render(<TestWrapper />)
    expect(screen.getByRole('button', { name: /^go$/i })).toBeDisabled()
  })

  test('calls onChapters when API returns chapters', async () => {
    const onChapters = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ type: 'chapters', chapters: [stubChapter] }),
    } as any)

    render(<TestWrapper onChapters={onChapters} />)
    fireEvent.change(screen.getByPlaceholderText(/https:\/\//i), { target: { value: 'https://example.com/book.epub' } })
    fireEvent.click(screen.getByRole('button', { name: /^go$/i }))

    await waitFor(() => expect(onChapters).toHaveBeenCalledOnce())
    expect(onChapters.mock.calls[0][0]).toEqual([stubChapter])
  })

  test('calls onError when API returns error', async () => {
    const onError = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ type: 'error', message: 'Failed to reach URL' }),
    } as any)

    render(<TestWrapper onError={onError} />)
    fireEvent.change(screen.getByPlaceholderText(/https:\/\//i), { target: { value: 'https://bad.example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /^go$/i }))

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Failed to reach URL'))
  })
})

