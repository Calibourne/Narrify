// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, test, expect, beforeEach, afterEach } from 'vitest'
import ThemeToggle from '@/components/ThemeToggle'

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
})

test('renders sun icon in light mode', () => {
  const { unmount } = render(<ThemeToggle theme="light" onToggle={() => {}} />)
  expect(screen.getByRole('button')).toHaveTextContent('☀')
  unmount()
})

test('renders moon icon in dark mode', () => {
  const { unmount } = render(<ThemeToggle theme="dark" onToggle={() => {}} />)
  expect(screen.getByRole('button')).toHaveTextContent('🌙')
  unmount()
})

test('calls onToggle when clicked', () => {
  const onToggle = vi.fn()
  const { unmount } = render(<ThemeToggle theme="light" onToggle={onToggle} />)
  fireEvent.click(screen.getByRole('button'))
  expect(onToggle).toHaveBeenCalledOnce()
  unmount()
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
