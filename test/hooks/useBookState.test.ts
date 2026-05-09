// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useBookState } from '@/hooks/useBookState'
import type { Chapter } from '@/lib/parsers/types'

const initialChapters: Chapter[] = [
  { id: '1', title: 'Ch 1', paragraphs: ['P1', 'P2'], order: 0 },
  { id: '2', title: 'Ch 2', paragraphs: ['P3'], order: 1 },
]

describe('useBookState', () => {
  it('initializes with chapters and selects all by default', () => {
    const { result } = renderHook(() => useBookState(initialChapters))
    expect(result.current.chapters).toHaveLength(2)
    expect(result.current.selectedIds.size).toBe(2)
  })

  it('updates a chapter', () => {
    const { result } = renderHook(() => useBookState(initialChapters))
    act(() => {
      result.current.updateChapter('1', { title: 'Updated' })
    })
    expect(result.current.chapters[0].title).toBe('Updated')
  })

  it('deletes a chapter and updates orders', () => {
    const { result } = renderHook(() => useBookState(initialChapters))
    act(() => {
      result.current.deleteChapter('1')
    })
    expect(result.current.chapters).toHaveLength(1)
    expect(result.current.chapters[0].id).toBe('2')
    expect(result.current.chapters[0].order).toBe(0)
    expect(result.current.selectedIds.has('1')).toBe(false)
  })

  it('splits a chapter', () => {
    const { result } = renderHook(() => useBookState(initialChapters))
    act(() => {
      result.current.splitChapter('1', 1) // Split after 'P1'
    })
    expect(result.current.chapters).toHaveLength(3)
    expect(result.current.chapters[0].paragraphs).toEqual(['P1'])
    expect(result.current.chapters[1].paragraphs).toEqual(['P2'])
    expect(result.current.chapters[1].order).toBe(1)
    expect(result.current.chapters[2].order).toBe(2)
  })

  it('merges with next chapter', () => {
    const { result } = renderHook(() => useBookState(initialChapters))
    act(() => {
      result.current.mergeWithNext('1')
    })
    expect(result.current.chapters).toHaveLength(1)
    expect(result.current.chapters[0].paragraphs).toEqual(['P1', 'P2', 'P3'])
  })

  it('toggles selection', () => {
    const { result } = renderHook(() => useBookState(initialChapters))
    act(() => {
      result.current.toggleSelection('1')
    })
    expect(result.current.selectedIds.has('1')).toBe(false)
    act(() => {
      result.current.toggleSelection('1')
    })
    expect(result.current.selectedIds.has('1')).toBe(true)
  })

  it('selects ranges correctly', () => {
    const manyChapters: Chapter[] = Array.from({ length: 20 }, (_, i) => ({
      id: `${i + 1}`,
      paragraphs: ['text'],
      order: i
    }))
    const { result } = renderHook(() => useBookState(manyChapters))
    
    act(() => {
      result.current.selectRange('1-3, 5, 10-12')
    })
    
    const expected = new Set(['1', '2', '3', '5', '10', '11', '12'])
    expect(result.current.selectedIds).toEqual(expected)
  })
})
