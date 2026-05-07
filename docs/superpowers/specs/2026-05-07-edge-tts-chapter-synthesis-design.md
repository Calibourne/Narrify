# Design: edge-tts Chapter Synthesis

**Date:** 2026-05-07  
**Status:** Approved

## Context

Narrify parses ebooks (EPUB, FB2) into chapters with paragraphs already split to ≤300 chars. The goal is to synthesize each chapter into an MP3 using `edge-tts-universal`, then bundle all chapters into a downloadable ZIP. In-browser audio preview is a secondary convenience. Books may span multiple languages (e.g. English preamble + Japanese body), so voice selection is per-language, not per-book.

---

## Server Routes

### `POST /api/voices/detect`

**Input:**
```ts
{ chapters: { id: string; sample: string }[] }
// sample = first ~500 chars of each chapter's paragraphs joined
```

**Logic:**
1. Run `franc(sample)` per chapter → ISO 639-3 code → map to BCP47 locale (e.g. `jpn` → `ja-JP`)
2. Group chapter IDs by locale
3. For each unique locale, query `VoicesManager` from `edge-tts-universal` for available voices
4. Return grouped voices + per-chapter locale assignment

**Output:**
```ts
{
  chapterLocales: Record<string, string>;       // chapterId → locale
  voicesByLocale: Record<string, VoiceMeta[]>;  // locale → available voices
}
```

---

### `POST /api/synthesize/chapter`

**Input:**
```ts
{ paragraphs: string[]; voice: string }
```

**Logic:**
1. Join `paragraphs` with `\n\n` → full chapter text
2. `const tts = new EdgeTTS(text, voice)`
3. `const result = await tts.synthesize()`
4. `const mp3 = Buffer.from(await result.audio.arrayBuffer())`
5. Return binary with `Content-Type: audio/mpeg`

**Timeout safety:** One `EdgeTTS` call per chapter synthesizes well under 30s for typical chapter sizes. Safe for Vercel Hobby.

---

## Client: `useSynthesis` Hook

### Phase 1 — Language & Voice Detection
1. Build `{ id, sample }` array (first ~500 chars of each chapter)
2. POST to `/api/voices/detect`
3. Store `chapterLocales` and `voicesByLocale` in state
4. Render one `<VoicePicker>` per detected locale (e.g. "English (2 chapters)" / "Japanese (34 chapters)")
5. Wait for user to confirm selections before starting synthesis

### Phase 2 — Sequential Chapter Synthesis
For each chapter in order:
- Look up voice for this chapter's locale
- POST `{ paragraphs, voice }` to `/api/synthesize/chapter`
- Receive `ArrayBuffer` → store as `Uint8Array` in `Map<chapterId, Uint8Array>`
- Create blob URL → set on preview `<audio>` element
- Update progress: `{ done: n, total: chapters.length }`

On chapter failure: retry once automatically, mark as `failed`, continue to next chapter.

### Phase 3 — ZIP Assembly & Download
1. Instantiate `JSZip` (already a project dependency)
2. Add each chapter buffer: `zip.file(\`${zeroPad(order)}-${slugify(title)}.mp3\`, buffer)`
3. `zip.generateAsync({ type: 'blob' })` → trigger anchor download

---

## Language Detection

- **Package:** `franc` (lightweight, no native deps, works in Node.js API routes)
- **Mapping:** ISO 639-3 → BCP47 locale via lookup table (top ~30 languages)
- **Fallback:** `franc` returns `'und'` → assign `en-US`
- **Voice fallback:** no voices found for locale → use `en-US-AriaNeural`

---

## Key Files

| File | Role |
|------|------|
| `src/app/api/voices/detect/route.ts` | Language detection + voice listing |
| `src/app/api/synthesize/chapter/route.ts` | Per-chapter TTS synthesis |
| `src/hooks/useSynthesis.ts` | Client orchestration hook |
| `src/components/VoicePicker.tsx` | Per-locale voice dropdown UI |
| `src/components/SynthesisPanel.tsx` | Progress UI + download button |
| `src/lib/parsers/types.ts` | `Chapter` type — no changes needed |
| `src/lib/parsers/normalizer.ts` | Paragraph splitting — no changes needed |

---

## Dependencies to Add

- `franc` — language detection
- `edge-tts-universal` — TTS synthesis (server-side only; browser usage blocked by WebSocket header restriction)

JSZip is already installed.

---

## Verification

1. Upload `test_files/rashomon.epub` → parse succeeds
2. Click "Generate Audio" → `/api/voices/detect` returns two locale groups (en-US, ja-JP) with multiple voices each
3. Two voice pickers appear → select one voice per language
4. Synthesis starts → chapters synthesize sequentially; preview players appear per chapter as they complete
5. Progress indicator updates correctly
6. "Download ZIP" → ZIP contains named MP3s, one per chapter (e.g. `01-rashomon.mp3`)
7. Open an MP3 — audio is correct for the chapter's language/voice
8. Simulate chapter failure → that chapter marked failed, rest continue unblocked
