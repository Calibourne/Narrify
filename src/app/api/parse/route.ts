import { NextRequest, NextResponse } from 'next/server'
import { selectParser } from '@/lib/parsers'

function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(request: NextRequest) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart request' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  let parser
  try {
    parser = selectParser(file.name)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unsupported format' },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const pushEvent = async (data: unknown) => {
        controller.enqueue(encoder.encode(sseEvent(data)))
        await Promise.resolve()
      }

      try {
        const chapters = await parser.parse(buffer, async (event) => {
          await pushEvent({ type: 'progress', ...event })
        })
        await pushEvent({ type: 'done', chapters })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Parse failed'
        await pushEvent({ type: 'error', message })
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
