import type { Chapter } from '@/lib/parsers/types'
import type { ChapterAudio } from '@/hooks/useSynthesis'
import ChapterItem from './ChapterItem'
import styles from './ChapterList.module.css'
import { useState } from 'react'

type Props = {
  chapters: Chapter[]
  selectedIds: Set<string>
  chapterAudios?: Record<string, ChapterAudio>
  onToggleSelection: (id: string) => void
  onSelectRange: (query: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onUpdateChapter: (id: string, updates: Partial<Pick<Chapter, 'title' | 'paragraphs'>>) => void
  onDeleteChapter: (id: string) => void
  onSplitChapter: (id: string, paragraphIndex: number, currentParagraphs?: string[]) => void
  onMergeWithNext: (id: string) => void
}

export default function ChapterList({ 
  chapters, 
  selectedIds,
  chapterAudios, 
  onToggleSelection,
  onSelectRange,
  onSelectAll,
  onDeselectAll,
  onUpdateChapter,
  onDeleteChapter,
  onSplitChapter,
  onMergeWithNext
}: Props) {
  const [rangeQuery, setRangeQuery] = useState('')

  const allSelected = selectedIds.size === chapters.length
  const noneSelected = selectedIds.size === 0

  function handleRangeSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSelectRange(rangeQuery)
    setRangeQuery('')
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.bulkActions}>
          <button 
            className={styles.toolbarBtn}
            onClick={allSelected ? onDeselectAll : onSelectAll}
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          <span className={styles.selectionCount}>
            {selectedIds.size} of {chapters.length} selected
          </span>
        </div>
        
        <form className={styles.rangeForm} onSubmit={handleRangeSubmit}>
          <input 
            type="text" 
            placeholder="Range (e.g. 1-10, 15)" 
            className={styles.rangeInput}
            value={rangeQuery}
            onChange={(e) => setRangeQuery(e.target.value)}
          />
          <button type="submit" className={styles.rangeBtn}>Select</button>
        </form>
      </div>

      <div className={styles.list}>
        {chapters.map((ch, i) => {
          const audio = chapterAudios?.[ch.id]
          return (
            <ChapterItem
              key={ch.id}
              chapter={ch}
              isSelected={selectedIds.has(ch.id)}
              defaultOpen={i === 0}
              audioStatus={audio?.status}
              blobUrl={audio?.blobUrl}
              onToggleSelection={() => onToggleSelection(ch.id)}
              onUpdate={(updates) => onUpdateChapter(ch.id, updates)}
              onDelete={() => onDeleteChapter(ch.id)}
              onSplit={(pIdx) => onSplitChapter(ch.id, pIdx)}
              onMerge={() => onMergeWithNext(ch.id)}
              isLast={i === chapters.length - 1}
            />
          )
        })}
      </div>
    </div>
  )
}
