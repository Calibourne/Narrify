'use client'
import { useState, useEffect } from 'react'
import type { SynthesisResult, Voice } from '@/hooks/useSynthesis'
import VoicePicker from '@/components/VoicePicker'
import { LOCALE_OPTIONS } from '@/lib/tts/langMap'
import styles from './SynthesisPanel.module.css'
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

  useEffect(() => {
    fetch(`/api/voices?locale=${idleLocale}`)
      .then((r) => r.json())
      .then((voices: Voice[]) => {
        setIdleVoices(voices)
        setIdleVoice(voices[0]?.ShortName ?? '')
      })
      .catch(() => {})
  }, [idleLocale])

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
          onChange={(e) => setIdleVoice(e.target.value)}
          disabled={idleVoices.length === 0}
          aria-label="Voice"
        >
          {idleVoices.map((v) => (
            <option key={v.ShortName} value={v.ShortName}>{v.FriendlyName}</option>
          ))}
        </select>
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
        <button onClick={cancel} className={styles.ghostBtn}>Cancel</button>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className={styles.panel}>
        <p className={styles.error} role="alert">{error}</p>
        <button onClick={cancel} className={styles.ghostBtn}>Start Over</button>
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
        <div className={styles.buttonRow}>
          <button onClick={() => startSynthesis()} className={styles.btn}>
            Start Synthesis
          </button>
          <button onClick={cancel} className={styles.ghostBtn}>Cancel</button>
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
        <button onClick={cancel} className={styles.ghostBtn}>
          {phase === 'synthesizing' ? 'Abort' : 'Start Over'}
        </button>
      </div>
    </div>
  )
}
