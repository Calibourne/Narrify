import { EpubParser } from './epub-parser'
import { Fb2Parser } from './fb2-parser'
import type { BookParser } from './types'

export { EpubParser, Fb2Parser }
export type { BookParser, Chapter } from './types'

export function selectParser(filename: string): BookParser {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'epub') return new EpubParser()
  if (ext === 'fb2') return new Fb2Parser()
  throw new Error(`Unsupported format: .${ext}`)
}
