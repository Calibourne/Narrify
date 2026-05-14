import { normalizeParagraphs, splitLongParagraphs } from './normalizer'
import type { BookParser, Chapter } from './types'

const PARAGRAPHS_PER_CHAPTER = 25

const KEYWORD_HEADING_RE = /^(chapter|part|section|глава|часть)\s+[\w\d]+/i
const NUMBERED_HEADING_RE = /^\d+[\.\)]\s+[A-ZА-ЯЁ]/
const ALL_CAPS_RE = /^[A-Z\s\d\-:]+$/

function isHeading(p: string): boolean {
  if (p.length > 80) return false
  if (KEYWORD_HEADING_RE.test(p)) return true
  if (NUMBERED_HEADING_RE.test(p)) return true
  const letterCount = (p.match(/[A-Z]/g) || []).length
  if (p.length <= 60 && ALL_CAPS_RE.test(p) && letterCount >= 3) return true
  return false
}

export function parsePdfText(paragraphs: string[]): Chapter[] {
  const headingIndices: number[] = []
  for (let i = 0; i < paragraphs.length - 1; i++) {
    if (isHeading(paragraphs[i]) && !isHeading(paragraphs[i + 1])) {
      headingIndices.push(i)
    }
  }

  if (headingIndices.length >= 1) {
    return splitAtHeadings(paragraphs, headingIndices)
  }

  return groupByParagraphCount(paragraphs)
}

function splitAtHeadings(paragraphs: string[], headingIndices: number[]): Chapter[] {
  const chapters: Chapter[] = []

  for (let h = 0; h < headingIndices.length; h++) {
    const start = headingIndices[h]
    const end = h + 1 < headingIndices.length ? headingIndices[h + 1] : paragraphs.length
    const title = paragraphs[start]
    const content = paragraphs.slice(start + 1, end).filter((p) => !isHeading(p))

    if (content.length === 0) continue

    const order = chapters.length
    chapters.push({
      id: `pdf-${order}`,
      title,
      paragraphs: splitLongParagraphs(normalizeParagraphs(content)),
      order,
    })
  }

  return chapters
}

function groupByParagraphCount(paragraphs: string[]): Chapter[] {
  const chapters: Chapter[] = []

  for (let i = 0; i < paragraphs.length; i += PARAGRAPHS_PER_CHAPTER) {
    const chunk = paragraphs.slice(i, i + PARAGRAPHS_PER_CHAPTER)
    const order = chapters.length
    chapters.push({
      id: `pdf-${order}`,
      title: `Part ${order + 1}`,
      paragraphs: splitLongParagraphs(normalizeParagraphs(chunk)),
      order,
    })
  }

  return chapters
}

export class PdfParser implements BookParser {
  async parse(buffer: Uint8Array): Promise<Chapter[]> {
    const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')

    if (typeof window !== 'undefined') {
      GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString()
    }

    const pdf = await getDocument({ data: buffer }).promise
    const allParagraphs: string[] = []

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const content = await page.getTextContent()

      let pageText = ''
      for (const item of content.items) {
        if ('str' in item) {
          pageText += item.str
          if (item.hasEOL) pageText += '\n'
        }
      }

      const pageParagraphs = pageText
        .split(/\n{2,}/)
        .map((p) => p.replace(/\n/g, ' ').trim())
        .filter((p) => p.length > 20)

      allParagraphs.push(...pageParagraphs)
    }

    return parsePdfText(allParagraphs)
  }
}
