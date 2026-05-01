import { XMLParser } from 'fast-xml-parser'
import { normalizeParagraphs } from './normalizer'
import type { BookParser, Chapter } from './types'

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

export class Fb2Parser implements BookParser {
  async parse(buffer: Buffer): Promise<Chapter[]> {
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

    if (sections.length > 0) {
      let order = 0
      for (const section of sections) {
        const sec = section as Record<string, unknown>
        const title = extractSectionTitle(sec)
        const rawParagraphs = collectParagraphs(sec)
        const paragraphs = normalizeParagraphs(rawParagraphs)
        if (paragraphs.length === 0) continue
        chapters.push({ id: `chapter-${order}`, title, paragraphs, order })
        order++
      }
    } else {
      // Fallback: treat entire body as single chapter
      const rawParagraphs = collectParagraphs(mainBody as Record<string, unknown>)
      const paragraphs = normalizeParagraphs(rawParagraphs)
      if (paragraphs.length > 0) {
        chapters.push({ id: 'chapter-0', paragraphs, order: 0 })
      }
    }

    if (chapters.length === 0) throw new Error('No content found in FB2')
    return chapters
  }
}
