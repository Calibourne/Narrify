import { SaxesParser } from 'saxes'
import { normalizeParagraphs } from './normalizer'
import type { BookParser, Chapter, ProgressCallback, ProgressEvent } from './types'

interface RawSection {
  title: string
  paragraphs: string[]
  children: RawSection[]
}

interface ParseResult {
  topSections: RawSection[]
  bodyParagraphs: string[]
}

function detectEncoding(buffer: Uint8Array): string {
  const header = new TextDecoder('ascii').decode(buffer.slice(0, 200))
  const match = header.match(/encoding=["']([^"']+)["']/i)
  return match ? match[1].toLowerCase() : 'utf-8'
}

function chunkParagraphs(paragraphs: string[], chunkSize: number): string[][] {
  const chunks: string[][] = []
  for (let i = 0; i < paragraphs.length; i += chunkSize) {
    chunks.push(paragraphs.slice(i, i + chunkSize))
  }
  return chunks
}

function collectAllParagraphs(sections: RawSection[]): string[] {
  const result: string[] = []
  for (const s of sections) {
    result.push(...s.paragraphs)
    if (s.children.length > 0) result.push(...collectAllParagraphs(s.children))
  }
  return result
}

function parseFb2(xmlString: string): ParseResult {
  const parser = new SaxesParser({ xmlns: true })

  const sectionStack: RawSection[] = []
  const topSections: RawSection[] = []
  const bodyParagraphs: string[] = []

  let bodyCount = 0
  let inBody = false
  let inTitle = false
  let inP = false
  let currentText = ''

  parser.on('opentag', (node) => {
    const local = node.local || node.name

    if (local === 'body') {
      bodyCount++
      if (bodyCount === 1) inBody = true
      return
    }

    if (!inBody) return

    if (local === 'section') {
      sectionStack.push({ title: '', paragraphs: [], children: [] })
    } else if (local === 'title' && sectionStack.length > 0) {
      inTitle = true
    } else if (local === 'p') {
      inP = true
      currentText = ''
    }
  })

  parser.on('text', (text) => {
    if (inP) currentText += text
  })

  parser.on('cdata', (cdata) => {
    if (inP) currentText += cdata
  })

  parser.on('closetag', (node) => {
    const local = node.local || node.name

    if (local === 'body') {
      inBody = false
      return
    }

    if (!inBody) return

    if (local === 'p' && inP) {
      const text = currentText.trim()
      inP = false
      currentText = ''

      if (text) {
        if (sectionStack.length > 0) {
          const current = sectionStack[sectionStack.length - 1]
          if (inTitle) {
            current.title = current.title ? `${current.title} ${text}` : text
          } else {
            current.paragraphs.push(text)
          }
        } else {
          bodyParagraphs.push(text)
        }
      }
      return
    }

    if (local === 'title') {
      inTitle = false
      return
    }

    if (local === 'section') {
      const completed = sectionStack.pop()!
      if (sectionStack.length === 0) {
        topSections.push(completed)
      } else {
        sectionStack[sectionStack.length - 1].children.push(completed)
      }
    }
  })

  parser.write(xmlString).close()

  return { topSections, bodyParagraphs }
}

async function emit(onProgress: ProgressCallback | undefined, event: ProgressEvent): Promise<void> {
  await onProgress?.(event)
}

export class Fb2Parser implements BookParser {
  async parse(buffer: Uint8Array, onProgress?: ProgressCallback): Promise<Chapter[]> {
    const encoding = detectEncoding(buffer)
    let xmlString: string
    try {
      xmlString = new TextDecoder(encoding).decode(buffer)
    } catch {
      xmlString = new TextDecoder('utf-8').decode(buffer)
    }

    const { topSections, bodyParagraphs } = parseFb2(xmlString)

    const chapters: Chapter[] = []
    let order = 0

    if (topSections.length > 0) {
      const total = topSections.length
      let done = 0

      await emit(onProgress, { done, total, stage: 'discovering', label: 'Scanning book structure…' })
      await emit(onProgress, { done, total, stage: 'extracting', label: 'Building chapter candidates…' })

      for (const section of topSections) {
        const rawParagraphs =
          section.paragraphs.length > 0 ? section.paragraphs : collectAllParagraphs(section.children)
        const paragraphs = normalizeParagraphs(rawParagraphs)
        done++
        if (paragraphs.length > 0) {
          chapters.push({
            id: `chapter-${order}`,
            title: section.title || undefined,
            paragraphs,
            order,
          })
          order++
        }
        await emit(onProgress, { done, total, stage: 'extracting', label: 'Building chapter candidates…' })
      }
    } else {
      const rawParagraphs = normalizeParagraphs(bodyParagraphs)
      const chunks = chunkParagraphs(rawParagraphs, 24)
      const total = Math.max(chunks.length, 1)
      let done = 0

      await emit(onProgress, { done, total, stage: 'discovering', label: 'Scanning book structure…' })
      await emit(onProgress, { done, total, stage: 'extracting', label: 'Building chapter candidates…' })

      for (const chunk of chunks) {
        if (chunk.length > 0) {
          chapters.push({ id: `chapter-${order}`, paragraphs: chunk, order })
          order++
        }
        done++
        await emit(onProgress, { done, total, stage: 'extracting', label: 'Building chapter candidates…' })
      }
    }

    if (chapters.length === 0) throw new Error('No content found in FB2')
    return chapters
  }
}
