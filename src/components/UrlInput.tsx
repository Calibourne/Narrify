'use client'
import type { Chapter } from '@/lib/parsers/types'
// onChapters and onError wired in Task 5 (full implementation)
type Props = { onChapters: (chs: Chapter[]) => void; onError: (msg: string) => void; disabled: boolean }
export default function UrlInput({ disabled }: Props) {
  return <input placeholder="https://" disabled={disabled} style={{ width: '100%' }} />
}
