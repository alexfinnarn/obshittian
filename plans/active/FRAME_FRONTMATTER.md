# Frame Frontmatter

Embed a single web frame in a Markdown note via two frontmatter keys (`frame_url`, optional
`frame_title`).

## Goals

1. Let a Markdown note display one embedded web frame alongside its rendered content.
2. Avoid introducing a new file type, parser, or tab model — reuse the existing Markdown pipeline.
3. Validate frame URLs so notes can't become an unsafe iframe launcher.
4. Provide a clear external-open fallback for sites that block embedding.
5. Keep the existing Markdown editor behavior unchanged; frame attachment is YAML-only for v1.

## Phases

| Phase | Description                                                 | Status  |
|-------|-------------------------------------------------------------|---------|
| 01    | URL validator, MarkdownPreview integration, tests, and docs | Pending |

## Background

An earlier plan (`BLOCK_DOCUMENTS.md`, now archived) proposed a new block-based file type with
multiple Markdown and frame blocks per document. Review surfaced two simplifications:

1. The dual-pane editor uses an explicit save flow, so a structured-document format can avoid
   string-equality dirty checks by holding parsed state in the editor. That removes one of the main
   reasons to introduce a new tab kind.
2. There is no real use case for two frames in one note — the editor pane already takes screen
   space, and splitting the remainder between two iframes is unusable. Project notes that need
   multiple resources are better expressed as multiple notes that link to each other.

Once "one frame per note" is the constraint, multiple-block infrastructure stops paying for itself.
A note's frame becomes metadata, not content, and frontmatter is the natural home. The existing
frontmatter parser ([src/lib/utils/frontmatter.ts](../../src/lib/utils/frontmatter.ts)) already
handles `string | string[]` values, which fits two flat keys without a parser change.

Example:

```markdown
---
tags: [reference, project-x]
frame_url: https://docs.google.com/document/d/.../edit
frame_title: Q2 planning doc
---

# Notes

Context for this resource.
```

## Deliverables

- A URL validator utility that accepts `https:` and rejects unsafe schemes (`javascript:`, `data:`,
  `file:`, etc.).
- MarkdownPreview rendering of an iframe + external-open link when `frame_url` is present and valid.
- A visible warning state when `frame_url` is present but invalid (do not silently drop user
  content).
- A CSS variable controlling default frame height.
- Unit and component tests covering the validator and MarkdownPreview behavior.
- Documentation describing the feature, supported keys, iframe limitations, and the external-open
  fallback.

## Risks and Edge Cases

- Target sites may block embedding via `X-Frame-Options` or CSP `frame-ancestors`. The external-open
  link is the documented fallback.
- Authenticated embedded apps generally need cookies and same-origin context; a strict iframe
  `sandbox` would break them. v1 omits `sandbox` deliberately and documents the tradeoff.
- An invalid `frame_url` must produce a visible warning, not a silent omission, so users can fix
  typos.
- `frame_title` should be optional and fall back to the URL hostname; auto-only would produce poor
  labels for opaque URLs (e.g. Google Doc IDs).
- Frontmatter remains visible in the existing collapsible "Frontmatter" details block. No edit
  affordance is added in v1 — users add a frame by typing the keys in CodeMirror.

## Future Work (Out of Scope)

- A modal or button that writes `frame_url` via `updateFrontmatterKey` (only add if YAML editing
  proves annoying in practice).
- Multiple frames per note.
- Per-note frame height override.
- Iframe `sandbox` policy with per-site overrides.
- Site-specific integrations (Google Drive, Figma APIs).
- Proxying or bypassing third-party frame restrictions.
