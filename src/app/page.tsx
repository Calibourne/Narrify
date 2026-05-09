'use client'
import { useState } from 'react'
import type { Chapter } from '@/lib/parsers/types'
import { useSynthesis } from '@/hooks/useSynthesis'
import ThemeToggle from '@/components/ThemeToggle'
import InputTabs from '@/components/InputTabs'
import StatsBadge from '@/components/StatsBadge'
import ChapterList from '@/components/ChapterList'
import SynthesisPanel from '@/components/SynthesisPanel'
import styles from './page.module.css'

export default function Home() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    return (localStorage.getItem('narrify-theme') as 'light' | 'dark') ?? 'light'
  })
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const synthesis = useSynthesis(chapters)

  function toggleTheme() {
    setTheme((t) => {
      const next = t === 'light' ? 'dark' : 'light'
      localStorage.setItem('narrify-theme', next)
      return next
    })
  }

  function handleChapters(chs: Chapter[]) {
    setErrorMsg(null)
    setChapters(chs)
  }

  function handleError(msg: string) {
    setErrorMsg(msg)
    setChapters([])
  }

  const busy = synthesis.phase === 'synthesizing'

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <span className={styles.logoWrap}>
          <span className={styles.logo}>Narrify</span>
        </span>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </nav>

      <div className={styles.panels}>
        <aside className={styles.left}>
          <div className={styles.section}>
            <span className={styles.label}>Book</span>
            <InputTabs onChapters={handleChapters} onError={handleError} disabled={busy} />
          </div>
          {chapters.length > 0 && <SynthesisPanel synthesis={synthesis} />}
        </aside>

        <main className={styles.right}>
          {chapters.length === 0 && !errorMsg && (
            <p className={styles.empty}>Upload a book to get started.</p>
          )}
          {errorMsg && <p className={styles.error}>{errorMsg}</p>}
          {chapters.length > 0 && (
            <>
              <StatsBadge chapters={chapters} />
              <ChapterList chapters={chapters} chapterAudios={synthesis.chapterAudios} />
            </>
          )}
        </main>
      </div>
    </div>
  )
}
