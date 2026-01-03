# Markdown Editor

A minimal browser-based Markdown editor with dual-pane editing and daily notes functionality. Designed as a lightweight Obsidian alternative.

**Production:** https://notes.finnarn.com

## Features

- Dual-pane editing (left pane for documents, right pane for journal entries)
- Calendar-based daily notes and journal navigation
- Tag indexing with fuzzy search
- Quick Links and Quick Files for fast access
- Dark theme with CodeMirror 6 editor
- Markdown preview with collapsible frontmatter and nested lists

## Requirements

- Node.js 22+

## Development

```bash
npm install           # Install dependencies
npm run dev           # Start dev server at localhost:5173
npm run build         # Production build to build/
npm run check         # TypeScript/Svelte type checking
```

## Testing

```bash
npm run test:run      # Run Vitest unit tests
npm run test          # Run tests in watch mode
npm run test:e2e      # Run Playwright E2E tests
```

## Deployment

The app deploys automatically to a VPS via GitHub Actions when pushing to `main`.

Uses [Kamal 2](https://kamal-deploy.org/) for zero-downtime Docker deployments with automatic SSL.

```bash
# Manual deploy (requires Ruby + Kamal gem)
kamal deploy
```

See `config/deploy.yml` for deployment configuration.

## Tech Stack

- SvelteKit with TypeScript
- Vite for bundling
- CodeMirror 6 for editing
- Vanilla Calendar Pro for calendar
- marked.js for Markdown rendering
- Fuse.js for fuzzy search
- Vitest + Playwright for testing
- Kamal 2 for deployment
