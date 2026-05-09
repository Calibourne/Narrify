'use client'
import { useState, useEffect } from 'react'
import type { SynthesisResult, Voice } from '@/hooks/useSynthesis'
import VoicePicker from '@/components/VoicePicker'
import { LOCALE_OPTIONS } from '@/lib/tts/langMap'
import styles from './SynthesisPanel.module.css'
import NarrationControls from '@/components/NarrationControls'
import { formatElapsed, formatEta } from '@/lib/tts/formatTime'

type Props = { synthesis: SynthesisResult }

export default function SynthesisPanel({ synthesis }: Props) {
  const {
    phase,
    voicesByLocale,
    chapterLocales,
    selectedVoices,
    setVoice,
    progress,
    error,
    rate,
    pitch,
    setRate,
    setPitch,
    detect,
    startSynthesis,
    synthesizeWithLocale,
    downloadZip,
    cancel,
  } = synthesis

  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (phase !== 'synthesizing') return
    const start = Date.now()
    setElapsed(0)
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => {
      clearInterval(id)
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }
  }, [phase])

  const [idleLocale, setIdleLocale] = useState('en-US')
  const [idleVoices, setIdleVoices] = useState<Voice[]>([])
  const [idleVoice, setIdleVoice] = useState('')

  // Load from localStorage on mount
  useEffect(() => {
    const savedRate = localStorage.getItem('narrify-rate')
    const savedPitch = localStorage.getItem('narrify-pitch')
    const savedLocale = localStorage.getItem('narrify-locale')
    if (savedRate) setRate(parseFloat(savedRate))
    if (savedPitch) setPitch(parseFloat(savedPitch))
    if (savedLocale) setIdleLocale(savedLocale)
  }, [setRate, setPitch])

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('narrify-rate', rate.toString())
    localStorage.setItem('narrify-pitch', pitch.toString())
    localStorage.setItem('narrify-locale', idleLocale)
  }, [rate, pitch, idleLocale])

  useEffect(() => {
    fetch(`/api/voices?locale=${idleLocale}`)
      .then((r) => r.json())
      .then((voices: Voice[]) => {
        setIdleVoices(voices)
        const savedVoice = localStorage.getItem(`narrify-voice-${idleLocale}`)
        setIdleVoice(savedVoice || voices[0]?.ShortName || '')
      })
      .catch(() => {})
  }, [idleLocale])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (phase === 'idle' && idleVoice) {
          synthesizeWithLocale(idleLocale, idleVoice)
        } else if (phase === 'selecting') {
          startSynthesis()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase, idleVoice, idleLocale, synthesizeWithLocale, startSynthesis])

  if (phase === 'idle') {
    return (
      <div className={styles.panel}>
        <div className={styles.localeRow}>
          <select
            className={styles.select}
            value={idleLocale}
            onChange={(e) => setIdleLocale(e.target.value)}
            aria-label="Language"
          >
            {LOCALE_OPTIONS.map(({ code, label }) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
          <button onClick={detect} className={styles.ghostBtn}>Auto-detect</button>
        </div>
        <select
          className={styles.select}
          value={idleVoice}
          onChange={(e) => handleVoiceChange(e.target.value)}
          disabled={idleVoices.length === 0}
          aria-label="Voice"
        >
          {idleVoices.map((v) => (
            <option key={v.ShortName} value={v.ShortName}>{v.FriendlyName}</option>
          ))}
        </select>
        <NarrationControls
          rate={rate}
          pitch={pitch}
          onRateChange={setRate}
          onPitchChange={setPitch}
        />
        <button
          onClick={() => synthesizeWithLocale(idleLocale, idleVoice)}
          disabled={!idleVoice}
          className={styles.btn}
        >
          Generate Audio
        </button>
      </div>
    )
  }

  if (phase === 'detecting') {
    return (
      <div className={styles.panel}>
        <p className={styles.status}>Detecting languages…</p>
        <button type="button" onClick={cancel} className={styles.ghostBtn}>Cancel</button>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className={styles.panel}>
        <p className={styles.error} role="alert">{error}</p>
        <button type="button" onClick={cancel} className={styles.ghostBtn}>Start Over</button>
      </div>
    )
  }

  if (phase === 'selecting') {
    return (
      <div className={styles.panel}>
        {Object.entries(voicesByLocale).map(([locale, voices]) => {
          const count = Object.values(chapterLocales).filter((l) => l === locale).length
          return (
            <VoicePicker
              key={locale}
              locale={locale}
              voices={voices}
              chapterCount={count}
              selectedVoice={selectedVoices[locale] ?? ''}
              onSelect={(v) => setVoice(locale, v)}
            />
          )
        })}
        <NarrationControls
          rate={rate}
          pitch={pitch}
          onRateChange={setRate}
          onPitchChange={setPitch}
        />
        <div className={styles.buttonRow}>
          <button onClick={() => startSynthesis()} className={styles.btn}>
            Start Synthesis
          </button>
          <button type="button" onClick={cancel} className={styles.ghostBtn}>Cancel</button>
        </div>
      </div>
    )
  }

  const etaLabel = phase === 'synthesizing'
    ? formatEta(elapsed, progress.done, progress.total)
    : null

  return (
    <div className={styles.panel}>
      <div className={styles.progressWrapper}>
        <progress
          className={styles.progressBar}
          value={progress.done}
          max={progress.total}
          aria-label="Synthesis progress"
        />
        <span className={styles.progressLabel} role="status">
          {progress.done} / {progress.total} segments
        </span>
        {(phase === 'synthesizing' || phase === 'done') && (
          <>
            <span className={styles.timerRow}>
              {phase === 'done'
                ? `Done in ${formatElapsed(elapsed)}`
                : `Elapsed: ${formatElapsed(elapsed)}`}
            </span>
            {etaLabel && <span className={styles.eta}>{etaLabel}</span>}
          </>
        )}
      </div>
      <div className={styles.buttonRow}>
        {phase === 'done' && (
          <button onClick={downloadZip} className={styles.btn}>
            Download ZIP
          </button>
        )}
        <button type="button" onClick={cancel} className={styles.ghostBtn}>
          {phase === 'synthesizing' ? 'Abort' : 'Start Over'}
        </button>
      </div>
    </div>
  )
}
