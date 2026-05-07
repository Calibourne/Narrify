import { NextRequest, NextResponse } from 'next/server'
import { franc } from 'franc'
import { VoicesManager } from 'edge-tts-universal'
import { getLocale } from '@/lib/tts/langMap'

type ChapterSample = { id: string; sample: string }

export async function POST(req: NextRequest) {
  let body: { chapters?: ChapterSample[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!Array.isArray(body.chapters)) {
    return NextResponse.json({ error: 'chapters must be an array' }, { status: 400 })
  }

  try {
    const chapterLocales: Record<string, string> = {}
    const localeSet = new Set<string>()

    for (const { id, sample } of body.chapters) {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
