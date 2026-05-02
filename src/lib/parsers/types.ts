export type Chapter = {
  id: string
  title?: string
  paragraphs: string[]
  order: number
}

export type ParseStage = 'discovering' | 'extracting' | 'refining'

export type ProgressEvent = {
  done: number
  total: number
  stage?: ParseStage
  label?: string
}

export type ProgressCallback = (event: ProgressEvent) => void | Promise<void>

export interface BookParser {
  parse(buffer: Buffer, onProgress?: ProgressCallback): Promise<Chapter[]>
}
