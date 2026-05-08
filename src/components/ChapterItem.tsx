'use client'
import { useState, useRef, useEffect } from 'react'
import type { Chapter } from '@/lib/parsers/types'
import type { ChapterStatus } from '@/hooks/useSynthesis'
import styles from './ChapterItem.module.css'

type Props = {
  chapter: Chapter
  defaultOpen: boolean
  audioStatus?: ChapterStatus
  blobUrl?: string
}

export default function ChapterItem({ chapter, defaultOpen, audioStatus, blobUrl }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const title = chapter.title ?? `Chapter ${chapter.order + 1}`

  useEffect(() => {
    if (!blobUrl) return
    const a = new Audio(blobUrl)
    a.addEventListener('timeupdate', () => {
      if (a.duration) setProgress(a.currentTime / a.duration)
    })
    a.addEventListener('ended', () => {
      setPlaying(false)
      setProgress(0)
    })
    audioRef.current = a
    return () => {
      a.pause()
      a.src = ''
      audioRef.current = null
      setPlaying(false)
      setProgress(0)
    }
  }, [blobUrl])

  function togglePlay(e: React.MouseEvent) {
    e.stopPropagation()
    const a = audioRef.current
    if (!a) return
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      a.play()
      setPlaying(true)
    }
  }

  const showDot = audioStatus === 'synthesizing' || audioStatus === 'done' || audioStatus === 'failed'

  return (
    <div className={styles.item}>
      <button className={styles.header} onClick={() => setOpen(!open)}>
        <span className={styles.headerLeft}>
          {showDot && (
            <span className={[
              styles.statusDot,
              audioStatus === 'synthesizing' ? styles.pulse : '',
              audioStatus === 'failed' ? styles.failedDot : '',
            ].join(' ')} aria-hidden="true" />
          )}
          <span className={styles.title}>{title}</span>
        </span>
        <span className={styles.headerRight}>
          {audioStatus === 'done' && (
            <button
              className={styles.playBtn}
              onClick={togglePlay}
              aria-label={playing ? `Pause ${title}` : `Play ${title}`}
            >
              {playing ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                  <rect x="1.5" y="1" width="2.5" height="8" rx="0.5" />
                  <rect x="6" y="1" width="2.5" height="8" rx="0.5" />
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                  <polygon points="2,1 9,5 2,9" />
                </svg>
              )}
            </button>
          )}
          <span className={styles.arrow}>{open ? '▲' : '▼'}</span>
        </span>
        {playing && (
          <span className={styles.progressRail} style={{ width: `${progress * 100}%` }} aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className={styles.body}>
          {chapter.paragraphs.map((p, i) => (
            <p key={i} className={styles.paragraph}>{p}</p>
          ))}
        </div>
      )}
    </div>
  )
}
