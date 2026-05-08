'use client'
import type { Chapter } from '@/lib/parsers/types'
// onChapters and onError wired in Task 3 (full implementation)
type Props = { onChapters: (chs: Chapter[]) => void; onError: (msg: string) => void; disabled: boolean }
export default function PasteInput({ disabled }: Props) {
  return <textarea placeholder="Paste any text to dub…" disabled={disabled} style={{ width: '100%', minHeight: 120 }} />
}
