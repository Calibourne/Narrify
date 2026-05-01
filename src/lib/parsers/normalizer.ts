import he from 'he'

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
