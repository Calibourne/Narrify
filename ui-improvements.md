# UI Audit & Improvement Suggestions

This document outlines suggested improvements for the Narrify UI, focusing on moving away from "AI-default" aesthetics (Codex UI) toward a more human-designed, functional, and polished interface inspired by platforms like Linear and GitHub.

## 1. Typography & Hierarchy

### Issues
- **Eyebrow Labels**: The sidebar uses small, uppercase, letter-spaced labels (e.g., "BOOK"). This is a common template pattern that can feel overly decorative.
- **Font Stack**: Current fallback is basic Arial/Helvetica.
- **Logo Branding**: The dynamic hue logo is a nice touch but the "Narrify" text and "buildName" hierarchy could be refined.

### Suggestions
- **Refine Labels**: Replace uppercase eyebrow labels with standard sentence-case or title-case headers (`h3` or `h4`) with proper weight (e.g., Medium/600).
- **System Sans Stack**: Update the font stack to a more modern system sans-serif:
  ```css
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  ```
- **Logo Alignment**: Ensure the "Narrify" logo and the commit hash/build name have a clearer relationship. Perhaps move the build name to a more "meta" location like the footer or a dedicated "About" area if it's not core to the user.

## 2. Layout & Composition

### Issues
- **Sidebar Width**: At 280px, the sidebar feels slightly oversized and falls into common template defaults.
- **Empty States**: The "Upload a book to get started" message is a bit sparse.
- **Mobile Transition**: The layout simply stacks on small screens.

### Suggestions
- **Optimize Sidebar**: Reduce sidebar width to 260px and focus it strictly on **Configuration & Status** (Upload, Voice Selection, Global Progress).
- **Relocate Audio Results**: Move the per-chapter audio players out of the sidebar and into the `ChapterItem` headers in the main content area. This gives the audio controls the full width of the main panel.
- **Polished Empty States**: Use subtle iconography or a more structured "Getting Started" guide instead of just a centered text string.
- **Mobile Experience**: Consider a bottom-docked action bar or a more refined collapsible menu for mobile users instead of just stacking the 280px panel.

## 3. Component Aesthetics (Uncodixify)

### Issues
- **Button Colors**: The "Generate Audio" button uses a bright blue (`#0070f3`) that feels like a default template color.
- **Progress Bar**: The standard HTML progress bar looks a bit disconnected from the rest of the UI.
- **File Row**: The file display row is functional but could be more visually integrated.

### Suggestions
- **Harmonize Palette**: Use the "Narrify" build-hue or the project's `--foreground` color for primary actions instead of default blue. This creates a more cohesive brand experience.
- **Custom Progress UI**: Replace the `<progress>` element with a custom div-based progress bar for better styling control (e.g., thinner, more subtle background, non-pill corners).
- **Refine File Rows**: Use a more "GitHub-like" file row style: subtle border, light background on hover, and better spacing for the clear button.
- **Pill/Radius Discipline**: Maintain the current 6px-8px radius. Avoid the temptation to go "pill-shaped" for buttons or inputs.

## 4. Secondary Components ✓ Implemented

### ~~Issues~~
- ~~**Theme Toggle**: Uses standard text emojis (☀/🌙) which can look inconsistent across platforms.~~
- ~~**Stats Badge**: Very simple text string, lacks visual weight or "badge-like" qualities.~~

### Done
- **Icon-based Toggle**: `ThemeToggle.tsx` now uses inline SVG sun/moon icons (16×16, Lucide-style stroke icons). No new dependencies.
- **Structured Badges**: `StatsBadge.tsx` replaced the single `<p>` with two bordered pill items — bold number + muted label — using `--surface`, `--border`, and `--foreground` tokens.

## 5. Synthesis Panel & UX ✓ Implemented (partial)

### ~~Issues~~
- ~~**Redundant Lists**: The `SynthesisPanel` renders a second list of chapters in the sidebar just to show audio players, while the main content area already has a `ChapterList`.~~

### Done
- **Unified Chapter View**: `ChapterItem` now receives `audioStatus` and `blobUrl` props. Synthesis status is shown directly in the chapter header.
- **Status Indicators**: Pulsing dot (accent color, `@keyframes pulse`) for `synthesizing`; solid dot for `done`; red dot for `failed`. Defined in `globals.css` and applied via `ChapterItem.module.css`.
- **Inline Play Button**: Circular 28px button (accent-colored) appears in the chapter header when `audioStatus === 'done'`. Uses imperative `new Audio(blobUrl)` — no DOM `<audio>` element.
- **Bottom Progress Rail**: 2px absolute bar along the header bottom edge, driven by `timeupdate` events during playback.
- **Sidebar as "Control Deck"**: `SynthesisPanel` no longer renders a duplicate chapter list. It shows voice selection, progress bar, elapsed/ETA, and Download ZIP only. `useSynthesis` lifted to `page.tsx` and passed down as a `synthesis` prop.

### Not implemented (deferred)
- **Hover Controls** (per-chapter download, playback speed): Out of scope for this pass.
- **Phase Transitions** (smooth fades between idle/selecting/synthesizing): Not yet done.

## 6. Color Palette Refinement

### Suggestions
- **Dark Mode**: The current GitHub-inspired dark mode is excellent. Stick to it.
- **Light Mode**: Consider a slightly "warmer" light mode (Ivory or Porcelain) to reduce eye strain, especially since users might be reading chapter titles for extended periods.
- **Borders**: Ensure borders are subtle (`1px solid var(--border)`). Avoid "heavy" borders or dramatic shadows.
