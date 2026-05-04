import { describe, it, expect } from 'vitest'
import { selectParser } from '@/lib/parsers'
import { Fb2Parser } from '@/lib/parsers/fb2-parser'

describe('selectParser', () => {
  it('routes .fb2.zip to Fb2Parser', () => {
    expect(selectParser('book.fb2.zip')).toBeInstanceOf(Fb2Parser)
  })

  it('routes .fb2 to Fb2Parser', () => {
    expect(selectParser('book.fb2')).toBeInstanceOf(Fb2Parser)
  })

  it('throws for unsupported extension', () => {
    expect(() => selectParser('book.docx')).toThrow('Unsupported format')
  })
})
