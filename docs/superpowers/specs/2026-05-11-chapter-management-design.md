# Spec: Chapter Management & Range Selection

Enable users to curate and edit their book content before synthesis.

## Goals
- Select specific chapters or ranges for synthesis (dubbing).
- Edit chapter titles and paragraph text.
- Split large chapters into smaller ones.
- Merge adjacent chapters.
- Delete unwanted chapters.

## 1. Data Model & State
A new `useBookState` hook will manage the interactive state of the book.

### State
- `chapters: Chapter[]`: The current list of chapters.
- `selectedIds: Set<string>`: IDs of chapters selected for synthesis.

### Operations
- `updateChapter(id, title?, paragraphs?)`: Update content.
- `deleteChapter(id)`: Remove from list.
- `splitChapter(id, paragraphIndex)`: Create a new chapter starting from the given paragraph index.
- `mergeWithNext(id)`: Append the next chapter's paragraphs to the current one and remove the next.
- `toggleSelection(id)`: Toggle individual selection.
- `selectRange(query: string)`: Parse a range query like `1-10, 15` to update selection.
- `selectAll() / deselectAll()`: Bulk selection.

## 2. UI Components

### ChapterList Enhancement
- **Header Toolbar**: 
    - Checkbox for "Select All".
    - Range Selection Input (e.g., `1-10`).
    - Stats: "X chapters selected (Y chars total)".

### ChapterItem Enhancement
- **Header Checkbox**: For individual selection.
- **Action Menu / Buttons**:
    - **Edit**: Toggle edit mode.
    - **Delete**: Trash icon.
    - **Merge**: "Merge with next" button.
- **Edit Mode**:
    - Title becomes an `input`.
    - Paragraphs become `textarea`s.
    - **Split**: "Split here" button between paragraphs.

## 3. Workflow Integration
1. **Upload/Parse**: Original chapters are loaded into `useBookState`.
2. **Curate**: User selects range, edits text, splits/merges chapters.
3. **Synthesize**: The `selectedChapters` are passed to `useSynthesis`.
    - *Note*: If the user changes selection *after* synthesis has started, the synthesis process should ideally only reflect the snapshot taken at the "Start" moment.

## 4. Implementation Plan
1. Create `src/hooks/useBookState.ts`.
2. Update `src/components/ChapterItem.tsx` with selection and editing UI.
3. Update `src/components/ChapterList.tsx` with bulk selection controls.
4. Integrate `useBookState` into `src/app/page.tsx`.
5. Update `useSynthesis` integration to use filtered chapters.
