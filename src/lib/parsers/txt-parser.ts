import { normalizeParagraphs, splitLongParagraphs } from './normalizer'
import type { BookParser, Chapter } from './types'

const HEADING_RE = /^(chapter|глава|часть|part|section)\s+(\d+|[ivxlcdm]+)/i

export class TxtParser implements BookParser {
  private filename: string
  constructor(filename = 'text') { this.filename = filename }

  async parse(buffer: Uint8Array): Promise<Chapter[]> {
    return parsePlainText(new TextDecoder().decode(buffer), this.filename)
  }
}

export function parsePlainText(text: string, filename = 'Pasted text'): Chapter[] {
  const title = filename.replace(/\.txt$/i, '')
  const lines = text.split('\n')

  // Pass 1: heading-based split
  const chunks: { title: string; lines: string[] }[] = []
  let current: { title: string; lines: string[] } | null = null
  let headingFound = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (HEADING_RE.test(trimmed)) {
      headingFound = true
      if (current) chunks.push(current)
      current = { title: trimmed, lines: [] }
    } else {
      if (!current) current = { title, lines: [] }
      current.lines.push(line)
    }
  }
  if (current) chunks.push(current)

  if (headingFound) return toChapters(chunks)

  // Pass 2: double-blank-line split
  const sections = text.split(/\n{2,}/).map((s) => s.trim()).filter((s) => s.length > 0)
  if (sections.length > 1) {
    return sections
      .map((section, i) => toChapter(`${title} (${i + 1})`, section.split('\n'), i))
      .filter((ch) => ch.paragraphs.length > 0)
  }

  // Pass 3: single chapter
  return [toChapter(title, lines, 0)].filter((ch) => ch.paragraphs.length > 0)
}

function toChapters(chunks: { title: string; lines: string[] }[]): Chapter[] {
  return chunks
    .map((chunk, i) => toChapter(chunk.title, chunk.lines, i))
    .filter((ch) => ch.paragraphs.length > 0)
}

function toChapter(title: string, lines: string[], order: number): Chapter {
  return {
    id: `txt-${order}`,
    title,
    paragraphs: splitLongParagraphs(normalizeParagraphs(lines)),
    order,
  }
}
