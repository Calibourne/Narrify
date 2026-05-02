import type { Chapter } from '@/lib/parsers/types'
import ChapterItem from './ChapterItem'
import styles from './ChapterList.module.css'

type Props = { chapters: Chapter[] }

export default function ChapterList({ chapters }: Props) {
  return (
    <div className={styles.list}>
      {chapters.map((ch, i) => (
        <ChapterItem key={ch.id} chapter={ch} defaultOpen={i === 0} />
      ))}
    </div>
  )
}
