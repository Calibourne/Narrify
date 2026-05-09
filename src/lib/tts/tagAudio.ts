import ID3Writer from 'browser-id3-writer'

export function tagAudio(
  buffer: Uint8Array, 
  metadata: { 
    title?: string, 
    track: number, 
    totalTracks: number,
    album?: string 
  }
): Uint8Array {
  const writer = new ID3Writer(buffer)
  
  if (metadata.title) {
    writer.setFrame('TIT2', metadata.title)
  }
  
  writer.setFrame('TRCK', `${metadata.track}/${metadata.totalTracks}`)
  
  if (metadata.album) {
    writer.setFrame('TALB', metadata.album)
  }
  
  writer.addTag()
  return new Uint8Array(writer.arrayBuffer)
}
