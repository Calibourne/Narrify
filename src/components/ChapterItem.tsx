'use client'
import { useState } from 'react'
import type { Chapter } from '@/lib/parsers/types'
import styles from './ChapterItem.module.css'

type Props = { chapter: Chapter; defaultOpen: boolean }

export default function ChapterItem({ chapter, defaultOpen }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const title = chapter.title ?? `Chapter ${chapter.order + 1}`

  return (
    <div className={styles.item}>
      <button className={styles.header} onClick={() => setOpen(!open)}>
        <span className={styles.title}>{title}</span>
        <span className={styles.arrow}>{open ? '▲' : '▼'}</span>
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
