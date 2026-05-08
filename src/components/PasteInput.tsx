'use client'
import { useState } from 'react'
import { parsePlainText } from '@/lib/parsers/txt-parser'
import type { Chapter } from '@/lib/parsers/types'
import styles from './PasteInput.module.css'

type Props = {
  onChapters: (chapters: Chapter[]) => void
  onError: (msg: string) => void
  disabled: boolean
}

const WARN_AT = 50_000

export default function PasteInput({ onChapters, onError, disabled }: Props) {
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')

  function handleDub() {
    try {
      const chapters = parsePlainText(text, title.trim() || 'Pasted text')
      if (chapters.length === 0) { onError('No readable text found'); return }
      onChapters(chapters)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to parse text')
    }
  }

  const overLimit = text.length > WARN_AT

  return (
    <div className={styles.wrap}>
      <input
        type="text"
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={disabled}
      />
      <textarea
        className={styles.textarea}
        placeholder="Paste any text to dub…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
      />
      <div className={styles.meta}>
        <span>{text.length.toLocaleString()} chars</span>
        {overLimit && <span className={styles.warning}>Large text — synthesis may take a while</span>}
      </div>
      <button
        className={styles.btn}
        onClick={handleDub}
        disabled={disabled || text.trim().length === 0}
      >
        Dub
      </button>
    </div>
  )
}
