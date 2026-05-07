import type { Voice } from '@/hooks/useSynthesis'
import styles from './VoicePicker.module.css'

type Props = {
  locale: string
  voices: Voice[]
  chapterCount: number
  selectedVoice: string
  onSelect: (voiceName: string) => void
}

export default function VoicePicker({ locale, voices, chapterCount, selectedVoice, onSelect }: Props) {
  const label = `${locale} (${chapterCount} chapter${chapterCount !== 1 ? 's' : ''})`
  return (
    <div className={styles.picker}>
      <label htmlFor={`voice-${locale}`} className={styles.label}>{label}</label>
      <select
        id={`voice-${locale}`}
        value={selectedVoice}
        onChange={(e) => onSelect(e.target.value)}
        className={styles.select}
      >
        {voices.map((v) => (
          <option key={v.ShortName} value={v.ShortName}>
            {v.ShortName}
          </option>
        ))}
      </select>
    </div>
  )
}
