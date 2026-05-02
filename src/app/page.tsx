'use client'
import { useState } from 'react'
import type { Chapter } from '@/lib/parsers/types'
import ThemeToggle from '@/components/ThemeToggle'
import UploadZone from '@/components/UploadZone'
import StatsBadge from '@/components/StatsBadge'
import ChapterList from '@/components/ChapterList'
import styles from './page.module.css'

type Status = 'idle' | 'uploading' | 'success' | 'error'

export default function Home() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    return (localStorage.getItem('narrify-theme') as 'light' | 'dark') ?? 'light'
  })
  const [status, setStatus] = useState<Status>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/parse', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) {
        setErrorMsg(json.error ?? 'Something went wrong. Try again.')
        setStatus('error')
        return
      }
      setChapters(json.chapters)
      setStatus('success')
    } catch {
      setErrorMsg('Something went wrong. Try again.')
      setStatus('error')
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
