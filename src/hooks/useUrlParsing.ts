'use client'
import { useState, useCallback } from 'react'
import type { Chapter } from '@/lib/parsers/types'

export type SemanticBlock = { label: string; selector: string; wordCount: number; text: string }

export type UrlParsingState = {
  tag: 'idle' | 'loading' | 'picker' | 'checklist' | 'paste-fallback'
  url: string
  html?: string
  blocks?: SemanticBlock[]
  pickerTexts: string[]
  checked: Set<number>
  pasteText: string
}

export function useUrlParsing(onChapters: (chs: Chapter[]) => void, onError: (msg: string) => void) {
  const [state, setState] = useState<UrlParsingState>({
    tag: 'idle',
    url: '',
    pickerTexts: [],
    checked: new Set(),
    pasteText: '',
  })

  const reset = useCallback(() => {
    setState({ tag: 'idle', url: '', pickerTexts: [], checked: new Set(), pasteText: '' })
  }, [])

  const setUrl = useCallback((url: string) => {
    setState(prev => ({ ...prev, url }))
  }, [])

  const setTag = useCallback((tag: UrlParsingState['tag']) => {
    setState(prev => ({ ...prev, tag }))
  }, [])

  const updateState = useCallback((updates: Partial<UrlParsingState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const setChecked = useCallback((index: number) => {
    setState(prev => {
      const next = new Set(prev.checked)
      next.has(index) ? next.delete(index) : next.add(index)
      return { ...prev, checked: next }
    })
  }, [])

  return { state, setUrl, setTag, updateState, setChecked, reset }
}
