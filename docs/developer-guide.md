# Developer Guide

This guide is the fastest path to running the app locally, opening a vault, and making safe changes without reverse-engineering startup behavior.

## Local Setup

Requirements:

- Node.js 22.12+
- A local notes directory you can read from and write to

Install and start the app:

```bash
npm install
npm run dev
```

Open `http://localhost:5173` and use the Vault Picker to enter a vault path.

The picker calls `POST /api/vault/validate`, which:

- resolves the path to an absolute directory
- checks read/write access
- sets the active server-side `VAULT_PATH` used by the file API routes

If vault validation fails, the rest of the app cannot function because file access is disabled.

## Expected Vault Shape

The app works with a normal directory of Markdown files. It also creates and reads a few app-owned files inside that vault:

- `.editor-config.json` for quick links, quick files, and daily tasks
- `.editor-tags.yaml` for tag autocomplete vocabulary
- `zzz_Daily Notes/YYYY/MM/YYYY-MM-DD.yaml` for journal entries by default
- `zzz_Daily Notes/YYYY/MM/YYYY-MM-DD.md` for daily Markdown notes by default

The daily-notes folder name comes from config and defaults to `zzz_Daily Notes`.

## What Happens After a Vault Opens

The app bootstrap lives in `src/routes/+page.svelte`. After a vault is restored or manually opened, it:

1. loads vault-owned config from `.editor-config.json`
2. scans journal dates for the calendar
3. loads the tag index from localStorage or rebuilds it from the vault
4. loads tag vocabulary from `.editor-tags.yaml` or generates it from the tag index
5. restores saved left-pane tabs from localStorage
6. opens today’s journal if `autoOpenTodayNote` is enabled

This is the main startup path to understand before changing app initialization.

## Day-to-Day Development

Use these commands:

```bash
npm run check
npm run test:run
npm run test:e2e
```

Recommended workflow:

1. run `npm run check` for fast Svelte/TypeScript feedback
2. run the narrowest relevant unit tests with `npm test -- --run <path>`
3. run the affected Playwright test when changing UI or filesystem flows

## Runtime Model

This is not a pure client-side app. The browser UI talks to SvelteKit API routes for all filesystem operations.

- Client code uses `fileService`
- `fileService` calls `/api/files/*`
- API routes read and write the active vault on disk

Do not import Node filesystem modules into client code. Keep filesystem access behind `src/routes/api/` and `src/lib/services/fileService.ts`.

## Core Editing Behaviors

- The left pane is tab-based and edits Markdown files from the vault
- The right pane is the journal and writes YAML files per day
- `file:open` events are handled at the page level and open files into the left pane
- `file:save` has no payload and saves the active left-pane tab

If you are changing open/save behavior, verify the event contract in `src/lib/utils/eventBus.ts` and the page-level handlers in `src/routes/+page.svelte`.

## Safe Places To Look First

- [Architecture overview](architecture/overview.md) for data flow and ownership
- [Storage contracts](reference/storage-contracts.md) for vault-owned files and local persistence
- `tests/e2e/` for the intended user flows

## Known Current-State Nuances

- The app persists `editorLastOpenFile`, but current bootstrap restores tabs from `editorLeftPaneTabs`; it does not reopen a single last file from that key.
- The pane width is restored from localStorage during bootstrap after settings load.
- Journal tags are indexed alongside file tags, but journal entries use synthetic source keys instead of normal file paths.
