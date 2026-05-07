import { NextRequest, NextResponse } from 'next/server'
import { franc } from 'franc'
import { VoicesManager } from 'edge-tts-universal'
import { getLocale } from '@/lib/tts/langMap'

type ChapterSample = { id: string; sample: string }

export async function POST(req: NextRequest) {
  const { chapters }: { chapters: ChapterSample[] } = await req.json()

  const chapterLocales: Record<string, string> = {}
  const localeSet = new Set<string>()

  for (const { id, sample } of chapters) {
    const iso = franc(sample, { minLength: 20 })
    const locale = getLocale(iso)
    chapterLocales[id] = locale
    localeSet.add(locale)
  }

  const manager = await VoicesManager.create()
  const voicesByLocale: Record<string, unknown[]> = {}

  for (const locale of localeSet) {
    const [lang] = locale.split('-')
    const voices = manager.find({ Language: lang })
    voicesByLocale[locale] = voices.length > 0
      ? voices
      : manager.find({ Language: 'en' })
  }

  return NextResponse.json({ chapterLocales, voicesByLocale })
}
