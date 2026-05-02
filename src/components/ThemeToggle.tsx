'use client'
import { useEffect } from 'react'
import styles from './ThemeToggle.module.css'

type Props = { theme: 'light' | 'dark'; onToggle: () => void }

export default function ThemeToggle({ theme, onToggle }: Props) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <button className={styles.toggle} onClick={onToggle} aria-label="Toggle theme">
      {theme === 'light' ? '☀' : '🌙'}
    </button>
  )
}
