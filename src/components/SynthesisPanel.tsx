'use client'
import { useSynthesis } from '@/hooks/useSynthesis'
import VoicePicker from '@/components/VoicePicker'
import type { Chapter } from '@/lib/parsers/types'
import styles from './SynthesisPanel.module.css'

type Props = { chapters: Chapter[] }

export default function SynthesisPanel({ chapters }: Props) {
  const {
    phase,
    voicesByLocale,
    chapterLocales,
    selectedVoices,
    setVoice,
    chapterAudios,
    progress,
    error,
    detect,
    startSynthesis,
    downloadZip,
  } = useSynthesis(chapters)

  if (phase === 'idle') {
    return (
      <button onClick={detect} className={styles.btn}>
        Generate Audio
      </button>
    )
  }

  if (phase === 'detecting') {
    return <p className={styles.status}>Detecting languages…</p>
  }

  if (phase === 'error') {
    return <p className={styles.error} role="alert">{error}</p>
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
        <button onClick={startSynthesis} className={styles.btn}>
          Start Synthesis
        </button>
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <p className={styles.progress} role="status">{progress.done}/{progress.total} chapters</p>
      {chapters.map((ch) => {
        const audio = chapterAudios[ch.id]
        return (
          <div key={ch.id} className={styles.chapterRow}>
            <span className={styles.chapterTitle}>{ch.title ?? ch.id}</span>
            {audio?.status === 'done' && (
              <audio controls src={audio.blobUrl} className={styles.player} aria-label={`Audio for ${ch.title ?? ch.id}`} />
            )}
            {audio?.status === 'synthesizing' && (
              <span className={styles.synthesizing}>Synthesizing…</span>
            )}
            {audio?.status === 'failed' && (
              <span className={styles.failed}>Failed</span>
            )}
          </div>
        )
      })}
      {phase === 'done' && (
        <button onClick={downloadZip} className={styles.btn}>
          Download ZIP
        </button>
      )}
    </div>
  )
}
