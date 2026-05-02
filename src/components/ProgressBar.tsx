import styles from './ProgressBar.module.css'

type Props = {
  done: number
  total: number
  stage?: 'discovering' | 'extracting' | 'refining'
  label?: string
}

export default function ProgressBar({ done, total, label }: Props) {
  const pending = total <= 0
  const pct = pending ? 12 : Math.round((done / total) * 100)
  const fallbackLabel = pending ? 'Preparing book…' : `${done} / ${total} chapters`
  return (
    <div className={styles.wrapper}>
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${pending ? styles.pending : ''}`}
          data-fill
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={styles.label}>{label ?? fallbackLabel}</span>
      {label && total > 0 && <span className={styles.meta}>{done} / {total} chapters</span>}
    </div>
  )
}
