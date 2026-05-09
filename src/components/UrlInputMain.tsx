'use client'
import { useEffect, useRef } from 'react'
import type { UrlParsingState } from '@/hooks/useUrlParsing'
import styles from './UrlInput.module.css'

type Props = {
  state: UrlParsingState
  setChecked: (index: number) => void
  setPickerTexts: (texts: string[]) => void
  onLoadChecklist: () => void
  setPasteText: (text: string) => void
  onDub: (text: string) => void
}

export default function UrlInputMain({ state, setChecked, setPickerTexts, onLoadChecklist, setPasteText, onDub }: Props) {
  const pickerReadyRef = useRef(false)
  const pickerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (state.tag !== 'picker') return

    function onMsg(e: MessageEvent) {
      if (e.data?.type === 'narrify-ready') {
        pickerReadyRef.current = true
        if (pickerTimerRef.current) clearTimeout(pickerTimerRef.current)
      }
      if (e.data?.type === 'narrify-no-hover') onLoadChecklist()
      if (e.data?.type === 'narrify-selection') {
        setPickerTexts((e.data.selections as { text: string }[]).map((s) => s.text))
      }
    }
    window.addEventListener('message', onMsg)
    
    pickerReadyRef.current = false
    pickerTimerRef.current = setTimeout(() => {
      if (!pickerReadyRef.current) onLoadChecklist()
    }, 3000)

    return () => {
      window.removeEventListener('message', onMsg)
      if (pickerTimerRef.current) clearTimeout(pickerTimerRef.current)
    }
  }, [state.tag, state.url, onLoadChecklist, setPickerTexts])

  if (state.tag === 'picker' && state.html) {
    return (
      <div className={styles.iframeMain}>
        <div className={styles.mainHeader}>
          <span>Page Preview</span>
          <span>Click elements to select</span>
        </div>
        <iframe
          className={styles.iframe}
          srcDoc={state.html}
          sandbox="allow-scripts"
          title="Element picker"
        />
      </div>
    )
  }

  if (state.tag === 'checklist' && state.blocks) {
    return (
      <div className={styles.checklistMain}>
        <h3>Select sections to dub</h3>
        <div className={styles.blocksScroll}>
          {state.blocks.map((block, i) => (
            <label key={i} className={styles.checkItem}>
              <input
                type="checkbox"
                checked={state.checked.has(i)}
                onChange={() => setChecked(i)}
              />
              <span>{block.label} — {block.selector} ({block.wordCount} words)</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  if (state.tag === 'paste-fallback') {
    return (
      <div className={styles.pasteMain}>
        <h3>Paste text manually</h3>
        <textarea
          placeholder="Paste text from the page here…"
          value={state.pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          className={styles.textarea}
        />
        <button 
          className={styles.dubBtn} 
          onClick={() => onDub(state.pasteText)}
          disabled={!state.pasteText.trim()}
        >
          Dub
        </button>
      </div>
    )
  }

  return null
}
