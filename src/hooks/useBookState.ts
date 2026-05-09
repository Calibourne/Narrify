'use client'
import { useState, useCallback, useMemo } from 'react'
import type { Chapter } from '@/lib/parsers/types'

export function useBookState(initialChapters: Chapter[]) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialChapters.map(ch => ch.id)))

  const updateChapter = useCallback((id: string, updates: Partial<Pick<Chapter, 'title' | 'paragraphs'>>) => {
    setChapters(prev => prev.map(ch => ch.id === id ? { ...ch, ...updates } : ch))
  }, [])

  const deleteChapter = useCallback((id: string) => {
    setChapters(prev => {
      const filtered = prev.filter(ch => ch.id !== id)
      // Fix order after deletion
      return filtered.map((ch, i) => ({ ...ch, order: i }))
    })
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const splitChapter = useCallback((id: string, paragraphIndex: number, currentParagraphs?: string[]) => {
    setChapters(prev => {
      const index = prev.findIndex(ch => ch.id === id)
      if (index === -1) return prev

      const original = prev[index]
      const paragraphsToUse = currentParagraphs || original.paragraphs
      const before = paragraphsToUse.slice(0, paragraphIndex)
      const after = paragraphsToUse.slice(paragraphIndex)

      if (before.length === 0 || after.length === 0) return prev

      const newChapter: Chapter = {
        id: `${id}-split-${Date.now()}`,
        title: original.title ? `${original.title} (Part 2)` : undefined,
        paragraphs: after,
        order: original.order + 1
      }

      const updatedOriginal = { ...original, paragraphs: before }
      const nextChapters = [
        ...prev.slice(0, index),
        updatedOriginal,
        newChapter,
        ...prev.slice(index + 1)
      ]

      // Re-order everything after
      return nextChapters.map((ch, i) => ({ ...ch, order: i }))
    })
  }, [])

  const mergeWithNext = useCallback((id: string) => {
    setChapters(prev => {
      const index = prev.findIndex(ch => ch.id === id)
      if (index === -1 || index === prev.length - 1) return prev

      const current = prev[index]
      const next = prev[index + 1]

      const merged: Chapter = {
        ...current,
        paragraphs: [...current.paragraphs, ...next.paragraphs]
      }

      const nextChapters = [
        ...prev.slice(0, index),
        merged,
        ...prev.slice(index + 2)
      ]

      return nextChapters.map((ch, i) => ({ ...ch, order: i }))
    })
  }, [])

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectRange = useCallback((query: string) => {
    const parts = query.split(',').map(p => p.trim())
    const newSelected = new Set<string>()
    const max = chapters.length

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-')
        const start = parseInt(startStr, 10)
        const end = parseInt(endStr, 10)
        if (!isNaN(start) && !isNaN(end)) {
          const lo = Math.min(start, end)
          const hi = Math.max(start, end)
          for (let i = lo; i <= hi; i++) {
            if (i >= 1 && i <= max) {
              newSelected.add(chapters[i - 1].id)
            }
          }
        }
      } else {
        const num = parseInt(part, 10)
        if (!isNaN(num) && num >= 1 && num <= max) {
          newSelected.add(chapters[num - 1].id)
        }
      }
    }
    setSelectedIds(newSelected)
  }, [chapters])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(chapters.map(ch => ch.id)))
  }, [chapters])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const selectedChapters = useMemo(() => {
    return chapters.filter(ch => selectedIds.has(ch.id))
  }, [chapters, selectedIds])

  return {
    chapters,
    selectedIds,
    selectedChapters,
    updateChapter,
    deleteChapter,
    splitChapter,
    mergeWithNext,
    toggleSelection,
    selectRange,
    selectAll,
    deselectAll,
    setChapters // For initial load
  }
}
