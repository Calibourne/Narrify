import { NextRequest, NextResponse } from 'next/server'
import { EdgeTTS } from 'edge-tts-universal'

export async function POST(req: NextRequest) {
  let body: { paragraphs?: string[]; voice?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!Array.isArray(body.paragraphs) || typeof body.voice !== 'string') {
    return NextResponse.json({ error: 'paragraphs (array) and voice (string) are required' }, { status: 400 })
  }

  try {
    const text = body.paragraphs.join('\n\n')
    const tts = new EdgeTTS(text, body.voice)
    const result = await tts.synthesize()
    const mp3 = Buffer.from(await result.audio.arrayBuffer())
    return new NextResponse(mp3, {
      headers: { 'Content-Type': 'audio/mpeg' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Synthesis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
