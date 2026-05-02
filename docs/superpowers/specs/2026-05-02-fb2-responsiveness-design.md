# Narrify FB2 Responsiveness — Design Spec

**Date:** 2026-05-02  
**Status:** Approved

---

## Context

`narrify` currently parses FB2 files with a strict section-first flow in [`src/lib/parsers/fb2-parser.ts`](/home/eddie/Programming/narrify/src/lib/parsers/fb2-parser.ts:1). That preserves structure reasonably well, but it delays useful progress updates and can feel much slower than the parser in `../epub2audio`, especially on larger books.

The goal is to improve both:

- **Perceived responsiveness**: the UI should leave the generic "preparing" state quickly and communicate meaningful progress stages.
- **Actual responsiveness**: FB2 parsing should start producing chapter candidates earlier and avoid spending nearly all time in an opaque setup phase.

The user is willing to trade a small amount of chapter-boundary precision for much better responsiveness, but not to the point where chapter structure becomes unreliable.

---

## Goals

1. Make FB2 parsing transition out of the "Preparing book…" state quickly.
2. Emit progress that reflects staged parser work, not just completed final chapters.
3. Speed up large/messy FB2 books by introducing a text-first coarse pass before strict normalization.
4. Keep final output shape compatible with the existing `Chapter[]` contract.
5. Split implementation into **two commits**:
   - Commit 1: parser/backend responsiveness work
   - Commit 2: progress-bar and client UX updates

---

## Non-Goals

- Replacing the EPUB parser in this change
- Rewriting the entire parsing system around background jobs
- Perfect chapter-boundary recovery for malformed FB2 files
- Streaming partial chapter content into the right panel before parse completion

---

## Recommended Approach

Use a **hybrid progressive FB2 parser** with three stages:

1. **Discovery**: quickly inspect the FB2 body and top-level sections to determine whether the file has usable section structure and to establish an early total.
2. **Coarse extraction**: build fast chapter candidates from section text or flattened text chunks so progress can move steadily even before final normalization is complete.
3. **Refinement**: normalize paragraphs, extract better titles, and finalize `Chapter[]`.

This keeps the strict parser behavior as the final authority where possible, but avoids spending most of the wall-clock time in a pre-progress phase.

---

## Parser Architecture

### Existing Problem

The current FB2 parser:

- decodes the whole file
- parses the XML tree
- recursively walks sections and nested subsections
- normalizes each section only when it is ready to become a final chapter

That means the UI gets little information until meaningful work is already complete.

### New FB2 Pipeline

The new parser should split work into explicit units:

#### Stage 1: Discovery

Responsibilities:

- decode the file
- parse the XML root
- locate the primary body
- enumerate top-level sections
- choose a parse mode:
  - **structured mode** when top-level sections look usable
  - **fallback text mode** when structure is weak or absent

Outputs:

- parse mode
- estimated total units of work
- immediate initial progress event

Progress behavior:

- emit `0 / total` as soon as total work is known
- UI can leave generic pending state immediately

#### Stage 2: Coarse Extraction

Responsibilities:

- in structured mode: convert each top-level section into a chapter candidate cheaply
- in fallback text mode: flatten paragraphs earlier and split by chapter markers or large section boundaries
- avoid expensive per-candidate cleanup here

Outputs:

- chapter candidates with rough title/text data

Progress behavior:

- advance steadily per candidate produced
- this is the main source of real-time responsiveness

#### Stage 3: Refinement

Responsibilities:

- normalize paragraph arrays
- improve extracted titles
- discard empty/invalid candidates
- finalize ordering and IDs

Outputs:

- final `Chapter[]`

Progress behavior:

- do not introduce a second opaque wait after the coarse pass
- either:
  - keep refinement lightweight enough to fit within each candidate step, or
  - expose a distinct stage in progress metadata so the bar does not appear stalled

Recommendation:

- fold most refinement into each candidate step rather than treating it as a large hidden final pass

---

## Progress Model

The current progress contract only supports:

```ts
(done: number, total: number) => void | Promise<void>
```

That is enough for basic chapter counts, but not for staged progress messaging. The FB2 responsiveness work should extend the progress contract to include optional stage metadata.

### Recommended Event Shape

```ts
type ParseStage = 'discovering' | 'extracting' | 'refining'

type ProgressEvent = {
  done: number
  total: number
  stage?: ParseStage
  label?: string
}
```

The parser callback can become:

```ts
type ProgressCallback = (event: ProgressEvent) => void | Promise<void>
```

### Stage Semantics

- `discovering`
  - short-lived
  - label example: `Scanning book structure…`
- `extracting`
  - primary steady-progress stage
  - label example: `Building chapter candidates…`
- `refining`
  - optional if needed
  - label example: `Cleaning up chapter boundaries…`

If refinement remains cheap, the UI can stay in `extracting` and simply continue count-based progress.

---

## Progress Bar UX

The progress bar should reflect stage transitions rather than staying on one generic pending label.

### Desired Behavior

1. On parse start:
   - show a pending state immediately
   - label: `Scanning book structure…`
2. As soon as totals are known:
   - switch to count-aware progress
   - example: `0 / 24 chapters`
3. During coarse extraction:
   - advance steadily with each chapter candidate
4. During optional refinement:
   - either continue count progress or show a short explicit cleanup label
5. On success:
   - briefly show complete state or transition directly into results if completion is visually obvious
6. On error:
   - clear progress state and show the real error message

### UI Constraint

The right panel should still wait for final parsed chapters before rendering the chapter list. This change is about progress responsiveness, not partial chapter rendering.

---

## Data Flow

### Backend

```text
POST /api/parse
  -> select parser
  -> FB2 parser enters discovery stage
  -> emit progress(stage='discovering', done=0, total=estimated or known)
  -> emit progress(stage='extracting', done=0, total=N)
  -> emit progress(stage='extracting', done=1, total=N)
  -> ...
  -> emit done(chapters)
```

### Frontend

```text
User clicks Parse Book
  -> page.tsx sets status='uploading'
  -> seed pending progress state
  -> fetch /api/parse
  -> read SSE events
  -> update progress bar label + counts from stage metadata
  -> on done: render final chapters
```

---

## File-Level Design

### Commit 1: Parser / Backend

Primary files:

- [`src/lib/parsers/types.ts`](/home/eddie/Programming/narrify/src/lib/parsers/types.ts:1)
- [`src/lib/parsers/fb2-parser.ts`](/home/eddie/Programming/narrify/src/lib/parsers/fb2-parser.ts:1)
- [`src/app/api/parse/route.ts`](/home/eddie/Programming/narrify/src/app/api/parse/route.ts:1)
- related tests in `test/fb2-parser.test.ts` and `test/api-parse.test.ts`

Responsibilities:

- evolve the progress callback to carry stage metadata
- implement staged FB2 parsing
- preserve existing final response shape
- keep EPUB behavior working with the new callback contract

### Commit 2: UI / Progress Bar

Primary files:

- [`src/app/page.tsx`](/home/eddie/Programming/narrify/src/app/page.tsx:1)
- [`src/components/ProgressBar.tsx`](/home/eddie/Programming/narrify/src/components/ProgressBar.tsx:1)
- [`src/components/ProgressBar.module.css`](/home/eddie/Programming/narrify/src/components/ProgressBar.module.css:1)
- related tests in `test/page.test.tsx` and `test/components/ProgressBar.test.tsx`

Responsibilities:

- represent parser stages in the UI
- switch out of the generic preparing state earlier
- preserve current error behavior improvements

---

## Error Handling

- malformed FB2: still return an explicit parse error
- no body / no usable content: explicit parse error
- weak structure: fall back to text-first mode rather than failing immediately
- progress stage metadata is best-effort only and must never be required for successful parsing

---

## Testing Strategy

### Backend Tests

- FB2 parser emits an initial discovery/extraction progress event before first completed chapter
- FB2 parser continues to emit monotonically increasing progress to completion
- fallback text mode still produces chapters for weakly structured FB2 fixtures
- API SSE stream preserves new progress event shape and ordering
- EPUB path remains compatible with the revised callback contract

### Frontend Tests

- page shows stage-aware pending text immediately on parse start
- page updates from stage label to count-aware label when totals arrive
- progress bar renders stage label correctly
- error handling still surfaces server error text instead of generic fallback when available

---

## Tradeoffs

### Benefits

- much better perceived responsiveness for FB2
- earlier totals and smoother progress movement
- improved real parse throughput for files where strict section-first parsing is too costly up front

### Costs

- more parser complexity
- slightly looser chapter boundary fidelity in fallback mode
- larger progress contract that both backend and frontend must understand

---

## Open Design Choice

For Stage 3 refinement, the preferred approach is to keep refinement mostly inline with each candidate step. That avoids a second long stall near the end of parsing and keeps the progress bar honest.

If later profiling shows refinement is still expensive, it can be promoted to an explicit progress stage without changing the overall architecture.

---

## Summary

Implement a hybrid progressive FB2 parser that discovers structure early, builds chapter candidates quickly, and refines them incrementally. Update the progress contract and progress bar so users see meaningful staged progress instead of a long generic preparation state. Ship the work in two commits: backend/parser first, then UI/progress representation.
