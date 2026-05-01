# Narrify Parser — Parsing Spec (EPUB + FB2 → Chapters)

This document defines the parsing layer for Narrify.

It replaces the previous Gradio-based implementation (`/home/eddie/Programming/epub2audio`) with a Vercel-compatible TypeScript module.

## 1. Scope

This module parses book files into structured chapters.

Supported formats:

* EPUB
* FB2

Output:

* Ordered chapters with clean paragraphs

This does NOT include:

* sentence segmentation
* chunking
* audio generation
* async pipelines

---

## 2. Output Schema

```ts
type Chapter = {
  id: string
  title?: string
  paragraphs: string[]
  order: number
}
```

### Requirements:

* Chapters must be in correct reading order
* Paragraphs must be plain text only
* No empty or malformed paragraphs
* Deterministic output

---

## 3. Parser Interface

```ts
interface BookParser {
  parse(file: Buffer): Promise<Chapter[]>
}
```

Implement:

* `EpubParser`
* `Fb2Parser`

---

## 4. File Detection

```ts
.epub → EpubParser
.fb2  → Fb2Parser
```

---

## 5. EPUB Parsing

EPUB is a ZIP archive containing HTML files.

### Steps:

1. Unzip file
2. Locate `.opf`
3. Read spine order
4. Load content files in order
5. Extract:

   * headings → optional chapter titles
   * `<p>` → paragraphs

### Rules:

* Ignore navigation/TOC files
* Strip all HTML tags
* Decode HTML entities
* Merge broken paragraphs
* Preserve spine order exactly

---

## 6. FB2 Parsing

FB2 is an XML format.

### Steps:

1. Parse XML
2. Traverse `<body>`
3. Each `<section>` = chapter candidate
4. Extract:

   * `<title>` → optional title
   * `<p>` → paragraphs

### Rules:

* Flatten nested sections if needed
* Ignore empty/non-text nodes
* Preserve order
* Extract only readable text

---

## 7. Text Normalization (Required)

Apply to all extracted text:

* Trim whitespace
* Collapse multiple spaces
* Normalize newlines
* Remove empty paragraphs
* Decode entities
* Remove invisible characters (e.g., nbsp)

Optional:

* Drop very short paragraphs (<20 chars) if clearly noise
* Merge obvious fragments

---

## 8. Chapter Handling

* Use structure when clear
* Do NOT over-segment
* If unclear → fallback to a single chapter

---

## 9. Output Guarantees

The parser must:

* Preserve reading order
* Avoid duplication
* Avoid missing content
* Return clean, readable text

---

## 10. Error Handling

* Handle malformed files gracefully
* Throw clear errors if parsing fails
* Do not silently drop large sections

---

## 11. Vercel Integration (Minimal)

Provide a simple API route:

```ts
POST /api/parse
```

### Behavior:

* Accept file upload (EPUB or FB2)
* Detect format
* Parse using appropriate parser
* Return JSON:

```ts
{
  chapters: Chapter[]
}
```

### Constraints:

* No long-running processing
* Keep parsing lightweight enough for serverless
* No storage or background jobs

---

## 12. Summary

Input:

* EPUB / FB2 file

Output:

* Clean, ordered chapters with paragraphs

This is a standalone parsing layer intended to feed future processing stages.
