# FB2 Responsiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make FB2 parsing feel and behave more responsive by emitting staged progress early and using a faster coarse-to-refined parsing flow, while keeping the final `Chapter[]` API unchanged.

**Architecture:** Extend parser progress events from a bare `(done, total)` callback into structured staged events. Rework the FB2 parser so it discovers structure quickly, emits an initial stage-aware progress event, builds chapter candidates in a cheap pass, and refines them inline; then update the client progress bar to render those stages in a second commit.

**Tech Stack:** Next.js App Router route handlers, React client components, TypeScript, Vitest, fast-xml-parser

---

### Task 1: Lock the new staged progress contract in tests

**Files:**
- Modify: `test/fb2-parser.test.ts`
- Modify: `test/api-parse.test.ts`
- Test: `test/fb2-parser.test.ts`
- Test: `test/api-parse.test.ts`

- [ ] **Step 1: Write the failing FB2 parser progress test**

```ts
it('emits staged progress events starting with discovery for structured FB2 files', async () => {
  const buffer = readFileSync(fixturePath)
  const calls: Array<{ done: number; total: number; stage?: string; label?: string }> = []

  await new Fb2Parser().parse(buffer, (event) => {
    calls.push(event)
  })

  expect(calls[0]?.stage).toBe('discovering')
  expect(calls[0]?.done).toBe(0)
  expect(calls[1]?.stage).toBe('extracting')
  expect(calls[1]?.done).toBe(0)
  expect(calls.at(-1)?.done).toBe(calls.at(-1)?.total)
})
```

- [ ] **Step 2: Run the focused parser test to verify it fails**

Run: `bun vitest run test/fb2-parser.test.ts -t "emits staged progress events starting with discovery for structured FB2 files"`
Expected: FAIL because the current callback only emits numeric progress and has no discovery stage.

- [ ] **Step 3: Write the failing API SSE shape assertion**

```ts
expect(progressEvents[0]?.stage).toBe('discovering')
expect(progressEvents[1]?.stage).toBe('extracting')
expect(progressEvents[1]?.done).toBe(0)
```

- [ ] **Step 4: Run the focused API test to verify it fails**

Run: `bun vitest run test/api-parse.test.ts -t "streams SSE with progress and done events for FB2"`
Expected: FAIL because the route currently forwards only `done` and `total`.

### Task 2: Implement the staged progress event contract

**Files:**
- Modify: `src/lib/parsers/types.ts`
- Modify: `src/app/api/parse/route.ts`
- Test: `test/api-parse.test.ts`

- [ ] **Step 1: Expand parser progress types**

```ts
export type ParseStage = 'discovering' | 'extracting' | 'refining'

export type ProgressEvent = {
  done: number
  total: number
  stage?: ParseStage
  label?: string
}

export type ProgressCallback = (event: ProgressEvent) => void | Promise<void>
```

- [ ] **Step 2: Update the route handler to forward structured progress events**

```ts
        const chapters = await parser.parse(buffer, async (event) => {
          await pushEvent({ type: 'progress', ...event })
        })
```

- [ ] **Step 3: Run the API test to confirm the route accepts the new shape**

Run: `bun vitest run test/api-parse.test.ts -t "streams SSE with progress and done events for FB2"`
Expected: still FAIL until the FB2 parser emits the new stages.

### Task 3: Rework the FB2 parser into discovery + coarse extraction + inline refinement

**Files:**
- Modify: `src/lib/parsers/fb2-parser.ts`
- Test: `test/fb2-parser.test.ts`
- Test: `test/api-parse.test.ts`

- [ ] **Step 1: Add fast helpers for top-level section analysis and fallback chunking**

```ts
function collectTopLevelParagraphs(section: Record<string, unknown>): string[] {
  return toArray(section['p'] as unknown).map(extractText)
}

function chunkParagraphs(paragraphs: string[], chunkSize: number): string[][] {
  const chunks: string[][] = []
  for (let i = 0; i < paragraphs.length; i += chunkSize) {
    chunks.push(paragraphs.slice(i, i + chunkSize))
  }
  return chunks
}
```

- [ ] **Step 2: Emit discovery and extraction stage events before expensive work**

```ts
      await onProgress?.({
        done: 0,
        total,
        stage: 'discovering',
        label: 'Scanning book structure…',
      })

      await onProgress?.({
        done: 0,
        total,
        stage: 'extracting',
        label: 'Building chapter candidates…',
      })
```

- [ ] **Step 3: Build structured chapter candidates cheaply from top-level sections**

```ts
      for (const section of sections) {
        const sec = section as Record<string, unknown>
        const title = extractSectionTitle(sec)
        const rawParagraphs = collectParagraphs(sec)
        const paragraphs = normalizeParagraphs(rawParagraphs)
        done += 1
        if (paragraphs.length > 0) {
          chapters.push({ id: `chapter-${order}`, title, paragraphs, order })
          order += 1
        }
        await onProgress?.({
          done,
          total,
          stage: 'extracting',
          label: 'Building chapter candidates…',
        })
      }
```

- [ ] **Step 4: Add a faster fallback mode for weakly structured FB2 files**

```ts
    } else {
      const rawParagraphs = normalizeParagraphs(collectParagraphs(mainBody as Record<string, unknown>))
      const chunks = chunkParagraphs(rawParagraphs, 24)
      const total = chunks.length || 1

      await onProgress?.({
        done: 0,
        total,
        stage: 'discovering',
        label: 'Scanning book structure…',
      })
      await onProgress?.({
        done: 0,
        total,
        stage: 'extracting',
        label: 'Building chapter candidates…',
      })

      for (const chunk of chunks) {
        if (chunk.length > 0) {
          chapters.push({ id: `chapter-${order}`, paragraphs: chunk, order })
          order += 1
        }
        done += 1
        await onProgress?.({
          done,
          total,
          stage: 'extracting',
          label: 'Building chapter candidates…',
        })
      }
    }
```

- [ ] **Step 5: Run parser and API suites to confirm backend behavior**

Run: `bun vitest run test/fb2-parser.test.ts test/api-parse.test.ts`
Expected: PASS

- [ ] **Step 6: Commit the backend work**

```bash
git add src/lib/parsers/types.ts src/lib/parsers/fb2-parser.ts src/app/api/parse/route.ts test/fb2-parser.test.ts test/api-parse.test.ts
git commit -m "feat: add staged FB2 parse progress"
```

### Task 4: Teach the page and progress bar to render parser stages

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/ProgressBar.tsx`
- Modify: `src/components/ProgressBar.module.css`
- Modify: `test/page.test.tsx`
- Modify: `test/components/ProgressBar.test.tsx`
- Test: `test/page.test.tsx`
- Test: `test/components/ProgressBar.test.tsx`

- [ ] **Step 1: Write the failing stage-aware progress bar test**

```ts
test('shows stage label when provided', () => {
  render(<ProgressBar done={0} total={12} stage="discovering" label="Scanning book structure…" />)
  expect(screen.getByText('Scanning book structure…')).toBeInTheDocument()
  expect(screen.getByText('0 / 12 chapters')).toBeInTheDocument()
})
```

- [ ] **Step 2: Write the failing page SSE event handling test**

```ts
test('updates progress label from staged SSE events', async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode(
          'data: {"type":"progress","done":0,"total":12,"stage":"discovering","label":"Scanning book structure…"}\\n\\n'
        )
      )
    },
  })
```

- [ ] **Step 3: Run the focused UI tests to verify they fail**

Run: `bun vitest run test/components/ProgressBar.test.tsx test/page.test.tsx`
Expected: FAIL because the UI does not yet understand `stage` or `label`.

- [ ] **Step 4: Extend client-side progress state**

```ts
type ProgressState = {
  done: number
  total: number
  stage?: 'discovering' | 'extracting' | 'refining'
  label?: string
}
```

- [ ] **Step 5: Forward stage metadata from SSE events into page state**

```ts
          if (event.type === 'progress') {
            setProgress({
              done: event.done,
              total: event.total,
              stage: event.stage,
              label: event.label,
            })
          }
```

- [ ] **Step 6: Teach `ProgressBar` to show both stage labels and count progress**

```ts
type Props = {
  done: number
  total: number
  stage?: 'discovering' | 'extracting' | 'refining'
  label?: string
}
```

```ts
      <span className={styles.label}>{label ?? fallbackLabel}</span>
      {total > 0 && <span className={styles.meta}>{done} / {total} chapters</span>}
```

- [ ] **Step 7: Run the touched UI and backend tests together**

Run: `bun vitest run test/components/ProgressBar.test.tsx test/page.test.tsx test/api-parse.test.ts test/fb2-parser.test.ts test/epub-parser.test.ts`
Expected: PASS

- [ ] **Step 8: Commit the UI work**

```bash
git add src/app/page.tsx src/components/ProgressBar.tsx src/components/ProgressBar.module.css test/page.test.tsx test/components/ProgressBar.test.tsx
git commit -m "feat: show staged parse progress"
```
