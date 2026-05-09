'use client'
import type { UrlParsingState } from '@/hooks/useUrlParsing'
import styles from './UrlInput.module.css'

type Props = {
  state: UrlParsingState
  setUrl: (url: string) => void
  onGo: () => void
  onDub: (text: string) => void
  onCancel: () => void
  onSwitchMode: (mode: 'picker' | 'checklist' | 'paste-fallback') => void
  disabled: boolean
}

export default function UrlInputSidebar({ state, setUrl, onGo, onDub, onCancel, onSwitchMode, disabled }: Props) {
  const isBusy = disabled || state.tag === 'loading'
  const isLocked = state.tag !== 'idle' && state.tag !== 'loading'

  const wordCount = state.tag === 'picker' 
    ? state.pickerTexts.join(' ').split(/\s+/).filter(Boolean).length
    : state.tag === 'checklist'
    ? [...state.checked].reduce((sum, i) => sum + (state.blocks?.[i]?.wordCount ?? 0), 0)
    : 0

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <input
          className={styles.urlInput}
          placeholder="https://"
          value={state.url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onGo()}
          disabled={isBusy || isLocked}
        />
        <button
          className={styles.goBtn}
          onClick={onGo}
          disabled={isBusy || !state.url.trim() || isLocked}
        >
          {state.tag === 'loading' ? '…' : 'Go'}
        </button>
      </div>

      {isLocked && (
        <div className={styles.taskControls}>
          <p className={styles.statusLabel}>
            {state.tag === 'picker' ? 'Selecting elements...' : 'Choosing from checklist...'}
          </p>
          <button 
            className={styles.dubBtn}
            onClick={() => {
              if (state.tag === 'picker') onDub(state.pickerTexts.join('\n\n'))
              if (state.tag === 'checklist') onDub([...state.checked].map(i => state.blocks![i].text).join('\n\n'))
            }}
            disabled={wordCount === 0}
          >
            Dub Selected ({wordCount} words)
          </button>
          <button className={styles.ghostBtn} onClick={onCancel}>Cancel</button>
          
          <div className={styles.modeLinks}>
            {state.tag !== 'checklist' && (
              <button className={styles.linkBtn} onClick={() => onSwitchMode('checklist')}>
                Switch to Checklist
              </button>
            )}
            {state.tag !== 'picker' && state.html && (
              <button className={styles.linkBtn} onClick={() => onSwitchMode('picker')}>
                Switch to Picker
              </button>
            )}
            <button className={styles.linkBtn} onClick={() => onSwitchMode('paste-fallback')}>
              Paste manually
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
