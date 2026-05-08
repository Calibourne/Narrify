'use client'
import { useState, useEffect, useRef } from 'react'
import { parsePlainText } from '@/lib/parsers/txt-parser'
import type { Chapter } from '@/lib/parsers/types'
import styles from './UrlInput.module.css'

type Props = {
  onChapters: (chapters: Chapter[]) => void
  onError: (msg: string) => void
  disabled: boolean
}

type SemanticBlock = { label: string; selector: string; wordCount: number; text: string }

type UiMode =
  | { tag: 'idle' }
  | { tag: 'loading' }
  | { tag: 'picker'; html: string }
  | { tag: 'checklist'; blocks: SemanticBlock[] }
  | { tag: 'paste-fallback' }

export default function UrlInput({ onChapters, onError, disabled }: Props) {
  const [url, setUrl] = useState('')
  const [ui, setUi] = useState<UiMode>({ tag: 'idle' })
  const [pickerTexts, setPickerTexts] = useState<string[]>([])
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [pasteText, setPasteText] = useState('')
  const pickerReadyRef = useRef(false)
  const pickerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data?.type === 'narrify-ready') {
        pickerReadyRef.current = true
        if (pickerTimerRef.current) clearTimeout(pickerTimerRef.current)
      }
      if (e.data?.type === 'narrify-no-hover') loadChecklist()
      if (e.data?.type === 'narrify-selection') {
        setPickerTexts((e.data.selections as { text: string }[]).map((s) => s.text))
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  async function handleGo() {
    if (!url.trim()) return
    setUi({ tag: 'loading' })
    setPickerTexts([])
    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (data.type === 'error') { onError(data.message); setUi({ tag: 'idle' }); return }
      if (data.type === 'chapters') { onChapters(data.chapters); setUi({ tag: 'idle' }); return }
      if (data.type === 'html') {
        setUi({ tag: 'picker', html: data.html })
        pickerReadyRef.current = false
        pickerTimerRef.current = setTimeout(() => {
          if (!pickerReadyRef.current) loadChecklist()
        }, 3000)
      }
    } catch {
      onError('Network error — could not reach server')
      setUi({ tag: 'idle' })
    }
  }

  async function loadChecklist() {
    setUi({ tag: 'loading' })
    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, mode: 'blocks' }),
      })
      const data = await res.json()
      if (data.type === 'blocks') {
        setUi({ tag: 'checklist', blocks: data.blocks })
        setChecked(new Set())
      } else {
        setUi({ tag: 'paste-fallback' })
      }
    } catch {
      setUi({ tag: 'paste-fallback' })
    }
  }

  function dubText(text: string) {
    if (!text.trim()) return
    try {
      const hostname = new URL(url).hostname
      onChapters(parsePlainText(text, hostname))
    } catch {
      onChapters(parsePlainText(text, 'page'))
    }
    setUi({ tag: 'idle' })
  }

  const pickerWords = pickerTexts.join(' ').split(/\s+/).filter(Boolean).length
  const checklistBlocks = ui.tag === 'checklist' ? ui.blocks : []
  const checklistWords = [...checked].reduce((sum, i) => sum + (checklistBlocks[i]?.wordCount ?? 0), 0)

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <input
          className={styles.urlInput}
          placeholder="https://"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGo()}
          disabled={disabled || ui.tag === 'loading'}
        />
        <button
          onClick={handleGo}
          disabled={disabled || !url.trim() || ui.tag === 'loading'}
        >
          {ui.tag === 'loading' ? '…' : 'Go'}
        </button>
      </div>

      {ui.tag === 'picker' && (
        <div className={styles.iframeWrap}>
          <iframe
            className={styles.iframe}
            srcDoc={ui.html}
            sandbox="allow-scripts"
            title="Element picker"
          />
          <div className={styles.tray}>
            <span>{pickerTexts.length} selected · {pickerWords} words</span>
            <button className={styles.ghostBtn} onClick={loadChecklist}>
              Can&apos;t select? Use checklist →
            </button>
            <button onClick={() => dubText(pickerTexts.join('\n\n'))} disabled={pickerWords === 0}>
              Dub selected
            </button>
          </div>
        </div>
      )}

      {ui.tag === 'checklist' && (
        <div>
          {ui.blocks.length === 0 && (
            <p>
              No sections detected.{' '}
              <button className={styles.ghostBtn} onClick={() => setUi({ tag: 'paste-fallback' })}>
                Paste text instead →
              </button>
            </p>
          )}
          {ui.blocks.map((block, i) => (
            <label key={i} className={styles.checkItem}>
              <input
                type="checkbox"
                checked={checked.has(i)}
                onChange={() =>
                  setChecked((prev) => {
                    const next = new Set(prev)
                    next.has(i) ? next.delete(i) : next.add(i)
                    return next
                  })
                }
              />
              <span>{block.label} — {block.selector} ({block.wordCount} words)</span>
            </label>
          ))}
          {ui.blocks.length > 0 && (
            <button
              className={styles.dubBtn}
              onClick={() => dubText([...checked].map((i) => ui.blocks[i].text).join('\n\n'))}
              disabled={checked.size === 0 || checklistWords === 0}
            >
              Dub selected ({checklistWords} words)
            </button>
          )}
          <button className={styles.ghostBtn} onClick={() => setUi({ tag: 'paste-fallback' })}>
            Paste text instead →
          </button>
        </div>
      )}

      {ui.tag === 'paste-fallback' && (
        <div className={styles.selectorWrap}>
          <p className={styles.hint}>Page couldn&apos;t be loaded automatically — paste the text you&apos;d like to dub:</p>
          <textarea
            placeholder="Paste text from the page here…"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            style={{ minHeight: 100, width: '100%' }}
          />
          <button className={styles.dubBtn} onClick={() => dubText(pasteText)} disabled={!pasteText.trim()}>
            Dub
          </button>
        </div>
      )}
    </div>
  )
}
