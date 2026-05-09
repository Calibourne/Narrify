'use client'
import { useState, useRef, useEffect } from 'react'
import type { Chapter } from '@/lib/parsers/types'
import type { ChapterStatus } from '@/hooks/useSynthesis'
import styles from './ChapterItem.module.css'
import { formatElapsed } from '@/lib/tts/formatTime'

type Props = {
  chapter: Chapter
  isSelected: boolean
  defaultOpen: boolean
  audioStatus?: ChapterStatus
  blobUrl?: string
  isLast?: boolean
  onToggleSelection: () => void
  onUpdate: (updates: Partial<Pick<Chapter, 'title' | 'paragraphs'>>) => void
  onDelete: () => void
  onSplit: (paragraphIndex: number) => void
  onMerge: () => void
}

export default function ChapterItem({ 
  chapter, 
  isSelected,
  defaultOpen, 
  audioStatus, 
  blobUrl,
  isLast,
  onToggleSelection,
  onUpdate,
  onDelete,
  onSplit,
  onMerge
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(chapter.title ?? '')
  const [editParagraphs, setEditParagraphs] = useState(chapter.paragraphs)
  
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  const title = chapter.title ?? `Chapter ${chapter.order + 1}`

  useEffect(() => {
    if (!blobUrl) return
    const a = new Audio(blobUrl)
    a.addEventListener('timeupdate', () => {
      if (!a.duration) return
      setProgress(a.currentTime / a.duration)
      setCurrentTime(Math.floor(a.currentTime))
      setDuration(Math.floor(a.duration))
    })
    a.addEventListener('ended', () => {
      setPlaying(false)
      setProgress(0)
      setCurrentTime(0)
    })
    audioRef.current = a
    return () => {
      a.pause()
      a.src = ''
      audioRef.current = null
      setPlaying(false)
      setProgress(0)
      setCurrentTime(0)
      setDuration(0)
    }
  }, [blobUrl])

  function handleSeek(e: React.MouseEvent<HTMLSpanElement>) {
    e.stopPropagation()
    const a = audioRef.current
    if (!a || !a.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    a.currentTime = ratio * a.duration
  }

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

  function handleSave() {
    onUpdate({ title: editTitle, paragraphs: editParagraphs })
    setIsEditing(false)
  }

  function handleCancel() {
    setEditTitle(chapter.title ?? '')
    setEditParagraphs(chapter.paragraphs)
    setIsEditing(false)
  }

  const showDot = audioStatus === 'synthesizing' || audioStatus === 'done' || audioStatus === 'failed'

  return (
    <div className={[styles.item, isSelected ? styles.selected : ''].join(' ')}>
      <div className={styles.header} onClick={() => setOpen(!open)}>
        <div className={styles.headerLeft}>
          <input 
            type="checkbox" 
            checked={isSelected} 
            onChange={(e) => {
              e.stopPropagation()
              onToggleSelection()
            }}
            onClick={(e) => e.stopPropagation()}
            className={styles.checkbox}
          />
          {showDot && (
            <span className={[
              styles.statusDot,
              audioStatus === 'synthesizing' ? styles.pulse : '',
              audioStatus === 'failed' ? styles.failedDot : '',
            ].join(' ')} aria-hidden="true" />
          )}
          <span className={styles.title}>{title}</span>
        </div>
        <div className={styles.headerRight}>
          {!isEditing && (
            <div className={styles.actions}>
              <button 
                className={styles.actionBtn} 
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); setOpen(true); }}
                title="Edit chapter"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>
              </button>
              {!isLast && (
                <button 
                  className={styles.actionBtn} 
                  onClick={(e) => { e.stopPropagation(); onMerge(); }}
                  title="Merge with next"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 15l5 5 5-5"></path><path d="M12 9v11"></path><path d="M17 4l-5 5-5-5"></path></svg>
                </button>
              )}
              <button 
                className={[styles.actionBtn, styles.deleteBtn].join(' ')} 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="Delete chapter"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </button>
            </div>
          )}
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
          {audioStatus === 'done' && duration > 0 && (
            <span
              className={styles.timeDisplay}
              aria-label={`${formatElapsed(currentTime)} of ${formatElapsed(duration)}`}
            >
              {formatElapsed(currentTime)}&thinsp;/&thinsp;{formatElapsed(duration)}
            </span>
          )}
          <span className={styles.arrow}>{open ? '▲' : '▼'}</span>
        </div>
        {audioStatus === 'done' && duration > 0 && (
          <span className={styles.progressRail} onClick={handleSeek} aria-hidden="true">
            <span className={styles.progressRailFill} style={{ width: `${progress * 100}%` }} />
          </span>
        )}
      </div>
      {open && (
        <div className={styles.body}>
          {isEditing ? (
            <div className={styles.editSection}>
              <div className={styles.editRow}>
                <label className={styles.editLabel}>Title</label>
                <input 
                  className={styles.titleInput}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div className={styles.paragraphsEdit}>
                {editParagraphs.map((p, i) => (
                  <div key={i} className={styles.paragraphEditRow}>
                    <textarea 
                      className={styles.paragraphInput}
                      value={p}
                      onChange={(e) => {
                        const next = [...editParagraphs]
                        next[i] = e.target.value
                        setEditParagraphs(next)
                      }}
                      rows={Math.max(1, Math.ceil(p.length / 80))}
                    />
                    <div className={styles.paragraphActions}>
                      {i < editParagraphs.length - 1 && (
                        <button 
                          className={styles.splitBtn}
                          onClick={() => onSplit(i + 1)}
                          title="Split into new chapter starting here"
                        >
                          Split Chapter
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.editFooter}>
                <button className={styles.saveBtn} onClick={handleSave}>Save Changes</button>
                <button className={styles.cancelBtn} onClick={handleCancel}>Cancel</button>
              </div>
            </div>
          ) : (
            chapter.paragraphs.map((p, i) => (
              <p key={i} className={styles.paragraph}>{p}</p>
            ))
          )}
        </div>
      )}
    </div>
  )
}
