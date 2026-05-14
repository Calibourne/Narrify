import { EpubParser } from './epub-parser'
import { Fb2Parser } from './fb2-parser'
import { PdfParser } from './pdf-parser'
import { TxtParser } from './txt-parser'
import type { BookParser } from './types'

export { EpubParser, Fb2Parser, PdfParser, TxtParser }
export type { BookParser, Chapter } from './types'

export function selectParser(filename: string): BookParser {
  if (filename.endsWith('.fb2.zip')) return new Fb2Parser()
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'epub') return new EpubParser()
  if (ext === 'fb2') return new Fb2Parser()
  if (ext === 'pdf') return new PdfParser()
  if (ext === 'txt') return new TxtParser(filename)
  throw new Error(`Unsupported format: .${ext}`)
}
