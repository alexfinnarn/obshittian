# Markdown Editor

A browser-based Markdown editor for a filesystem-backed vault. It combines a left-pane file editor with a right-pane daily journal and is designed as a lightweight Obsidian-style workspace.

Production: [notes.finnarn.com](https://notes.finnarn.com)

## What It Does

- Edits Markdown files from a real vault directory through SvelteKit API routes
- Keeps a calendar-backed daily journal in YAML files under the vault
- Indexes tags across Markdown files and journal entries
- Stores quick links, quick files, and daily-task configuration in the vault
- Installs optional vault-local AI support under `.editor-agent/`
- Exposes a diff-first agent runtime for Codex daily-task commands
- Supports vault export as a ZIP archive for backups

## Stack

- SvelteKit with Svelte 5 and TypeScript
- Adapter Node for deployment
- CodeMirror 6 for editing
- marked for Markdown rendering
- Fuse.js for tag search
- Vitest and Playwright for verification

## Requirements

- Node.js 22.12+

## Quick Start

```bash
npm install
npm run dev
```

Then open `http://localhost:5173` and enter a local vault path in the Vault Picker. The app will:

1. Validate the directory with `POST /api/vault/validate`
2. Set the active server-side vault root for file API routes
3. Load vault config, tag metadata, journal dates, and any restorable tabs

The app is not useful until a vault is opened because all file operations are scoped to the active vault directory.

## Common Commands

```bash
npm run dev
npm run build
npm run preview
npm run check
npm run test
npm run test:run
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:headed
```

## Documentation

- [Developer guide](docs/developer-guide.md)
- [Architecture overview](docs/architecture/overview.md)
- [Daily tasks and AI support summary](docs/reference/daily-tasks-and-ai-support.md)
- [AI command runtime](docs/reference/ai-command-runtime.md)
- [Storage and persistence contracts](docs/reference/storage-contracts.md)
- [Local deployment with Kamal](docs/local-deployment.md)

## Repo Orientation

- `src/routes/+page.svelte` boots the app, restores state, and wires event handlers
- `src/lib/components/` contains the UI
- `src/lib/stores/` owns reactive client state
- `src/lib/services/` coordinates file and UI operations
- `src/routes/api/` exposes the filesystem-backed server routes

## Deployment

Deploys automatically to the VPS from `main`. For manual deploys and health-check details, see [docs/local-deployment.md](docs/local-deployment.md).
