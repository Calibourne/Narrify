// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { test, expect, afterEach, vi } from 'vitest'
import ChapterItem from '@/components/ChapterItem'
import type { Chapter } from '@/lib/parsers/types'

afterEach(cleanup)

const chapter: Chapter = {
  id: 'ch-0',
  title: 'Chapter One',
  paragraphs: ['First paragraph.', 'Second paragraph.'],
  order: 0,
}

const defaultProps = {
  chapter,
  isSelected: true,
  onToggleSelection: vi.fn(),
  onUpdate: vi.fn(),
  onDelete: vi.fn(),
  onSplit: vi.fn(),
  onMerge: vi.fn(),
}

test('shows chapter title', () => {
  render(<ChapterItem {...defaultProps} defaultOpen={false} />)
  expect(screen.getByText('Chapter One')).toBeInTheDocument()
})

test('hides paragraphs when defaultOpen is false', () => {
  render(<ChapterItem {...defaultProps} defaultOpen={false} />)
  expect(screen.queryByText('First paragraph.')).not.toBeInTheDocument()
})

test('shows paragraphs when defaultOpen is true', () => {
  render(<ChapterItem {...defaultProps} defaultOpen={true} />)
  expect(screen.getByText('First paragraph.')).toBeInTheDocument()
  expect(screen.getByText('Second paragraph.')).toBeInTheDocument()
})

test('clicking the title opens a closed chapter', () => {
  render(<ChapterItem {...defaultProps} defaultOpen={false} />)
  fireEvent.click(screen.getByText('Chapter One'))
  expect(screen.getByText('First paragraph.')).toBeInTheDocument()
})

test('clicking the title closes an open chapter', () => {
  render(<ChapterItem {...defaultProps} defaultOpen={true} />)
  fireEvent.click(screen.getByText('Chapter One'))
  expect(screen.queryByText('First paragraph.')).not.toBeInTheDocument()
})

test('falls back to "Chapter N" when title is undefined', () => {
  const noTitle: Chapter = { id: 'ch-3', paragraphs: ['Text.'], order: 3 }
  render(<ChapterItem {...defaultProps} chapter={noTitle} defaultOpen={false} />)
  expect(screen.getByText('Chapter 4')).toBeInTheDocument()
})
