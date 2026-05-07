import JSZip from 'jszip'
import type { Chapter } from '@/lib/parsers/types'

export function slugifyTitle(title: string | undefined, fallback: string): string {
  const raw = (title ?? fallback).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return raw || fallback
}

export async function buildZip(chapters: Chapter[], audios: Map<string, Uint8Array>): Promise<Blob> {
  const zip = new JSZip()
  const total = chapters.length
  const padLen = String(total).length
  for (const ch of chapters) {
    const buf = audios.get(ch.id)
    if (!buf) continue
    const num = String(ch.order + 1).padStart(padLen, '0')
    const slug = slugifyTitle(ch.title, ch.id)
    zip.file(`${num}-${slug}.mp3`, buf)
  }
  return zip.generateAsync({ type: 'blob' })
}
