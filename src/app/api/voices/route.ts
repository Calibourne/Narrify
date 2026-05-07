import { NextRequest, NextResponse } from 'next/server'
import { VoicesManager } from 'edge-tts-universal'

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get('locale') ?? 'en-US'
  const [lang] = locale.split('-')
  const manager = await VoicesManager.create()
  const voices = manager.find({ Language: lang })
  return NextResponse.json(voices.length > 0 ? voices : manager.find({ Language: 'en' }))
}
