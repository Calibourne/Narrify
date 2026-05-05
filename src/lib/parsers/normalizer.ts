import he from 'he'

const MAX_PARAGRAPH_LENGTH = 300
const MIN_CHUNK_LENGTH = 50

export function normalizeText(raw: string): string {
  return he
    .decode(raw)
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeParagraphs(texts: string[], dropShort = false): string[] {
  return texts
    .map(normalizeText)
    .filter((s) => s.length > 0)
    .filter((s) => !dropShort || s.length >= 20)
}

export function splitLongParagraphs(paragraphs: string[], maxLength = MAX_PARAGRAPH_LENGTH): string[] {
  const segmenter = tryCreateSegmenter()
  const result: string[] = []
  for (const para of paragraphs) {
    const lines = para.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
    for (const line of lines) {
      if (line.length <= maxLength) {
        result.push(line)
      } else {
        result.push(...mergeOrphans(groupSentences(splitBySentence(line, segmenter), maxLength), maxLength))
      }
    }
  }
  return result
}

function tryCreateSegmenter(): Intl.Segmenter | null {
  try {
    return new Intl.Segmenter(undefined, { granularity: 'sentence' })
  } catch {
    return null
  }
}

function splitBySentence(text: string, segmenter: Intl.Segmenter | null): string[] {
  if (segmenter) {
    return Array.from(segmenter.segment(text)).map((s) => s.segment)
  }
  return text.split(/(?<=[\u3002\uFF01\uFF1F\u2026.!?]+)\s*/).filter((s) => s.trim().length > 0)
}

function splitByWordBoundary(text: string, maxLength: number): string[] {
  const chunks: string[] = []
  let remaining = text.trim()
  while (remaining.length > maxLength) {
    const slice = remaining.slice(0, maxLength)
    const lastSpace = slice.lastIndexOf(' ')
    const cutAt = lastSpace > 0 ? lastSpace : maxLength
    chunks.push(remaining.slice(0, cutAt).trim())
    remaining = remaining.slice(cutAt).trim()
  }
  if (remaining.length > 0) chunks.push(remaining)
  return chunks
}

function groupSentences(sentences: string[], maxLength: number): string[] {
  const chunks: string[] = []
  let current = ''
  for (const sentence of sentences) {
    const parts = sentence.length > maxLength ? splitByWordBoundary(sentence, maxLength) : [sentence]
    for (const part of parts) {
      if (current.length === 0) {
        current = part
      } else if (current.length + part.length <= maxLength) {
        current += part
      } else {
        chunks.push(current)
        current = part
      }
    }
  }
  if (current.trim().length > 0) chunks.push(current)
  return chunks
}

function mergeOrphans(chunks: string[], maxLength: number): string[] {
  if (chunks.length <= 1) return chunks
  const result: string[] = []
  for (const chunk of chunks) {
    const prev = result[result.length - 1]
    if (chunk.length < MIN_CHUNK_LENGTH && prev !== undefined && prev.length + chunk.length <= maxLength) {
      result[result.length - 1] += chunk
    } else {
      result.push(chunk)
    }
  }
  return result
}
