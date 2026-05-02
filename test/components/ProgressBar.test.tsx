// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { test, expect } from 'vitest'
import ProgressBar from '@/components/ProgressBar'

test('shows N / M chapters label', () => {
  const { unmount } = render(<ProgressBar done={3} total={10} />)
  expect(screen.getByText('3 / 10 chapters')).toBeInTheDocument()
  unmount()
})

test('fill width reflects progress percentage', () => {
  const { container, unmount } = render(<ProgressBar done={5} total={10} />)
  const fill = container.querySelector('[data-fill]') as HTMLElement
  expect(fill.style.width).toBe('50%')
  unmount()
})

test('shows 0% fill when done is 0', () => {
  const { container, unmount } = render(<ProgressBar done={0} total={10} />)
  const fill = container.querySelector('[data-fill]') as HTMLElement
  expect(fill.style.width).toBe('0%')
  unmount()
})

test('shows 100% fill when done equals total', () => {
  const { container, unmount } = render(<ProgressBar done={10} total={10} />)
  const fill = container.querySelector('[data-fill]') as HTMLElement
  expect(fill.style.width).toBe('100%')
  unmount()
})

test('shows preparing state when total is unknown', () => {
  const { container, unmount } = render(<ProgressBar done={0} total={0} />)
  const fill = container.querySelector('[data-fill]') as HTMLElement
  expect(screen.getByText('Preparing book…')).toBeInTheDocument()
  expect(fill.style.width).toBe('12%')
  unmount()
})
