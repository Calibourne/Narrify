// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { test, expect } from 'vitest'
import StatsBadge from '@/components/StatsBadge'
import type { Chapter } from '@/lib/parsers/types'

const chapters: Chapter[] = [
  { id: 'ch-0', title: 'Chapter One', paragraphs: ['p1', 'p2'], order: 0 },
  { id: 'ch-1', title: 'Chapter Two', paragraphs: ['p3'], order: 1 },
]

test('shows chapter count', () => {
  const { unmount } = render(<StatsBadge chapters={chapters} />)
  expect(screen.getByText(/2 chapters/)).toBeInTheDocument()
  unmount()
})

test('shows total paragraph count', () => {
  const { unmount } = render(<StatsBadge chapters={chapters} />)
  expect(screen.getByText(/3 paragraphs/)).toBeInTheDocument()
  unmount()
})

test('handles single chapter and single paragraph', () => {
  const single: Chapter[] = [
    { id: 'ch-0', title: 'Only', paragraphs: ['one'], order: 0 },
  ]
  const { unmount } = render(<StatsBadge chapters={single} />)
  expect(screen.getByText(/1 chapter/)).toBeInTheDocument()
  expect(screen.getByText(/1 paragraph/)).toBeInTheDocument()
  unmount()
})
