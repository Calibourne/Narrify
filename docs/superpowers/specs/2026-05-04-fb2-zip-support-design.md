# FB2 ZIP Upload Support

**Date:** 2026-05-04

## Problem

Users can distribute FB2 books as `.fb2.zip` archives. The app currently only accepts `.fb2` and `.epub`, so these files are rejected.

## Goal

Accept `.fb2.zip` uploads and parse them the same as `.fb2` files.

## Design

### `Fb2Parser.parse()` — ZIP detection

`Fb2Parser.parse(buffer: Uint8Array)` checks whether the buffer starts with ZIP magic bytes (`0x50 0x4B 0x03 0x04`). If so:

1. Use the already-installed `jszip` to load the buffer.
2. Find the first entry whose name ends in `.fb2`.
3. Read that entry as `Uint8Array`.
4. Proceed with normal FB2 parsing on those bytes.

If the ZIP contains no `.fb2` entry, throw a descriptive error: `"No .fb2 file found inside the uploaded ZIP archive"`.

No new parser class is needed. One parser handles both `.fb2` and `.fb2.zip` transparently.

### `parsers/index.ts` — routing

Add a compound-extension check before the single-extension switch:

```ts
if (filename.endsWith('.fb2.zip')) return new Fb2Parser()
```

### `UploadZone.tsx` — accept + hint

- `accept=".epub,.fb2,.fb2.zip"`
- Hint text: `Drop .epub, .fb2, or .fb2.zip here`

## Constraints

- No new dependencies (jszip already installed).
- No server changes — all extraction happens client-side.
- Only `.fb2.zip` is supported; plain `.zip` is not.
- Multiple FB2s in one ZIP: first match wins (edge case, not a real-world concern).

## Error handling

| Situation | Behaviour |
|-----------|-----------|
| ZIP with no `.fb2` inside | Error: `"No .fb2 file found inside the uploaded ZIP archive"` |
| Corrupt ZIP | jszip throws; caught by existing `handleParse` try/catch in `page.tsx` |
| Corrupt FB2 inside ZIP | Existing FB2 parse error path handles it |

### Error display placement

Currently errors render below the Parse button in the left panel. They should instead render in the right panel (where chapter output appears), so the left panel stays clean and the error message has more room. The right panel shows either the empty state, the error, or the parsed chapters — never more than one at a time.

## Files changed

| File | Change |
|------|--------|
| `src/lib/parsers/fb2-parser.ts` | ZIP magic-byte detection + extraction |
| `src/lib/parsers/index.ts` | Route `.fb2.zip` → `Fb2Parser` |
| `src/components/UploadZone.tsx` | accept attribute + hint text |
| `src/app/page.tsx` | Move error display from left panel to right panel |
