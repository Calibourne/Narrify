// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { vi, test, expect, afterEach } from 'vitest'
import ThemeToggle from '@/components/ThemeToggle'

afterEach(cleanup)
afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
})

test('renders sun icon in light mode', () => {
  const { container } = render(<ThemeToggle theme="light" onToggle={() => {}} />)
  expect(container.querySelector('circle')).toBeInTheDocument()
})

test('renders moon icon in dark mode', () => {
  const { container } = render(<ThemeToggle theme="dark" onToggle={() => {}} />)
  expect(container.querySelector('path')).toBeInTheDocument()
  expect(container.querySelector('circle')).toBeNull()
})

test('calls onToggle when clicked', () => {
  const onToggle = vi.fn()
  render(<ThemeToggle theme="light" onToggle={onToggle} />)
  fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }))
  expect(onToggle).toHaveBeenCalledOnce()
})

test('applies data-theme="light" to html element', () => {
  const { unmount } = render(<ThemeToggle theme="light" onToggle={() => {}} />)
  expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  unmount()
})

test('applies data-theme="dark" to html element', () => {
  const { unmount } = render(<ThemeToggle theme="dark" onToggle={() => {}} />)
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  unmount()
})
