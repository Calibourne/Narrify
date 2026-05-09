'use client'
import { useState } from 'react'
import type { Chapter } from '@/lib/parsers/types'
import { useSynthesis } from '@/hooks/useSynthesis'
import { useUrlParsing } from '@/hooks/useUrlParsing'
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
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  const handleChapters = (chs: Chapter[]) => {
    setErrorMsg(null)
    setChapters(chs)
  }

  const handleError = (msg: string) => {
    setErrorMsg(msg)
    setChapters([])
  }

  const synthesis = useSynthesis(chapters)
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
            <InputTabs 
              urlParsing={urlParsing}
              onChapters={handleChapters} 
              onError={handleError} 
              disabled={busy} 
            />
          </div>
          {chapters.length > 0 && (
            <SynthesisPanel synthesis={synthesis} />
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
            </>
          )}
        </main>
      </div>
    </div>
  )
}
