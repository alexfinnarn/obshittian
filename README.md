# Markdown Editor

A minimal browser-based Markdown editor with dual-pane editing and daily notes functionality. Designed as a lightweight Obsidian alternative.

## Features

- Dual-pane editing (left pane for documents, right pane for daily notes)
- File System Access API for direct filesystem read/write
- Calendar-based daily notes navigation
- Tag indexing with fuzzy search
- Quick Links and Quick Files for fast access
- Dark theme with CodeMirror 6 editor
- Markdown preview with collapsible frontmatter and nested lists

## Requirements

- Node.js 22+
- Chrome or Edge (required for File System Access API)

## Development

```bash
npm install           # Install dependencies
npm run dev           # Start dev server at localhost:5173
npm run build         # Production build to dist/
```

## Testing

```bash
npm run test:run      # Run Vitest unit tests
npm run test          # Run tests in watch mode
npm run check         # TypeScript/Svelte type checking
npm run test:e2e      # Run Playwright E2E tests
```

## Tech Stack

- Svelte 5 with TypeScript
- Vite for bundling
- CodeMirror 6 for editing
- Pikaday for calendar
- marked.js for Markdown rendering
- Fuse.js for fuzzy search
- Vitest + Playwright for testing
