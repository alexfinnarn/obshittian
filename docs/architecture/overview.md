# Architecture Overview

This document is the primary architecture reference. It replaces the old layer-by-layer docs as the source of truth for startup flow, boundaries, and runtime behavior.

## System Shape

The app has three main runtime layers:

1. Svelte components and stores in the browser
2. Client-side services such as `fileService`, `fileOpen`, and `fileSave`
3. SvelteKit API routes that perform filesystem work inside the active vault

The browser never reads the filesystem directly. All vault access goes through the API routes.

## App Bootstrap

The main bootstrap path is in `src/routes/+page.svelte`.

Startup sequence:

1. detect mobile layout and register window listeners
2. load user settings from localStorage
3. restore the saved pane width if present
4. optionally restore the last vault path and validate it with `/api/vault/validate`
5. once a vault is open:
   - load `.editor-config.json`
   - scan journal dates so the calendar can highlight days with existing entries
   - restore or rebuild the tag index
   - load or generate tag vocabulary
   - restore left-pane tabs
   - open today’s journal when configured
6. register page-level event handlers for file open/save, rename/delete, and journal navigation

The page component is the orchestration point. It is the best place to inspect when startup state appears inconsistent.

## State Ownership

The main state boundaries are:

- `vault`: active vault path and daily-notes folder
- `settings`: user preferences from localStorage
- `vaultConfig`: vault-owned quick links and quick files
- `tabsStore`: left-pane tab state
- `journalStore`: selected date and journal entries
- `tagsStore`: tag index and search metadata
- `tagVocabulary`: autocomplete vocabulary
- `editor`: focused pane for keyboard behavior

The important split is:

- user-local preferences live in localStorage
- vault-shared configuration lives in vault-owned files
- session UI state lives in stores and is rebuilt during bootstrap

Additional current state boundaries:

- AI support install state lives in `aiSupportStore` and is derived from `.editor-agent/`
- Codex command execution is not handled in the browser UI; the app exposes server-side runtime routes for external callers instead

## File and Journal Data Flow

### Markdown files

- Components emit `file:open`
- `src/routes/+page.svelte` handles the event
- `openFileInTabs()` loads the file and updates `tabsStore`
- Editing updates the active tab’s in-memory content
- `file:save` triggers `saveFile()`
- `saveFile()` writes the active tab through `fileService` and updates the tag index

Current event contracts:

- `file:open`: `{ path: string; openInNewTab?: boolean }`
- `file:save`: `void`

### Journal entries

- The right pane uses `journalStore`
- Selecting a date loads `YYYY/MM/YYYY-MM-DD.yaml`
- Entry mutations auto-save the YAML file
- Journal tags also update the shared tag index

Journal entries are indexed with synthetic keys like `journal:2025-12-08#entry-id`, not with filesystem paths.

### AI support and command runtime

- `App Settings` opens a modal-based AI support surface from the sidebar
- install state is detected from managed files under `.editor-agent/`
- command override files are optional and user-owned
- Codex commands use:
  - `/api/agent/context`
  - `/api/agent/journal/plan`
  - `/api/agent/journal/apply`

The app owns diff planning, YAML serialization, and confirmed journal writes for this runtime.

## Client/Server Boundary

Client code uses `fileService`, which wraps the filesystem API routes:

- `/api/files/read`
- `/api/files/write`
- `/api/files/create`
- `/api/files/delete`
- `/api/files/list`
- `/api/files/exists`
- `/api/files/rename`
- `/api/files/stat`
- `/api/files/export`
- `/api/vault/validate`
- `/api/agent/context`
- `/api/agent/journal/plan`
- `/api/agent/journal/apply`

`/api/vault/validate` is special because it establishes the active vault root by setting `process.env.VAULT_PATH` for later file operations.

Server-side path validation lives in `src/lib/server/pathUtils.ts` and prevents traversal outside the configured vault root.

## Eventing

The event bus in `src/lib/utils/eventBus.ts` is intentionally small and is used for cross-component coordination when direct props would be awkward.

The high-value events are:

- `file:open`
- `file:save`
- `file:renamed`
- `file:deleted`
- `pane:toggleView`
- `journal:scrollToEntry`
- `tags:reindex`

The page component is the main subscriber for file lifecycle events. Keep that in mind before moving event handling into leaf components.

## Current Failure Boundaries

- If vault validation fails, file APIs cannot be used
- If tag-index localStorage is missing or invalid, the app rebuilds the index from disk
- If `.editor-config.json` or `.editor-tags.yaml` is missing or malformed, the app falls back to defaults or regenerated data
- If `.editor-agent/` is missing, partial, or malformed, AI support reports install state rather than assuming it is valid
- Journal saves delete empty daily YAML files rather than keeping empty files around

## Where To Document Details

- Storage shapes and persisted files: [../reference/storage-contracts.md](../reference/storage-contracts.md)
- AI command runtime contract: [../reference/ai-command-runtime.md](../reference/ai-command-runtime.md)
- Local run and contributor workflow: [../developer-guide.md](../developer-guide.md)
- Deployment and health checks: [../local-deployment.md](../local-deployment.md)
