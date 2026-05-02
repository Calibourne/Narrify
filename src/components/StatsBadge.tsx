import type { Chapter } from '@/lib/parsers/types'
import styles from './StatsBadge.module.css'

type Props = { chapters: Chapter[] }

export default function StatsBadge({ chapters }: Props) {
  const total = chapters.reduce((sum, ch) => sum + ch.paragraphs.length, 0)
  return (
    <p className={styles.badge}>
      {chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'} ·{' '}
      {total} {total === 1 ? 'paragraph' : 'paragraphs'}
    </p>
  )
}
