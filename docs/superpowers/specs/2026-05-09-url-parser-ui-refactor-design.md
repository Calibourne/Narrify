# Design Spec: URL Parser UI Refactor

Refactor the URL parser workflow to utilize the main content area for interactive element selection and block checklists, while maintaining sidebar consistency.

## 1. Problem Statement
The current URL parser (picker and checklist) is confined to the narrow sidebar. This makes selecting elements in the iframe picker difficult due to horizontal squashing and renders the block checklist hard to read for long lists.

## 2. Proposed Changes

### 2.1 Component Restructuring
- **`UrlInput.tsx`**: Will be split into two parts:
    - **Sidebar Part**: Handles URL input, "Go" button, and task controls (Dub, Cancel, Switch mode) when in an active parsing state.
    - **Main Area Part**: The interactive `iframe` picker or the `checklist` UI.
- **`page.tsx`**: Needs to manage the "active parsing" state globally or pass state between the left and right panels.

### 2.2 UI States
- **Idle**: Standard sidebar with URL input. Main area is empty/placeholder.
- **Loading**: "Go" button shows spinner. URL input disabled.
- **Active (Picker/Checklist)**:
    - **Sidebar**: URL input and tabs are disabled. A "Task Controls" section appears below the input with "Dub Selected", "Cancel", and "Switch to [Checklist/Picker]" buttons.
    - **Main Area**: Displays the element picker iframe or the semantic block checklist in full width.

### 2.3 Data Flow
- `UrlInput` (sidebar) fetches HTML/Blocks and updates the "active parsing state".
- The main content area listens to this state and renders the `iframe` or `checklist`.
- Selection events in the main area (clicks in iframe, checkboxes in checklist) are communicated back to the sidebar component to update the "Dub" button's word count and enable/disable it.

## 3. Architecture & Interfaces

### State Management
We will introduce an `ActiveUrlParsing` state in `Home` (`page.tsx`) or within the `synthesis` hook if it fits there.

```typescript
type UrlParsingState = {
  active: boolean;
  mode: 'picker' | 'checklist' | 'paste';
  url: string;
  html?: string;
  blocks?: SemanticBlock[];
  selectedText?: string;
  selectedCount?: number;
}
```

### Component Communication
The `UrlInput` component will likely need to be refactored into a "Controller" and a "View" or shared via a context/state lifting approach to allow its interactive parts to appear in the `main` tag of `page.tsx`.

## 4. Testing Strategy
- **Unit Tests**: Update `UrlInput.test.tsx` to handle the new split UI.
- **Integration Tests**: Verify that clicking "Go" in the sidebar correctly renders the picker in the main area.
- **Visual Verification**: Use the visual companion or screenshots to ensure layout consistency across states.
