# Phase 01: Validator, Rendering, Tests, and Docs

**Status:** Pending
**Output:** `src/lib/utils/`, `src/lib/components/MarkdownPreview.svelte`, `src/app.css`, `docs/`

## Objective

Add `frame_url` / `frame_title` frontmatter support to Markdown notes, rendered as a single embedded iframe with an external-open fallback.

## Tasks

- [ ] Add a `validateFrameUrl` utility in `src/lib/utils/` that accepts `https:` URLs and rejects `javascript:`, `data:`, `file:`, and other non-http(s) schemes. Return a discriminated result (`{ ok: true, url } | { ok: false, reason }`) so callers can render a useful warning.
- [ ] Decide whether to also accept `http:` (likely yes for local-dev embeds, with a documented note) or restrict to `https:` only.
- [ ] In `MarkdownPreview.svelte`, read `frame_url` and `frame_title` from `parseFrontmatter` after Markdown rendering.
- [ ] When `frame_url` is present and valid, render an `<iframe>` block with `src`, `title` (from `frame_title` or the URL hostname), `referrerpolicy="no-referrer"`, and an "Open in new tab ↗" link beneath it.
- [ ] When `frame_url` is present but invalid, render a visible warning showing the offending value and the validator's reason.
- [ ] Decide frame placement: above the rendered Markdown body or below it. Default recommendation: below, so the note's title and intro stay at the top.
- [ ] Add a `--frame-height` CSS variable in `src/app.css` (default `600px`) and use it for the iframe.
- [ ] Do not set an iframe `sandbox` attribute in v1. Document this choice in the iframe's nearby code comment and in user docs.
- [ ] Unit tests for `validateFrameUrl` covering: valid `https:`, valid `http:` (per the decision above), `javascript:`, `data:`, `file:`, malformed strings, empty string, missing scheme.
- [ ] Component tests for `MarkdownPreview`: no frame keys → no iframe; valid `frame_url` → iframe + external-open link with correct attributes; invalid `frame_url` → warning state, no iframe; `frame_title` missing → falls back to hostname.
- [ ] Update `README.md` (or `docs/architecture/`) with: how to add a frame, supported keys, the external-open fallback, and known limitations (`X-Frame-Options`, CSP, cookie/auth behavior).
- [ ] Manually verify one embeddable HTTPS URL in the dev server before marking complete.

## Content Outline

The validator should be small and pure:

```typescript
export type FrameUrlValidation =
  | { ok: true; url: string }
  | { ok: false; reason: string };

export function validateFrameUrl(raw: string | undefined | null): FrameUrlValidation;
```

`MarkdownPreview` already calls into `renderMarkdown` and exposes a frontmatter-details block. The new rendering goes alongside `bodyHtml` (not inside it), using a separate Svelte block that reads the parsed frontmatter values. Keep the iframe markup minimal — `src`, `title`, `referrerpolicy`, and `loading="lazy"`.

The external-open link should be present for both valid and invalid frame URLs (for invalid URLs, it's part of the warning), so users always have a way to reach the resource even if the embed fails or the URL needs fixing.

Documentation should be direct about limitations:

- The app can render an iframe, but the target site decides whether it can be embedded.
- Google Drive and Google Docs authentication inside iframes is not guaranteed.
- Use the external-open link for sites that block embedding or login.
- This feature is for contextual workspaces, not for bypassing site embedding restrictions.

## Dependencies

- Existing `parseFrontmatter` in [src/lib/utils/frontmatter.ts](../../src/lib/utils/frontmatter.ts).
- Existing `renderMarkdown` in [src/lib/utils/markdown.ts](../../src/lib/utils/markdown.ts).
- Existing `MarkdownPreview.svelte` styling tokens in `src/app.css`.

## Acceptance Criteria

- [ ] `npm run check` passes.
- [ ] `validateFrameUrl` unit tests pass and cover unsafe schemes.
- [ ] `MarkdownPreview` component tests pass for present/absent/invalid frame keys.
- [ ] Manually opening a Markdown note with a known-embeddable HTTPS `frame_url` shows the iframe and the external-open link.
- [ ] Manually opening a note with an invalid `frame_url` (e.g. `javascript:alert(1)`) shows a warning and does not render an iframe.
- [ ] Documentation explains the two keys, the default height, and the iframe limitations without overpromising.
