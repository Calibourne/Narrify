'use client'
import { useState } from 'react'
import UploadZone from './UploadZone'
import PasteInput from './PasteInput'
import UrlInput from './UrlInput'
import { selectParser } from '@/lib/parsers'
import type { Chapter } from '@/lib/parsers/types'
import type { useUrlParsing } from '@/hooks/useUrlParsing'
import styles from './InputTabs.module.css'

type Tab = 'upload' | 'url' | 'paste'

type Props = {
  urlParsing: ReturnType<typeof useUrlParsing>
  onChapters: (chapters: Chapter[]) => void
  onError: (msg: string) => void
  disabled: boolean
}

export default function InputTabs({ urlParsing, onChapters, onError, disabled }: Props) {
  const [tab, setTab] = useState<Tab>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)

  async function handleParse() {
    if (!file) return
    setParsing(true)
    try {
      const parser = selectParser(file.name)
      const buffer = new Uint8Array(await file.arrayBuffer())
      onChapters(await parser.parse(buffer))
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setParsing(false)
    }
  }

  const busy = disabled || parsing

  return (
    <div>
      <div className={styles.tabs} role="tablist">
        {(['upload', 'url', 'paste'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`${styles.tab} ${tab === t ? styles.active : ''}`}
            onClick={() => setTab(t)}
            disabled={busy}
          >
            {t === 'upload' ? 'Upload' : t === 'url' ? 'From URL' : 'Paste text'}
          </button>
        ))}
      </div>

      {tab === 'upload' && (
        <>
          <UploadZone onFile={setFile} disabled={busy} />
          {file && (
            <button className={styles.parseBtn} onClick={handleParse} disabled={busy}>
              {parsing ? 'Parsing…' : `Parse "${file.name}"`}
            </button>
          )}
        </>
      )}
      {tab === 'url' && <UrlInput urlParsing={urlParsing} disabled={busy} />}
      {tab === 'paste' && <PasteInput onChapters={onChapters} onError={onError} disabled={busy} />}
    </div>
  )
}
