'use client'
import { useState, useCallback } from 'react'
import type { Chapter } from '@/lib/parsers/types'
import { parsePlainText } from '@/lib/parsers/txt-parser'

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
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return { ...prev, checked: next }
    })
  }, [])

  const setPickerTexts = useCallback((texts: string[]) => {
    setState(prev => ({ ...prev, pickerTexts: texts }))
  }, [])

  const setPasteText = useCallback((text: string) => {
    setState(prev => ({ ...prev, pasteText: text }))
  }, [])

  const handleGo = useCallback(async () => {
    if (!state.url.trim()) return
    setState(prev => ({ ...prev, tag: 'loading', pickerTexts: [] }))
    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: state.url }),
      })
      const data = await res.json()
      if (data.type === 'error') {
        onError(data.message)
        setState(prev => ({ ...prev, tag: 'idle' }))
        return
      }
      if (data.type === 'chapters') {
        onChapters(data.chapters)
        setState(prev => ({ ...prev, tag: 'idle' }))
        return
      }
      if (data.type === 'html') {
        setState(prev => ({ ...prev, tag: 'picker', html: data.html }))
      }
    } catch {
      onError('Network error — could not reach server')
      setState(prev => ({ ...prev, tag: 'idle' }))
    }
  }, [state.url, onChapters, onError])

  const loadChecklist = useCallback(async () => {
    setState(prev => ({ ...prev, tag: 'loading' }))
    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: state.url, mode: 'blocks' }),
      })
      const data = await res.json()
      if (data.type === 'blocks') {
        setState(prev => ({ ...prev, tag: 'checklist', blocks: data.blocks, checked: new Set() }))
      } else {
        setState(prev => ({ ...prev, tag: 'paste-fallback' }))
      }
    } catch {
      setState(prev => ({ ...prev, tag: 'paste-fallback' }))
    }
  }, [state.url])

  const dubText = useCallback((text: string) => {
    if (!text.trim()) return
    try {
      const hostname = new URL(state.url).hostname
      onChapters(parsePlainText(text, hostname))
    } catch {
      onChapters(parsePlainText(text, 'page'))
    }
    setState(prev => ({ ...prev, tag: 'idle', pasteText: '' }))
  }, [state.url, onChapters])

  return {
    state,
    setUrl,
    setTag,
    updateState,
    setChecked,
    setPickerTexts,
    setPasteText,
    handleGo,
    loadChecklist,
    dubText,
    reset,
  }
}
