'use client'
import { useState } from 'react'
import type { Chapter } from '@/lib/parsers/types'
import { useSynthesis } from '@/hooks/useSynthesis'
import { useUrlParsing } from '@/hooks/useUrlParsing'
import { useBookState } from '@/hooks/useBookState'
import ThemeToggle from '@/components/ThemeToggle'
import InputTabs from '@/components/InputTabs'
import StatsBadge from '@/components/StatsBadge'
import ChapterList from '@/components/ChapterList'
import SynthesisPanel from '@/components/SynthesisPanel'
import UrlInputMain from '@/components/UrlInputMain'
import { deriveBuildVisuals } from '@/lib/buildSlug'
import styles from './page.module.css'

const { name: buildName } = deriveBuildVisuals(process.env.NEXT_PUBLIC_COMMIT_SHA ?? 'dev')

export default function Home() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    return (localStorage.getItem('narrify-theme') as 'light' | 'dark') ?? 'light'
  })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [bookTitle, setBookTitle] = useState<string | undefined>()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  const book = useBookState([])

  const handleChapters = (chs: Chapter[]) => {
    setErrorMsg(null)
    book.setChapters(chs)
    book.selectAll()
    if (chs.length > 0) {
      // For TXT, the first chapter might be the title
      // For others, we might want to capture the filename
      setBookTitle(chs[0].title)
    }
  }

  const handleError = (msg: string) => {
    setErrorMsg(msg)
    book.setChapters([])
    setBookTitle(undefined)
  }

  const synthesis = useSynthesis(book.selectedChapters)
  const urlParsing = useUrlParsing(handleChapters, handleError)

  function toggleTheme() {
    setTheme((t) => {
      const next = t === 'light' ? 'dark' : 'light'
      localStorage.setItem('narrify-theme', next)
      return next
    })
  }

  const busy = synthesis.phase === 'synthesizing'
  const isUrlParsingActive = urlParsing.state.tag !== 'idle' && urlParsing.state.tag !== 'loading'
  const hasChapters = book.chapters.length > 0

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <button
          className={styles.hamburger}
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor" aria-hidden="true">
            <rect width="18" height="2" rx="1"/>
            <rect y="6" width="18" height="2" rx="1"/>
            <rect y="12" width="18" height="2" rx="1"/>
          </svg>
        </button>
        <span className={styles.logoWrap}>
          <span className={styles.logo}>Narrify</span>
        </span>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </nav>

      {sidebarOpen && (
        <div className={styles.backdrop} onClick={() => setSidebarOpen(false)} />
      )}
      <div className={styles.panels}>
        <aside className={`${styles.left}${sidebarOpen ? ` ${styles.open}` : ''}`}>
          <button
            className={styles.drawerClose}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
          <div className={styles.section}>
            <span className={styles.label}>Book</span>
            <InputTabs 
              urlParsing={urlParsing}
              onChapters={handleChapters} 
              onError={handleError} 
              disabled={busy} 
            />
          </div>
          {hasChapters && (
            <SynthesisPanel synthesis={synthesis} bookTitle={bookTitle} />
          )}
          <footer className={styles.versionFooter}>
            <span className={styles.versionName}>{buildName}</span>
            <span className={styles.versionHash}>{(process.env.NEXT_PUBLIC_COMMIT_SHA ?? 'dev').slice(0, 7)}</span>
          </footer>
        </aside>

        <main className={styles.right}>
          {isUrlParsingActive ? (
            <UrlInputMain
              state={urlParsing.state}
              setChecked={urlParsing.setChecked}
              setPickerTexts={urlParsing.setPickerTexts}
              onLoadChecklist={urlParsing.loadChecklist}
              setPasteText={urlParsing.setPasteText}
              onDub={urlParsing.dubText}
            />
          ) : (
            <>
              {!hasChapters && !errorMsg && (
                <p className={styles.empty}>Upload a book to get started.</p>
              )}
              {errorMsg && <p className={styles.error}>{errorMsg}</p>}
              {hasChapters && (
                <>
                  <StatsBadge chapters={book.chapters} />
                  <ChapterList 
                    chapters={book.chapters} 
                    selectedIds={book.selectedIds}
                    chapterAudios={synthesis.chapterAudios} 
                    onToggleSelection={book.toggleSelection}
                    onSelectRange={book.selectRange}
                    onSelectAll={book.selectAll}
                    onDeselectAll={book.deselectAll}
                    onUpdateChapter={book.updateChapter}
                    onDeleteChapter={book.deleteChapter}
                    onSplitChapter={book.splitChapter}
                    onMergeWithNext={book.mergeWithNext}
                  />
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
