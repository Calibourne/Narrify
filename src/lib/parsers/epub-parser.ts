import JSZip from 'jszip'
import * as cheerio from 'cheerio'
import { XMLParser } from 'fast-xml-parser'
import { normalizeParagraphs } from './normalizer'
import type { BookParser, Chapter } from './types'

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

function toArray<T>(v: T | T[] | undefined): T[] {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

function resolveHref(opfPath: string, href: string): string {
  const base = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : ''
  return base + href
}

export class EpubParser implements BookParser {
  async parse(buffer: Buffer): Promise<Chapter[]> {
    const zip = await JSZip.loadAsync(buffer)

    const containerXml = await zip.file('META-INF/container.xml')?.async('string')
    if (!containerXml) throw new Error('Invalid EPUB: missing META-INF/container.xml')

    const container = xmlParser.parse(containerXml)
    const rootfiles = toArray(container?.container?.rootfiles?.rootfile)
    const opfPath: string = rootfiles[0]?.['@_full-path']
    if (!opfPath) throw new Error('Invalid EPUB: cannot locate OPF file')

    const opfXml = await zip.file(opfPath)?.async('string')
    if (!opfXml) throw new Error(`Invalid EPUB: OPF not found at ${opfPath}`)

    const opf = xmlParser.parse(opfXml)
    const pkg = opf?.package ?? opf

    const manifestItems = toArray(pkg?.manifest?.item)
    const manifestById = new Map<string, { href: string; mediaType: string; properties: string }>()
    for (const item of manifestItems) {
      manifestById.set(item['@_id'], {
        href: item['@_href'],
        mediaType: item['@_media-type'] ?? '',
        properties: item['@_properties'] ?? '',
      })
    }

    const spineItemrefs = toArray(pkg?.spine?.itemref)
    const chapters: Chapter[] = []
    let order = 0

    for (const itemref of spineItemrefs) {
      const idref = itemref['@_idref']
      const manifest = manifestById.get(idref)
      if (!manifest) continue

      // Skip nav and NCX items
      if (manifest.properties.includes('nav')) continue
      if (manifest.mediaType === 'application/x-dtbncx+xml') continue

      const fullPath = resolveHref(opfPath, manifest.href)
      const content = await zip.file(fullPath)?.async('string')
      if (!content) continue

      const $ = cheerio.load(content)
      const title = $('h1,h2,h3').first().text().trim() || undefined
      const rawParagraphs = $('p')
        .map((_, el) => $(el).text())
        .get()

      const paragraphs = normalizeParagraphs(rawParagraphs)
      if (paragraphs.length === 0) continue

      chapters.push({ id: `chapter-${order}`, title, paragraphs, order })
      order++
    }

    if (chapters.length === 0) throw new Error('No content found in EPUB')
    return chapters
  }
}
