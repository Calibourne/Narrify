export type Chapter = {
  id: string
  title?: string
  paragraphs: string[]
  order: number
}

export interface BookParser {
  parse(file: Buffer): Promise<Chapter[]>
}
