import { NextRequest, NextResponse } from 'next/server'
import { EdgeTTS } from 'edge-tts-universal'

export async function POST(req: NextRequest) {
  let body: { paragraphs?: string[]; voice?: string; rate?: string; pitch?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!Array.isArray(body.paragraphs) || typeof body.voice !== 'string') {
    return NextResponse.json({ error: 'paragraphs (array) and voice (string) are required' }, { status: 400 })
  }

  const rate = body.rate ?? '+0%'
  const pitch = body.pitch ?? '+0Hz'

  if (!/^[+-]\d+%$/.test(rate)) {
    return NextResponse.json({ error: 'rate must be a signed percentage string, e.g. "+10%"' }, { status: 400 })
  }
  if (!/^[+-]\d+Hz$/.test(pitch)) {
    return NextResponse.json({ error: 'pitch must be a signed Hz string, e.g. "+5Hz"' }, { status: 400 })
  }

  try {
    const text = body.paragraphs.join('\n\n')
    const tts = new EdgeTTS(text, body.voice, { rate, pitch })
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
