import { NextRequest, NextResponse } from 'next/server'
import { selectParser } from '@/lib/parsers'

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

  let chapters
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    chapters = await parser.parse(buffer)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Parse failed'
    const isKnownParseError =
      message.startsWith('Invalid') || message.startsWith('No content')
    return NextResponse.json({ error: message }, { status: isKnownParseError ? 422 : 500 })
  }

  return NextResponse.json({ chapters })
}
