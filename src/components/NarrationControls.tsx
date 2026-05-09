'use client'
import styles from './NarrationControls.module.css'

function speedLabel(rate: number): string {
  if (rate <= -40) return 'Very Slow'
  if (rate <= -15) return 'Slow'
  if (rate <= 15) return 'Normal'
  if (rate <= 40) return 'Fast'
  return 'Very Fast'
}

function pitchLabel(pitch: number): string {
  if (pitch <= -10) return 'Low'
  if (pitch <= -5) return 'Slightly Low'
  if (pitch <= 0) return 'Normal'
  if (pitch <= 5) return 'Slightly High'
  return 'High'
}

type Props = {
  rate: number
  pitch: number
  onRateChange: (v: number) => void
  onPitchChange: (v: number) => void
}

export default function NarrationControls({ rate, pitch, onRateChange, onPitchChange }: Props) {
  return (
    <div className={styles.controls}>
      <div className={styles.row}>
        <label htmlFor="narration-speed" className={styles.label}>Speed</label>
        <input
          id="narration-speed"
          type="range"
          min={-50}
          max={100}
          step={5}
          value={rate}
          onChange={(e) => onRateChange(Number(e.target.value))}
          className={styles.slider}
          aria-label="Speed"
        />
        <span className={styles.value}>{rate >= 0 ? `+${rate}%` : `${rate}%`}</span>
        <span className={styles.tag}>{speedLabel(rate)}</span>
      </div>
      <div className={styles.row}>
        <label htmlFor="narration-pitch" className={styles.label}>Pitch</label>
        <input
          id="narration-pitch"
          type="range"
          min={-20}
          max={20}
          step={5}
          value={pitch}
          onChange={(e) => onPitchChange(Number(e.target.value))}
          className={styles.slider}
          aria-label="Pitch"
        />
        <span className={styles.value}>{pitch >= 0 ? `+${pitch}Hz` : `${pitch}Hz`}</span>
        <span className={styles.tag}>{pitchLabel(pitch)}</span>
      </div>
    </div>
  )
}
