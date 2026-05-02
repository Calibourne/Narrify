import { XMLParser } from 'fast-xml-parser'
import { normalizeParagraphs } from './normalizer'
import type { BookParser, Chapter, ProgressCallback, ProgressEvent } from './types'

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (name) => ['section', 'p', 'body'].includes(name),
})

function toArray<T>(v: T | T[] | undefined): T[] {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

function extractText(node: unknown): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (!node || typeof node !== 'object') return ''
  const obj = node as Record<string, unknown>
  const textParts: string[] = []
  if (obj['#text']) textParts.push(String(obj['#text']))
  for (const key of Object.keys(obj)) {
    if (key.startsWith('@_')) continue
    if (key === '#text') continue
    textParts.push(extractText(obj[key]))
  }
  return textParts.join(' ')
}

function collectParagraphs(section: Record<string, unknown>): string[] {
  const result: string[] = []
  const paragraphs = toArray(section['p'] as unknown)
  for (const p of paragraphs) {
    result.push(extractText(p))
  }
  const nested = toArray(section['section'] as unknown)
  for (const sub of nested) {
    result.push(...collectParagraphs(sub as Record<string, unknown>))
  }
  return result
}

function collectTopLevelParagraphs(section: Record<string, unknown>): string[] {
  return toArray(section['p'] as unknown).map(extractText)
}

function extractSectionTitle(section: Record<string, unknown>): string | undefined {
  const titleNode = section['title'] as Record<string, unknown> | undefined
  if (!titleNode) return undefined
  const titleParts = toArray(titleNode['p'] as unknown).map(extractText)
  const joined = titleParts.join(' ').trim()
  return joined || undefined
}

function detectEncoding(buffer: Buffer): string {
  const header = buffer.slice(0, 200).toString('ascii')
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

async function emit(onProgress: ProgressCallback | undefined, event: ProgressEvent): Promise<void> {
  await onProgress?.(event)
}

export class Fb2Parser implements BookParser {
  async parse(buffer: Buffer, onProgress?: ProgressCallback): Promise<Chapter[]> {
    const encoding = detectEncoding(buffer)
    let xmlString: string
    try {
      xmlString = new TextDecoder(encoding).decode(buffer)
    } catch {
      xmlString = new TextDecoder('utf-8').decode(buffer)
    }

    const parsed = xmlParser.parse(xmlString)
    const root = parsed?.FictionBook ?? parsed
    const bodies = toArray(root?.body)
    const mainBody = bodies[0]
    if (!mainBody) throw new Error('Invalid FB2: no body element found')

    const sections = toArray(mainBody?.section)
    const chapters: Chapter[] = []
    let order = 0

    if (sections.length > 0) {
      const total = sections.length
      let done = 0
      await emit(onProgress, {
        done,
        total,
        stage: 'discovering',
        label: 'Scanning book structure…',
      })
      await emit(onProgress, {
        done,
        total,
        stage: 'extracting',
        label: 'Building chapter candidates…',
      })

      for (const section of sections) {
        const sec = section as Record<string, unknown>
        const title = extractSectionTitle(sec)
        const rawParagraphs = collectTopLevelParagraphs(sec)
        const nestedParagraphs = rawParagraphs.length > 0 ? [] : collectParagraphs(sec)
        const paragraphs = normalizeParagraphs(rawParagraphs.length > 0 ? rawParagraphs : nestedParagraphs)
        done++
        if (paragraphs.length > 0) {
          chapters.push({ id: `chapter-${order}`, title, paragraphs, order })
          order++
        }
        await emit(onProgress, {
          done,
          total,
          stage: 'extracting',
          label: 'Building chapter candidates…',
        })
      }
    } else {
      const rawParagraphs = normalizeParagraphs(collectParagraphs(mainBody as Record<string, unknown>))
      const chunks = chunkParagraphs(rawParagraphs, 24)
      const total = Math.max(chunks.length, 1)
      let done = 0

      await emit(onProgress, {
        done,
        total,
        stage: 'discovering',
        label: 'Scanning book structure…',
      })
      await emit(onProgress, {
        done,
        total,
        stage: 'extracting',
        label: 'Building chapter candidates…',
      })

      for (const chunk of chunks) {
        if (chunk.length > 0) {
          chapters.push({ id: `chapter-${order}`, paragraphs: chunk, order })
          order++
        }
        done++
        await emit(onProgress, {
          done,
          total,
          stage: 'extracting',
          label: 'Building chapter candidates…',
        })
      }
    }

    if (chapters.length === 0) throw new Error('No content found in FB2')
    return chapters
  }
}
