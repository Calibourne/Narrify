import { NextRequest, NextResponse } from 'next/server'
import { EdgeTTS } from 'edge-tts-universal'

export async function POST(req: NextRequest) {
  const { paragraphs, voice }: { paragraphs: string[]; voice: string } = await req.json()
  const text = paragraphs.join('\n\n')
  const tts = new EdgeTTS(text, voice)
  const result = await tts.synthesize()
  const mp3 = Buffer.from(await result.audio.arrayBuffer())
  return new NextResponse(mp3, {
    headers: { 'Content-Type': 'audio/mpeg' },
  })
}
