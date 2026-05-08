'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import type { Chapter } from '@/lib/parsers/types'
import { buildZip } from '@/lib/tts/buildZip'

const MAX_SEGMENT_CHARS = 2_500

function splitIntoEqualChunks(paragraphs: string[]): string[][] {
  const totalChars = paragraphs.reduce((sum, p) => sum + p.length, 0)
  if (totalChars === 0) return [paragraphs]

  const n = Math.ceil(totalChars / MAX_SEGMENT_CHARS)
  if (n === 1) return [paragraphs]

  const targetSize = totalChars / n
  const chunks: string[][] = []
  let current: string[] = []
  let currentChars = 0

  for (const p of paragraphs) {
    if (current.length > 0 && currentChars >= targetSize && chunks.length < n - 1) {
      chunks.push(current)
      current = []
      currentChars = 0
    }
    current.push(p)
    currentChars += p.length
  }
  if (current.length > 0) chunks.push(current)

  return chunks
}

function concatBuffers(buffers: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = buffers.reduce((sum, b) => sum + b.length, 0)
  const out = new Uint8Array(new ArrayBuffer(total))
  let offset = 0
  for (const b of buffers) {
    out.set(b, offset)
    offset += b.length
  }
  return out
}

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

export type SynthesisResult = ReturnType<typeof useSynthesis>

export function useSynthesis(chapters: Chapter[]) {
  const [phase, setPhase] = useState<SynthesisPhase>('idle')
  const [chapterLocales, setChapterLocales] = useState<Record<string, string>>({})
  const [voicesByLocale, setVoicesByLocale] = useState<Record<string, Voice[]>>({})
  const [selectedVoices, setSelectedVoices] = useState<Record<string, string>>({})
  const [chapterAudios, setChapterAudios] = useState<Record<string, ChapterAudio>>({})
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)
  const audioBuffers = useRef(new Map<string, Uint8Array>())

  useEffect(() => {
    return () => {
      for (const audio of Object.values(chapterAudios)) {
        if (audio.blobUrl) URL.revokeObjectURL(audio.blobUrl)
      }
    }
  }, [chapterAudios])

  const detect = useCallback(async () => {
    setPhase('detecting')
    try {
      const samples = chapters.map((ch) => ({
        id: ch.id,
        sample: ch.paragraphs.join(' ').slice(0, 3000),
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

  const startSynthesis = useCallback(async (
    localesMap: Record<string, string> = chapterLocales,
    voicesMap: Record<string, string> = selectedVoices,
  ) => {
    setChapterAudios((prev) => {
      for (const audio of Object.values(prev)) {
        if (audio.blobUrl) URL.revokeObjectURL(audio.blobUrl)
      }
      return {}
    })

    const chapterChunks = chapters.map((ch) => splitIntoEqualChunks(ch.paragraphs))
    const totalSegments = chapterChunks.reduce((sum, chunks) => sum + chunks.length, 0)

    setPhase('synthesizing')
    setProgress({ done: 0, total: totalSegments })
    audioBuffers.current.clear()

    let segmentsDone = 0

    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i]
      const voice = voicesMap[localesMap[ch.id]] ?? 'en-US-AriaNeural'
      const chunks = chapterChunks[i]

      setChapterAudios((prev) => ({
        ...prev,
        [ch.id]: { buffer: new Uint8Array(), blobUrl: '', status: 'synthesizing' },
      }))

      const segmentBuffers: Uint8Array[] = []
      let chapterFailed = false

      for (const chunk of chunks) {
        let buffer: Uint8Array | null = null
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const res = await fetch('/api/synthesize/chapter', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paragraphs: chunk, voice }),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            buffer = new Uint8Array(await res.arrayBuffer())
            break
          } catch {
            if (attempt === 1) break
          }
        }

        if (buffer) {
          segmentBuffers.push(buffer)
        } else {
          chapterFailed = true
          break
        }

        segmentsDone++
        setProgress({ done: segmentsDone, total: totalSegments })
      }

      if (!chapterFailed && segmentBuffers.length > 0) {
        const buffer = concatBuffers(segmentBuffers)
        const blob = new Blob([buffer], { type: 'audio/mpeg' })
        const blobUrl = URL.createObjectURL(blob)
        audioBuffers.current.set(ch.id, buffer)
        setChapterAudios((prev) => ({
          ...prev,
          [ch.id]: { buffer, blobUrl, status: 'done' },
        }))
      } else {
        segmentsDone += chunks.length - segmentBuffers.length
        setProgress({ done: segmentsDone, total: totalSegments })
        setChapterAudios((prev) => ({
          ...prev,
          [ch.id]: { buffer: new Uint8Array(), blobUrl: '', status: 'failed' },
        }))
      }
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

  const synthesizeWithLocale = useCallback(async (locale: string, voice: string) => {
    const localesMap = Object.fromEntries(chapters.map((ch) => [ch.id, locale]))
    await startSynthesis(localesMap, { [locale]: voice })
  }, [chapters, startSynthesis])

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
    synthesizeWithLocale,
    downloadZip,
  }
}
