'use client'
import { useState } from 'react'
import type { Chapter, ParseStage } from '@/lib/parsers/types'
import ThemeToggle from '@/components/ThemeToggle'
import UploadZone from '@/components/UploadZone'
import StatsBadge from '@/components/StatsBadge'
import ChapterList from '@/components/ChapterList'
import ProgressBar from '@/components/ProgressBar'
import styles from './page.module.css'

type Status = 'idle' | 'uploading' | 'success' | 'error'
type ProgressState = {
  done: number
  total: number
  stage?: ParseStage
  label?: string
}

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text()
  if (text) {
    try {
      const json = JSON.parse(text) as { error?: string; message?: string }
      if (json.error) return json.error
      if (json.message) return json.message
    } catch {
      return text
    }
    return text
  }

  if (res.status && res.statusText) {
    return `${res.status} ${res.statusText}`
  }

  return 'Something went wrong. Try again.'
}

export default function Home() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    return (localStorage.getItem('narrify-theme') as 'light' | 'dark') ?? 'light'
  })
  const [status, setStatus] = useState<Status>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressState | null>(null)

  function toggleTheme() {
    setTheme((t) => {
      const next = t === 'light' ? 'dark' : 'light'
      localStorage.setItem('narrify-theme', next)
      return next
    })
  }

  function handleFile(f: File) {
    setFile(f)
    setErrorMsg(null)
    setStatus('idle')
    setChapters([])
  }

  function handleClear() {
    setFile(null)
    setStatus('idle')
    setChapters([])
    setErrorMsg(null)
  }

  async function handleParse() {
    if (!file) return
    setStatus('uploading')
    setErrorMsg(null)
    setProgress({ done: 0, total: 0, stage: 'discovering', label: 'Scanning book structure…' })
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        body: file,
        headers: { 'x-filename': file.name },
      })
      if (!res.ok) {
        setErrorMsg(await readErrorMessage(res))
        setStatus('error')
        setProgress(null)
        return
      }
      if (!res.body) {
        throw new Error('Empty response body')
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() ?? ''
        for (const chunk of chunks) {
          const line = chunk.trim()
          if (!line.startsWith('data: ')) continue
          const event = JSON.parse(line.slice(6))
          if (event.type === 'progress') {
            setProgress({
              done: event.done,
              total: event.total,
              stage: event.stage,
              label: event.label,
            })
          } else if (event.type === 'done') {
            setChapters(event.chapters)
            setStatus('success')
            setProgress(null)
          } else if (event.type === 'error') {
            setErrorMsg(event.message ?? 'Something went wrong. Try again.')
            setStatus('error')
            setProgress(null)
          }
        }
      }
    } catch {
      setErrorMsg('Something went wrong. Try again.')
      setStatus('error')
      setProgress(null)
    }
  }

  const uploading = status === 'uploading'
  const fileTooLarge = file !== null && file.size > 4.5 * 1024 * 1024

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <span className={styles.logo}>Narrify</span>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </nav>

      <div className={styles.panels}>
        <aside className={styles.left}>
          <div className={styles.section}>
            <span className={styles.label}>Book</span>
            <UploadZone onFile={handleFile} disabled={uploading} />
            {file && (
              <div className={styles.fileRow}>
                <span className={styles.fileName}>📄 {file.name}</span>
                <button className={styles.clearBtn} onClick={handleClear} aria-label="Remove file">
                  ✕
                </button>
              </div>
            )}
            {fileTooLarge && (
              <p className={styles.warning}>File may exceed server limit (4.5 MB)</p>
            )}
          </div>

          <button
            className={styles.parseBtn}
            disabled={!file || uploading}
            onClick={handleParse}
          >
            {uploading ? 'Parsing…' : 'Parse Book'}
          </button>

          {uploading && progress && (
            <ProgressBar
              done={progress.done}
              total={progress.total}
              stage={progress.stage}
              label={progress.label}
            />
          )}
          {errorMsg && <p className={styles.error}>{errorMsg}</p>}
        </aside>

        <main className={styles.right}>
          {status !== 'success' && (
            <p className={styles.empty}>Upload a book to get started.</p>
          )}
          {status === 'success' && chapters.length > 0 && (
            <>
              <StatsBadge chapters={chapters} />
              <ChapterList chapters={chapters} />
            </>
          )}
        </main>
      </div>
    </div>
  )
}
