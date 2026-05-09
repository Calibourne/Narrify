// test/components/InputTabs.test.tsx
// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { vi, test, expect, describe, afterEach } from 'vitest'
import InputTabs from '@/components/InputTabs'
import { useUrlParsing } from '@/hooks/useUrlParsing'
import type { Chapter } from '@/lib/parsers/types'

const noop = () => {}
const noopChs = (_: Chapter[]) => {}

function TestWrapper() {
  const urlParsing = useUrlParsing(noopChs, noop)
  return <InputTabs urlParsing={urlParsing} onChapters={noopChs} onError={noop} disabled={false} />
}

afterEach(() => cleanup())

describe('InputTabs', () => {
  test('renders three tabs', () => {
    render(<TestWrapper />)
    expect(screen.getByRole('tab', { name: /upload/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /from url/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /paste text/i })).toBeInTheDocument()
  })

  test('Upload tab is active by default', () => {
    render(<TestWrapper />)
    expect(screen.getByRole('tab', { name: /upload/i })).toHaveAttribute('aria-selected', 'true')
  })

  test('clicking From URL tab switches panel', () => {
    render(<TestWrapper />)
    fireEvent.click(screen.getByRole('tab', { name: /from url/i }))
    expect(screen.getByRole('tab', { name: /from url/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByPlaceholderText(/https:\/\//i)).toBeInTheDocument()
  })

  test('clicking Paste text tab switches panel', () => {
    render(<TestWrapper />)
    fireEvent.click(screen.getByRole('tab', { name: /paste text/i }))
    expect(screen.getByRole('tab', { name: /paste text/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByPlaceholderText(/paste any text/i)).toBeInTheDocument()
  })
})
