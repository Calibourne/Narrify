'use client'
import { useState, useCallback, useRef } from 'react'
import type { Chapter } from '@/lib/parsers/types'
import { buildZip } from '@/lib/tts/buildZip'

export type Voice = {
  ShortName: string
  FriendlyName: string
  Locale: string
  Gender: string
}

export type ChapterStatus = 'pending' | 'synthesizing' | 'done' | 'failed'

export type ChapterAudio = {
  buffer: Uint8Array
  blobUrl: string
  status: ChapterStatus
}

export type SynthesisPhase = 'idle' | 'detecting' | 'selecting' | 'synthesizing' | 'done' | 'error'

export function useSynthesis(chapters: Chapter[]) {
  const [phase, setPhase] = useState<SynthesisPhase>('idle')
  const [chapterLocales, setChapterLocales] = useState<Record<string, string>>({})
  const [voicesByLocale, setVoicesByLocale] = useState<Record<string, Voice[]>>({})
  const [selectedVoices, setSelectedVoices] = useState<Record<string, string>>({})
  const [chapterAudios, setChapterAudios] = useState<Record<string, ChapterAudio>>({})
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)
  const audioBuffers = useRef(new Map<string, Uint8Array>())

  const detect = useCallback(async () => {
    setPhase('detecting')
    try {
      const samples = chapters.map((ch) => ({
        id: ch.id,
        sample: ch.paragraphs.slice(0, 3).join(' ').slice(0, 500),
      }))
      const res = await fetch('/api/voices/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapters: samples }),
      })
      if (!res.ok) throw new Error(`Detection failed: ${res.statusText}`)
      const { chapterLocales: locales, voicesByLocale: voices } = await res.json()
      setChapterLocales(locales)
      setVoicesByLocale(voices)
      const defaults: Record<string, string> = {}
      for (const [locale, voiceList] of Object.entries(voices as Record<string, Voice[]>)) {
        if (voiceList.length > 0) defaults[locale] = voiceList[0].ShortName
      }
      setSelectedVoices(defaults)
      setPhase('selecting')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection failed')
      setPhase('error')
    }
  }, [chapters])

  const setVoice = useCallback((locale: string, voiceName: string) => {
    setSelectedVoices((prev) => ({ ...prev, [locale]: voiceName }))
  }, [])

  const startSynthesis = useCallback(async () => {
    setPhase('synthesizing')
    setProgress({ done: 0, total: chapters.length })
    audioBuffers.current.clear()

    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i]
      const voice = selectedVoices[chapterLocales[ch.id]] ?? 'en-US-AriaNeural'

      setChapterAudios((prev) => ({
        ...prev,
        [ch.id]: { buffer: new Uint8Array(), blobUrl: '', status: 'synthesizing' },
      }))

      let buffer: Uint8Array | null = null
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch('/api/synthesize/chapter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paragraphs: ch.paragraphs, voice }),
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          buffer = new Uint8Array(await res.arrayBuffer())
          break
        } catch {
          if (attempt === 1) break
        }
      }

      if (buffer) {
        const blob = new Blob([buffer], { type: 'audio/mpeg' })
        const blobUrl = URL.createObjectURL(blob)
        audioBuffers.current.set(ch.id, buffer)
        setChapterAudios((prev) => ({
          ...prev,
          [ch.id]: { buffer, blobUrl, status: 'done' },
        }))
      } else {
        setChapterAudios((prev) => ({
          ...prev,
          [ch.id]: { buffer: new Uint8Array(), blobUrl: '', status: 'failed' },
        }))
      }

      setProgress({ done: i + 1, total: chapters.length })
    }

    setPhase('done')
  }, [chapters, selectedVoices, chapterLocales])

  const downloadZip = useCallback(async () => {
    const blob = await buildZip(chapters, audioBuffers.current)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'audiobook.zip'
    a.click()
    URL.revokeObjectURL(url)
  }, [chapters])

  return {
    phase,
    chapterLocales,
    voicesByLocale,
    selectedVoices,
    setVoice,
    chapterAudios,
    progress,
    error,
    detect,
    startSynthesis,
    downloadZip,
  }
}
