// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { test, expect } from 'vitest'
import ChapterItem from '@/components/ChapterItem'
import type { Chapter } from '@/lib/parsers/types'

const chapter: Chapter = {
  id: 'ch-0',
  title: 'Chapter One',
  paragraphs: ['First paragraph.', 'Second paragraph.'],
  order: 0,
}

test('shows chapter title', () => {
  const { unmount } = render(<ChapterItem chapter={chapter} defaultOpen={false} />)
  expect(screen.getByText('Chapter One')).toBeInTheDocument()
  unmount()
})

test('hides paragraphs when defaultOpen is false', () => {
  const { unmount } = render(<ChapterItem chapter={chapter} defaultOpen={false} />)
  expect(screen.queryByText('First paragraph.')).not.toBeInTheDocument()
  unmount()
})

test('shows paragraphs when defaultOpen is true', () => {
  const { unmount } = render(<ChapterItem chapter={chapter} defaultOpen={true} />)
  expect(screen.getByText('First paragraph.')).toBeInTheDocument()
  expect(screen.getByText('Second paragraph.')).toBeInTheDocument()
  unmount()
})

test('clicking the header opens a closed chapter', () => {
  const { unmount } = render(<ChapterItem chapter={chapter} defaultOpen={false} />)
  fireEvent.click(screen.getByRole('button'))
  expect(screen.getByText('First paragraph.')).toBeInTheDocument()
  unmount()
})

test('clicking the header closes an open chapter', () => {
  const { unmount } = render(<ChapterItem chapter={chapter} defaultOpen={true} />)
  fireEvent.click(screen.getByRole('button'))
  expect(screen.queryByText('First paragraph.')).not.toBeInTheDocument()
  unmount()
})

test('falls back to "Chapter N" when title is undefined', () => {
  const noTitle: Chapter = { id: 'ch-3', paragraphs: ['Text.'], order: 3 }
  const { unmount } = render(<ChapterItem chapter={noTitle} defaultOpen={false} />)
  expect(screen.getByText('Chapter 4')).toBeInTheDocument()
  unmount()
})
