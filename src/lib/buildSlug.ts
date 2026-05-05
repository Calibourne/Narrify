const ADJECTIVES = ['swift','calm','bright','deep','wild','gentle','bold','quiet','sharp','warm','cool','crisp','keen','soft','quick','light']
const NOUNS      = ['ocean','pine','stone','ember','frost','river','cloud','ridge','storm','grove','cliff','bloom','shore','peak','dusk','dawn']

function toByte(s: string, byteIndex: number): number {
  const hex = s.slice(byteIndex * 2, byteIndex * 2 + 2)
  const val = parseInt(hex, 16)
  return isNaN(val) ? (s.charCodeAt(Math.min(byteIndex, s.length - 1)) % 256) : val
}

export function deriveBuildVisuals(sha: string): { hue: number; name: string } {
  const b0 = toByte(sha, 0)
  const b1 = toByte(sha, 1)
  const b2 = toByte(sha, 2)
  return {
    hue: Math.round((b0 / 255) * 359),
    name: `${ADJECTIVES[b1 % 16]}-${NOUNS[b2 % 16]}`,
  }
}
