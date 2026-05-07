const ISO_TO_BCP47: Record<string, string> = {
  eng: 'en-US',
  jpn: 'ja-JP',
  fra: 'fr-FR',
  deu: 'de-DE',
  spa: 'es-ES',
  ita: 'it-IT',
  por: 'pt-BR',
  rus: 'ru-RU',
  zho: 'zh-CN',
  kor: 'ko-KR',
  ara: 'ar-SA',
  nld: 'nl-NL',
  pol: 'pl-PL',
  swe: 'sv-SE',
  nor: 'nb-NO',
  dan: 'da-DK',
  fin: 'fi-FI',
  tur: 'tr-TR',
  hin: 'hi-IN',
  vie: 'vi-VN',
  tha: 'th-TH',
  ind: 'id-ID',
  msa: 'ms-MY',
  ces: 'cs-CZ',
  ron: 'ro-RO',
  hun: 'hu-HU',
  ukr: 'uk-UA',
  cat: 'ca-ES',
}

const FALLBACK = 'en-US'

export function getLocale(iso639_3: string): string {
  return ISO_TO_BCP47[iso639_3] ?? FALLBACK
}

export const LOCALE_LABELS: Record<string, string> = {
  'en-US': 'English (US)',
  'ja-JP': 'Japanese',
  'fr-FR': 'French',
  'de-DE': 'German',
  'es-ES': 'Spanish',
  'it-IT': 'Italian',
  'pt-BR': 'Portuguese (BR)',
  'ru-RU': 'Russian',
  'zh-CN': 'Chinese (Simplified)',
  'ko-KR': 'Korean',
  'ar-SA': 'Arabic',
  'nl-NL': 'Dutch',
  'pl-PL': 'Polish',
  'sv-SE': 'Swedish',
  'nb-NO': 'Norwegian',
  'da-DK': 'Danish',
  'fi-FI': 'Finnish',
  'tr-TR': 'Turkish',
  'hi-IN': 'Hindi',
  'vi-VN': 'Vietnamese',
  'th-TH': 'Thai',
  'id-ID': 'Indonesian',
  'ms-MY': 'Malay',
  'cs-CZ': 'Czech',
  'ro-RO': 'Romanian',
  'hu-HU': 'Hungarian',
  'uk-UA': 'Ukrainian',
  'ca-ES': 'Catalan',
}

export const LOCALE_OPTIONS = Object.entries(LOCALE_LABELS).map(([code, label]) => ({ code, label }))
