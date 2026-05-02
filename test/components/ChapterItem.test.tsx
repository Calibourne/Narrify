// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { test, expect, afterEach } from 'vitest'
import ChapterItem from '@/components/ChapterItem'
import type { Chapter } from '@/lib/parsers/types'

afterEach(cleanup)

const chapter: Chapter = {
  id: 'ch-0',
  title: 'Chapter One',
  paragraphs: ['First paragraph.', 'Second paragraph.'],
  order: 0,
}

test('shows chapter title', () => {
  render(<ChapterItem chapter={chapter} defaultOpen={false} />)
  expect(screen.getByText('Chapter One')).toBeInTheDocument()
})

test('hides paragraphs when defaultOpen is false', () => {
  render(<ChapterItem chapter={chapter} defaultOpen={false} />)
  expect(screen.queryByText('First paragraph.')).not.toBeInTheDocument()
})

test('shows paragraphs when defaultOpen is true', () => {
  render(<ChapterItem chapter={chapter} defaultOpen={true} />)
  expect(screen.getByText('First paragraph.')).toBeInTheDocument()
  expect(screen.getByText('Second paragraph.')).toBeInTheDocument()
})

test('clicking the header opens a closed chapter', () => {
  render(<ChapterItem chapter={chapter} defaultOpen={false} />)
  fireEvent.click(screen.getByRole('button'))
  expect(screen.getByText('First paragraph.')).toBeInTheDocument()
})

test('clicking the header closes an open chapter', () => {
  render(<ChapterItem chapter={chapter} defaultOpen={true} />)
  fireEvent.click(screen.getByRole('button'))
  expect(screen.queryByText('First paragraph.')).not.toBeInTheDocument()
})

test('falls back to "Chapter N" when title is undefined', () => {
  const noTitle: Chapter = { id: 'ch-3', paragraphs: ['Text.'], order: 3 }
  render(<ChapterItem chapter={noTitle} defaultOpen={false} />)
  expect(screen.getByText('Chapter 4')).toBeInTheDocument()
})
