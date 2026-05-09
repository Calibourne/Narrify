import { useState } from 'react'
import type { Chapter } from '@/lib/parsers/types'
import type { ChapterAudio } from '@/hooks/useSynthesis'
import ChapterItem from './ChapterItem'
import styles from './ChapterList.module.css'

type Props = {
  chapters: Chapter[]
  chapterAudios?: Record<string, ChapterAudio>
}

export default function ChapterList({ chapters, chapterAudios }: Props) {
  const [filter, setFilter] = useState('')

  const filtered = chapters.filter(ch => 
    ch.title.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <input
          type="text"
          className={styles.search}
          placeholder="Search chapters..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <span className={styles.count}>{filtered.length} of {chapters.length}</span>
      </div>
      <div className={styles.list}>
        {filtered.map((ch, i) => {
          const audio = chapterAudios?.[ch.id]
          return (
            <ChapterItem
              key={ch.id}
              chapter={ch}
              defaultOpen={i === 0 && !filter}
              audioStatus={audio?.status}
              blobUrl={audio?.blobUrl}
            />
          )
        })}
      </div>
    </div>
  )
}
