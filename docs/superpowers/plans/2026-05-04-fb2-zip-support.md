# FB2 ZIP Upload Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Accept `.fb2.zip` uploads and parse them identically to `.fb2` files, with errors displayed in the right panel.

**Architecture:** `Fb2Parser.parse()` detects ZIP magic bytes and extracts the first `.fb2` entry before parsing; `selectParser` routes `.fb2.zip` → `Fb2Parser`; `UploadZone` accepts `.fb2.zip`; error display moves from left panel to right panel.

**Tech Stack:** jszip (already installed), vitest, React/Next.js

---

## File Map

| File | Change |
|------|--------|
| `src/lib/parsers/fb2-parser.ts` | ZIP magic-byte detection + extraction via jszip |
| `src/lib/parsers/index.ts` | Route `.fb2.zip` → `new Fb2Parser()` |
| `src/components/UploadZone.tsx` | `accept` attribute + hint text |
| `src/app/page.tsx` | Remove error from left panel, add to right panel |
| `test/fb2-parser.test.ts` | Tests for ZIP parsing and ZIP-with-no-fb2 error |
| `test/parsers.test.ts` | New: test `selectParser` routing for `.fb2.zip` |

---

### Task 1: Write failing tests for Fb2Parser ZIP support

**Files:**
- Modify: `test/fb2-parser.test.ts`

- [ ] **Step 1: Add ZIP helper and two failing tests to `test/fb2-parser.test.ts`**

At the top of the file, add this import alongside the existing ones:
```typescript
import JSZip from 'jszip'
```

After the existing imports and before the `describe` block, add the helper:
```typescript
async function makeFb2Zip(entryName = 'book.fb2'): Promise<Uint8Array> {
  const fb2Bytes = readFileSync(join(__dirname, 'fixtures/sample.fb2'))
  const zip = new JSZip()
  zip.file(entryName, fb2Bytes)
  return new Uint8Array(await zip.generateAsync({ type: 'arraybuffer' }))
}
```

Inside the `describe('Fb2Parser', ...)` block, append these two tests before the closing `}`:

```typescript
  it('parses chapters from a .fb2.zip buffer', async () => {
    const zipBuffer = await makeFb2Zip()
    const chapters = await new Fb2Parser().parse(zipBuffer)
    expect(chapters.length).toBeGreaterThan(0)
  })

  it('throws when ZIP contains no .fb2 entry', async () => {
    const zip = new JSZip()
    zip.file('readme.txt', 'hello')
    const buffer = new Uint8Array(await zip.generateAsync({ type: 'arraybuffer' }))
    await expect(new Fb2Parser().parse(buffer)).rejects.toThrow(
      'No .fb2 file found inside the uploaded ZIP archive'
    )
  })
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
npm test -- --reporter=verbose test/fb2-parser.test.ts
```

Expected: the two new tests FAIL. Existing tests continue to pass.

---

### Task 2: Implement ZIP detection in `Fb2Parser`

**Files:**
- Modify: `src/lib/parsers/fb2-parser.ts`

- [ ] **Step 1: Add `jszip` import at the top of `fb2-parser.ts`**

```typescript
import JSZip from 'jszip'
```

- [ ] **Step 2: Add `extractFb2FromZip` private method to `Fb2Parser`**

Add this method inside the `Fb2Parser` class, before `parse`:

```typescript
  private async extractFb2FromZip(buffer: Uint8Array): Promise<Uint8Array> {
    const zip = await JSZip.loadAsync(buffer)
    const entry = Object.values(zip.files).find(f => !f.dir && f.name.endsWith('.fb2'))
    if (!entry) throw new Error('No .fb2 file found inside the uploaded ZIP archive')
    return new Uint8Array(await entry.async('arraybuffer'))
  }
```

- [ ] **Step 3: Add ZIP detection at the start of `parse`**

Replace the beginning of `async parse(buffer: Uint8Array)`:

```typescript
  async parse(buffer: Uint8Array): Promise<Chapter[]> {
    if (buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
      buffer = await this.extractFb2FromZip(buffer)
    }
    const encoding = detectEncoding(buffer)
    // ... rest unchanged
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm test -- --reporter=verbose test/fb2-parser.test.ts
```

Expected: all tests PASS, including the two new ZIP tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/parsers/fb2-parser.ts test/fb2-parser.test.ts
git commit -m "feat: add ZIP detection to Fb2Parser"
```

---

### Task 3: Route `.fb2.zip` in `selectParser`

**Files:**
- Create: `test/parsers.test.ts`
- Modify: `src/lib/parsers/index.ts`

- [ ] **Step 1: Write a failing routing test**

Create `test/parsers.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run to confirm the `.fb2.zip` routing test fails**

```bash
npm test -- --reporter=verbose test/parsers.test.ts
```

Expected: `.fb2.zip` routing test FAILS. Other two PASS.

- [ ] **Step 3: Update `selectParser` in `src/lib/parsers/index.ts`**

```typescript
export function selectParser(filename: string): BookParser {
  if (filename.endsWith('.fb2.zip')) return new Fb2Parser()
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'epub') return new EpubParser()
  if (ext === 'fb2') return new Fb2Parser()
  throw new Error(`Unsupported format: .${ext}`)
}
```

- [ ] **Step 4: Run the routing tests to confirm they pass**

```bash
npm test -- --reporter=verbose test/parsers.test.ts
```

Expected: all three routing tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/parsers/index.ts test/parsers.test.ts
git commit -m "feat: route .fb2.zip to Fb2Parser in selectParser"
```

---

### Task 4: Update `UploadZone` to accept `.fb2.zip`

**Files:**
- Modify: `src/components/UploadZone.tsx`

- [ ] **Step 1: Update `accept` and hint text**

In `UploadZone.tsx`, make two changes:

Change the `<span>` hint:
```tsx
<span>Drop .epub, .fb2, or .fb2.zip here</span>
```

Change the `<input>` accept attribute:
```tsx
accept=".epub,.fb2,.fb2.zip"
```

- [ ] **Step 2: Run full test suite to confirm nothing broke**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/UploadZone.tsx
git commit -m "feat: accept .fb2.zip in UploadZone"
```

---

### Task 5: Move error display to the right panel

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Remove error from the left panel**

Delete this line from the left `<aside>`:

```tsx
{errorMsg && <p className={styles.error}>{errorMsg}</p>}
```

- [ ] **Step 2: Add error to the right panel**

In the `<main className={styles.right}>` block, replace:

```tsx
{status !== 'success' && (
  <p className={styles.empty}>Upload a book to get started.</p>
)}
```

with:

```tsx
{status !== 'success' && status !== 'error' && (
  <p className={styles.empty}>Upload a book to get started.</p>
)}
{status === 'error' && errorMsg && (
  <p className={styles.error}>{errorMsg}</p>
)}
```

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all tests PASS. If any page tests assert on error message location, update them to query within the right panel (`main`) rather than the `aside`.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "ux: move error display to right panel"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run full test suite one last time**

```bash
npm test
```

Expected: all tests PASS, zero failures.

- [ ] **Step 2: Start dev server and manually test**

```bash
npm run dev
```

Open `http://localhost:3000` and verify:
- Dropping a `.fb2.zip` file parses successfully and shows chapters
- Dropping a `.zip` with no `.fb2` inside shows "No .fb2 file found inside the uploaded ZIP archive" in the **right panel**
- Dropping a plain `.fb2` still works
- Dropping an `.epub` still works
- The left panel no longer shows errors
