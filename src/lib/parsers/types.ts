export type Chapter = {
  id: string
  title?: string
  paragraphs: string[]
  order: number
}

export type ProgressCallback = (done: number, total: number) => void | Promise<void>

export interface BookParser {
  parse(buffer: Buffer, onProgress?: ProgressCallback): Promise<Chapter[]>
}
