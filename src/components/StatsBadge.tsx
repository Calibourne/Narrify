import type { Chapter } from '@/lib/parsers/types'
import styles from './StatsBadge.module.css'

type Props = { chapters: Chapter[] }

export default function StatsBadge({ chapters }: Props) {
  const total = chapters.reduce((sum, ch) => sum + ch.paragraphs.length, 0)
  return (
    <div className={styles.badge}>
      <span className={styles.pill}>
        <span className={styles.num}>{chapters.length}</span>
        <span className={styles.lbl}>{chapters.length === 1 ? 'chapter' : 'chapters'}</span>
      </span>
      <span className={styles.pill}>
        <span className={styles.num}>{total}</span>
        <span className={styles.lbl}>{total === 1 ? 'paragraph' : 'paragraphs'}</span>
      </span>
    </div>
  )
}
