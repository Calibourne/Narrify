'use client'
import { useRef, useState } from 'react'
import styles from './UploadZone.module.css'

type Props = { onFile: (file: File) => void; disabled: boolean }

export default function UploadZone({ onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <div
      className={`${styles.zone} ${dragging ? styles.dragging : ''} ${disabled ? styles.disabled : ''}`}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <span>Drop .epub, .fb2, .fb2.zip, or .txt here</span>
      <span className={styles.hint}>or click to browse</span>
      <input
        ref={inputRef}
        type="file"
        accept=".epub,.fb2,.fb2.zip,.txt"
        disabled={disabled}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}
