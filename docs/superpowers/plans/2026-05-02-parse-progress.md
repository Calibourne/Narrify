# Parse Progress Streaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make chapter-by-chapter parse progress stream reliably from the server to the client while keeping the existing progress bar UI.

**Architecture:** Extend the parser progress callback to support async delivery so the API route can await each streamed progress event. Keep the existing SSE route and client reader, but make progress emission explicit and ordered so intermediate progress reaches the browser before the final `done` event.

**Tech Stack:** Next.js App Router route handlers, React client components, TypeScript, Vitest

---

### Task 1: Lock the expected streaming behavior in tests

**Files:**
- Modify: `test/api-parse.test.ts`
- Test: `test/api-parse.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('streams ordered progress events before the done event for EPUB', async () => {
  const buf = readFileSync(join(__dirname, 'fixtures/sample.epub'))
  const file = new File([buf], 'sample.epub', { type: 'application/epub+zip' })
  const res = await POST(makeRequest(file))
  const events = await collectSSEEvents(res)
  const progressEvents = events.filter((e) => e.type === 'progress')
  const doneEvent = events.find((e) => e.type === 'done')

  expect(progressEvents.length).toBeGreaterThan(0)
  expect(doneEvent).toBeDefined()
  expect(progressEvents[0]?.done).toBe(1)
  expect(progressEvents.at(-1)?.done).toBe(progressEvents.at(-1)?.total)
  expect(events.at(-1)?.type).toBe('done')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun vitest run test/api-parse.test.ts -t "streams ordered progress events before the done event for EPUB"`
Expected: FAIL if the stream does not preserve the intended progress contract.

- [ ] **Step 3: Extend the same expectation to FB2**

```ts
it('streams ordered progress events before the done event for FB2', async () => {
  const buf = readFileSync(join(__dirname, 'fixtures/sample.fb2'))
  const file = new File([buf], 'sample.fb2', { type: 'text/xml' })
  const res = await POST(makeRequest(file))
  const events = await collectSSEEvents(res)
  const progressEvents = events.filter((e) => e.type === 'progress')

  expect(progressEvents.length).toBeGreaterThan(0)
  expect(progressEvents[0]?.done).toBe(1)
  expect(progressEvents.at(-1)?.done).toBe(progressEvents.at(-1)?.total)
  expect(events.at(-1)?.type).toBe('done')
})
```

- [ ] **Step 4: Run test to verify the focused API suite status**

Run: `bun vitest run test/api-parse.test.ts`
Expected: At least the new assertions fail before implementation, or the suite stays green and confirms current behavior.

### Task 2: Make progress delivery async through the parser contract

**Files:**
- Modify: `src/lib/parsers/types.ts`
- Modify: `src/lib/parsers/epub-parser.ts`
- Modify: `src/lib/parsers/fb2-parser.ts`
- Test: `test/api-parse.test.ts`

- [ ] **Step 1: Update the progress callback type**

```ts
export type ProgressCallback = (done: number, total: number) => void | Promise<void>
```

- [ ] **Step 2: Await progress delivery in the EPUB parser**

```ts
      if (content) {
        const $ = cheerio.load(content)
        const title = $('h1,h2,h3').first().text().trim() || undefined
        const rawParagraphs = $('p')
          .map((_, el) => $(el).text())
          .get()
        const paragraphs = normalizeParagraphs(rawParagraphs)
        if (paragraphs.length > 0) {
          chapters.push({ id: `chapter-${order}`, title, paragraphs, order })
          order++
        }
      }
      await onProgress?.(done, total)
```

- [ ] **Step 3: Await progress delivery in the FB2 parser**

```ts
        if (paragraphs.length > 0) {
          chapters.push({ id: `chapter-${order}`, title, paragraphs, order })
          order++
        }
        await onProgress?.(done, total)
```

- [ ] **Step 4: Run the focused API test suite**

Run: `bun vitest run test/api-parse.test.ts`
Expected: PASS for ordered progress and done events.

### Task 3: Make the route handler await each streamed event

**Files:**
- Modify: `src/app/api/parse/route.ts`
- Test: `test/api-parse.test.ts`

- [ ] **Step 1: Wrap stream writes in an async helper**

```ts
    async start(controller) {
      const encoder = new TextEncoder()
      const pushEvent = async (data: unknown) => {
        controller.enqueue(encoder.encode(sseEvent(data)))
        await Promise.resolve()
      }
```

- [ ] **Step 2: Await `pushEvent` from the parser callback and final events**

```ts
        const chapters = await parser.parse(buffer, async (done, total) => {
          await pushEvent({ type: 'progress', done, total })
        })
        await pushEvent({ type: 'done', chapters })
```

- [ ] **Step 3: Keep the error path streamed through the same helper**

```ts
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Parse failed'
        await pushEvent({ type: 'error', message })
      }
```

- [ ] **Step 4: Run the focused tests again**

Run: `bun vitest run test/api-parse.test.ts`
Expected: PASS

### Task 4: Verify the client progress UI still matches the streamed contract

**Files:**
- Modify: `test/components/ProgressBar.test.tsx` only if label semantics change
- Test: `test/components/ProgressBar.test.tsx`

- [ ] **Step 1: Keep the current label contract unless implementation requires otherwise**

```ts
expect(screen.getByText('3 / 10 chapters')).toBeInTheDocument()
```

- [ ] **Step 2: Run the progress bar component tests**

Run: `bun vitest run test/components/ProgressBar.test.tsx`
Expected: PASS

- [ ] **Step 3: Run the combined verification for touched tests**

Run: `bun vitest run test/api-parse.test.ts test/components/ProgressBar.test.tsx`
Expected: PASS
