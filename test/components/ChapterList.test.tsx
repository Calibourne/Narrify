// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { cleanup } from '@testing-library/react'
import { test, expect, afterEach, vi } from 'vitest'
import ChapterList from '@/components/ChapterList'
import type { Chapter } from '@/lib/parsers/types'

afterEach(cleanup)

const chapters: Chapter[] = [
  { id: 'ch-0', title: 'Chapter One', paragraphs: ['Para A.'], order: 0 },
  { id: 'ch-1', title: 'Chapter Two', paragraphs: ['Para B.'], order: 1 },
  { id: 'ch-2', title: 'Chapter Three', paragraphs: ['Para C.'], order: 2 },
]

const defaultProps = {
  chapters,
  selectedIds: new Set(chapters.map(ch => ch.id)),
  onToggleSelection: vi.fn(),
  onSelectRange: vi.fn(),
  onSelectAll: vi.fn(),
  onDeselectAll: vi.fn(),
  onUpdateChapter: vi.fn(),
  onDeleteChapter: vi.fn(),
  onSplitChapter: vi.fn(),
  onMergeWithNext: vi.fn(),
}

test('renders all chapter titles', () => {
  render(<ChapterList {...defaultProps} />)
  expect(screen.getByText('Chapter One')).toBeInTheDocument()
  expect(screen.getByText('Chapter Two')).toBeInTheDocument()
  expect(screen.getByText('Chapter Three')).toBeInTheDocument()
})

test('first chapter is open by default', () => {
  render(<ChapterList {...defaultProps} />)
  expect(screen.getByText('Para A.')).toBeInTheDocument()
})

test('subsequent chapters are closed by default', () => {
  render(<ChapterList {...defaultProps} />)
  expect(screen.queryByText('Para B.')).not.toBeInTheDocument()
  expect(screen.queryByText('Para C.')).not.toBeInTheDocument()
})
