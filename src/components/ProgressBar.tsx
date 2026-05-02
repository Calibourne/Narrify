import styles from './ProgressBar.module.css'

type Props = {
  done: number
  total: number
}

export default function ProgressBar({ done, total }: Props) {
  const pending = total <= 0
  const pct = pending ? 12 : Math.round((done / total) * 100)
  return (
    <div className={styles.wrapper}>
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${pending ? styles.pending : ''}`}
          data-fill
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={styles.label}>{pending ? 'Preparing book…' : `${done} / ${total} chapters`}</span>
    </div>
  )
}
