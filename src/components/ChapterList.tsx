import type { Chapter } from '@/lib/parsers/types'
import type { ChapterAudio } from '@/hooks/useSynthesis'
import ChapterItem from './ChapterItem'
import styles from './ChapterList.module.css'

type Props = {
  chapters: Chapter[]
  chapterAudios?: Record<string, ChapterAudio>
}

export default function ChapterList({ chapters, chapterAudios }: Props) {
  return (
    <div className={styles.list}>
      {chapters.map((ch, i) => {
        const audio = chapterAudios?.[ch.id]
        return (
          <ChapterItem
            key={ch.id}
            chapter={ch}
            defaultOpen={i === 0}
            audioStatus={audio?.status}
            blobUrl={audio?.blobUrl}
          />
        )
      })}
    </div>
  )
}
