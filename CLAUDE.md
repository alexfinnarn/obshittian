# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A minimal browser-based Markdown editor with dual-pane editing and daily notes functionality. Designed as a lightweight Obsidian alternative. **Fully responsive** with mobile-first bottom tab navigation.

Built with **SvelteKit** (adapter-node), Svelte 5, and TypeScript. The app has server-side file API routes that enable path-based vault access via Node.js `fs` operations.

### Architecture

The app uses server-side file operations via SvelteKit API routes. Components use `fileService` to make API calls, which are handled by server routes that use Node.js `fs` to read/write files on the server filesystem.

```
Browser                          Server
┌──────────────────┐            ┌──────────────────────┐
│ Components       │            │ /api/files/* routes  │
│   ↓              │   HTTP     │   ↓                  │
│ fileService ─────┼───────────▶│ pathUtils + fs       │
└──────────────────┘            └──────────────────────┘
                                         ↓
                                  VAULT_PATH directory
```

See `plans/zzz_archived/06-sveltekit-migration/` for migration history.

## Development

```bash
npm install           # Install dependencies (requires Node 22+)
npm run dev           # Start dev server at localhost:5173
npm run build         # Production build to build/
npm run check         # TypeScript/Svelte type checking
```

## Testing

```bash
npm test              # Run unit tests in watch mode
npm run test:run      # Run unit tests once
npm run test:e2e      # Run Playwright E2E tests
npm run test:e2e:ui   # Run E2E tests with Playwright UI
npm run test:e2e:headed  # Run E2E tests in headed browser
```

Tests run automatically on pull requests to `main` via GitHub Actions:
- **Unit tests**: `.github/workflows/test.yml` - runs `npm run check` and `npm run test:run`
- **E2E tests**: `.github/workflows/playwright.yml` - runs Playwright tests with 4-shard parallelization

### Unit Tests
Tests use Vitest with happy-dom. Unit tests are colocated with source files in `src/lib/`:
- `stores/*.svelte.test.ts` - Store tests (vault, settings, editor, tabs, tags)
- `utils/*.test.ts` - Utility function tests (tags, markdown, dailyNotes, fileOperations)

### E2E Tests
Playwright tests are in `tests/e2e/` and test real browser interactions:
- `editor.spec.ts` - Editor pane behavior
- `file-tree.spec.ts` - File tree and context menu
- `sidebar.spec.ts` - Sidebar components
- `journal.spec.ts` - Journal pane and calendar integration
- `vault-picker.spec.ts` - Vault open/restore flow

Test fixtures are in `tests/data/testing-files/` with sample markdown files.

## Deployment

The app deploys to a VPS using Kamal 2 with automatic CI/CD via GitHub Actions.

**Production URL:** https://notes.finnarn.com

### How It Works

1. Push to `main` triggers `.github/workflows/deploy.yml`
2. Tests run first (type check + unit tests)
3. On success, Docker image is built and pushed to GitHub Container Registry (ghcr.io)
4. Kamal SSHs to the VPS and deploys the new container
5. kamal-proxy handles SSL (Let's Encrypt) and zero-downtime deploys

### Deployment Files

```
Dockerfile              - Multi-stage Node.js 22 build
.dockerignore           - Excludes dev files from image
config/deploy.yml       - Kamal configuration (servers, proxy, registry)
.kamal/secrets          - Registry credentials template
.github/workflows/
  deploy.yml            - CI/CD pipeline (test → build → deploy)
```

### Configuration

Edit `config/deploy.yml` to change:
- `servers.web` - VPS IP address
- `proxy.host` - Domain name
- `ssh.user` - SSH username
- `env.clear` - Environment variables

### Server-Side Vault Storage

The app uses `VAULT_PATH` environment variable to locate vault files on the server filesystem.

**Current state**: The `/api/vault/validate` endpoint sets `VAULT_PATH` at runtime, but this doesn't persist across container restarts.

**To enable persistent vault storage**, add a volume to `config/deploy.yml`:

```yaml
volumes:
  - "editor_vault:/app/vault"

env:
  clear:
    PORT: "3000"
    ORIGIN: https://notes.finnarn.com
    HOST: "0.0.0.0"
    VAULT_PATH: "/app/vault"  # Must match volume mount point
```

**Note**: Authentication is not yet implemented. Adding server-side vault storage without auth means anyone with access to the URL can read/write files.

### GitHub Secrets Required

| Secret | Purpose |
|--------|---------|
| `VPS_SSH_PRIVATE_KEY` | SSH key for server access |
| `VPS_HOST` | VPS IP address |

`GITHUB_TOKEN` is automatic and used for GHCR authentication.

### Manual Deployment

Trigger manually via GitHub Actions → Deploy → Run workflow, or locally:

```bash
gem install kamal
kamal deploy
```

### First-Time VPS Setup

Kamal handles most setup automatically, but ensure:
- SSH access configured (port 22 open)
- Ports 80 and 443 open for HTTP/HTTPS
- DNS pointing to VPS IP

Kamal will install Docker and configure kamal-proxy on first deploy.

### Multiple Apps on Same VPS

Kamal supports multiple apps on one server. Each app needs a unique `service` name and `proxy.host` in its `config/deploy.yml`. The proxy routes traffic by hostname.

## Architecture

For detailed documentation on the architecture layers, see:
- [Services](docs/architecture/services.md) - Orchestration and side effects
- [State Management](docs/architecture/state-management.md) - Svelte 5 stores and persistence
- [Events](docs/architecture/events.md) - Event bus and cross-component communication
- [Actions](docs/architecture/actions.md) - Svelte actions for DOM behavior (shortcuts, click-outside)

### File Structure
```
src/
  routes/
    +layout.svelte       - Root layout
    +page.svelte         - Main page component
    api/
      files/
        create/+server.ts  - Create file or directory
        delete/+server.ts  - Delete file or directory
        exists/+server.ts  - Check if path exists
        list/+server.ts    - List directory entries
        read/+server.ts    - Read file content
        rename/+server.ts  - Rename file or directory
        stat/+server.ts    - Get file/directory metadata
        write/+server.ts   - Write file content
      vault/
        validate/+server.ts - Validate vault path and set VAULT_PATH
  app.css              - Global CSS reset, theme variables, and responsive utilities
  app.html             - HTML template
  lib/
    server/
      fileTypes.ts       - Shared types for file API (request/response types)
      pathUtils.ts       - Path validation, traversal protection, error handling
    stores/
      vault.svelte.ts      - Vault state (rootDirHandle, dailyNotesFolder)
      settings.svelte.ts   - User preferences (autoOpen, restore, limits)
      vaultConfig.svelte.ts - Quick links/files/daily tasks from .editor-config.json
      editor.svelte.ts     - Dual-pane editor state with focus tracking
      tabs.svelte.ts       - Tabs management for left pane
      tags.svelte.ts       - Tag index state with localStorage persistence
      shortcuts.svelte.ts  - Shortcut blocking contexts for modal awareness
      journal.svelte.ts    - Journal entries state with YAML file persistence
      tagVocabulary.svelte.ts - Tag vocabulary for autocomplete
    config.ts            - Editor configuration (keyboard shortcuts, defaults)
    types/
      tabs.ts              - Tab interface and createTab function
      journal.ts           - Journal types and createJournalEntry helper
      tagVocabulary.ts     - Tag vocabulary types for .editor-tags.yaml
      dailyTasks.ts        - Daily task types, helpers, and template functions
    components/
      Sidebar.svelte       - Container for calendar, quick links/files, tabbed file tree/search
      SidebarTabs.svelte   - Files/Search tab toggle
      TagSearch.svelte     - Tag search input and results (includes journal entries)
      TagInput.svelte      - Reusable tag input with autocomplete
      Calendar.svelte      - Vanilla Calendar Pro with date enable/disable
      QuickLinks.svelte    - Quick links section with configure modal
      QuickFiles.svelte    - Quick files section with configure modal
      FileTree.svelte      - File tree with context menu and file operations
      FileTreeItem.svelte  - Recursive tree item (file or folder)
      FilenameModal.svelte - Input modal for create/rename operations
      Modal.svelte         - Base modal component with backdrop, transitions
      ContextMenu.svelte   - Positioned context menu with click-outside
      EditorPane.svelte    - Combined editor/preview pane with toolbar (tabs/single mode)
      TabBar.svelte        - Tab bar for multiple open files
      Tab.svelte           - Individual tab component
      CodeMirrorEditor.svelte - CodeMirror 6 editor wrapper
      MarkdownPreview.svelte  - Markdown preview with frontmatter
      PaneResizer.svelte   - Draggable pane divider
      VaultPicker.svelte   - Vault open/restore UI (shown when no vault open)
      JournalPane.svelte   - Main journal UI for right pane
      JournalEntry.svelte  - Individual journal entry component
      JournalEntryEditor.svelte - CodeMirror editor for journal entries
      DailyTaskTabs.svelte - Task tabs with progress counters for journal pane
      DailyTasksConfigModal.svelte - Modal for configuring daily tasks
      MobileNav.svelte     - Bottom tab navigation for mobile (Files/Editor/Journal)
    actions/
      clickOutside.ts      - Svelte action for detecting clicks outside element
      shortcut.ts          - Svelte action for declarative keyboard shortcuts
    services/
      fileService.ts       - File service abstraction (unified API for server file operations)
      fileOpen.ts          - File loading and opening (tabs, single pane, daily notes)
      fileSave.ts          - File saving with tag index updates
      shortcutHandlers.ts  - Handler functions for keyboard shortcuts
    utils/
      eventBus.ts       - Pub/sub for cross-component communication
      dailyNotes.ts     - Daily note path formatting, template, create/open
      tags.ts           - Tag extraction, indexing, Fuse.js search
      fileOperations.ts - File/folder create, rename, delete, sorting
      filesystem.ts     - IndexedDB & localStorage helpers
      frontmatter.ts    - YAML frontmatter parsing
      markdown.ts       - Marked.js configuration and rendering
tests/
  data/
    testing-files/       - E2E test fixtures (sample markdown files)
  e2e/
    *.spec.ts            - Playwright E2E tests
static/                  - Static assets (SvelteKit)
vite.config.ts           - Vite configuration (used by SvelteKit)
svelte.config.js         - SvelteKit configuration (adapter-node)
playwright.config.ts     - Playwright E2E test configuration
.github/
  workflows/
    test.yml             - Unit tests workflow (type check + vitest)
    playwright.yml       - E2E tests workflow (4-shard parallelization)
    deploy.yml           - CI/CD pipeline for VPS deployment
config/
  deploy.yml             - Kamal deployment configuration
.kamal/
  secrets                - Kamal secrets template
Dockerfile               - Multi-stage production build
.dockerignore            - Docker build exclusions
.claude/
  commands/              - Claude Code slash commands
docs/                    - Documentation (see architecture/ for design docs)
scripts/                 - Utility scripts
```

### Stores (src/lib/stores/)

**vault.svelte.ts** - Vault state management
- `vault` - Reactive state object with `path` (string), `dailyNotesFolder`
- `getIsVaultOpen()` - Returns whether a vault is open (getter function, not $derived export)
- `openVault(path)` - Set the vault path
- `closeVault()` - Clear the vault state
- `updateVaultConfig(config)` - Update dailyNotesFolder

**settings.svelte.ts** - User preferences
- `settings` - Reactive state with autoOpen, restore, quickFiles limits, shortcuts
- `updateSettings(partial)` - Update specific settings (deep merges shortcuts)
- `resetSettings()` - Reset to defaults
- `loadSettings()` / `saveSettings()` - localStorage persistence
- `getShortcut(name)` - Get a specific keyboard shortcut binding

**vaultConfig.svelte.ts** - Vault-specific configuration
- `vaultConfig` - Reactive state with quickLinks, quickFiles, dailyTasks arrays
- `getQuickLinks()` / `setQuickLinks(links)` - Get/set quick links
- `getQuickFiles()` / `setQuickFiles(files)` - Get/set quick files
- `getDailyTasks()` / `setDailyTasks(tasks)` - Get/set daily tasks
- `loadVaultConfig(handle, defaults)` - Load from .editor-config.json
- `saveVaultConfig()` - Save to .editor-config.json
- `resetVaultConfig()` - Clear to defaults

**editor.svelte.ts** - Focus tracking for keyboard shortcuts
- `editor` - Reactive state with `focusedPane: 'left' | 'right' | null`
- `PaneId` - Type alias for `'left' | 'right'`
- `setFocusedPane(pane)` / `getFocusedPane()` - Focus tracking
- Note: Content state is managed by tabs.svelte.ts (left pane) and journal.svelte.ts (right pane)

**tabs.svelte.ts** - Tabs management for left pane
- `tabsStore` - Reactive state with `tabs: Tab[]` and `activeTabIndex`
- `TAB_LIMIT` - Maximum tabs (5)
- `getActiveTab()` - Get current active tab or null
- `addTab(tab)` - Add new tab (switches if already open)
- `removeTab(index, skipConfirmation?)` - Close tab (prompts if dirty)
- `switchTab(index)` - Switch to different tab
- `updateTabContent(index, content)` - Update editor content
- `markTabDirty(index)` / `markTabClean(index, content)` - Dirty state

**tags.svelte.ts** - Tag index state with localStorage persistence
- `tagsStore` - Reactive state with `index`, `isIndexing`, `selectedTag`, `meta`
- `resetTagIndex()` - Clear all index data
- `isIndexBuilt()` - Check if index has entries
- `getFilesForTag(tag)` - Get files containing a tag
- `setTagIndex(index)` - Update index and metadata
- `saveTagIndexToStorage()` / `loadTagIndexFromStorage()` - localStorage persistence

**shortcuts.svelte.ts** - Shortcut blocking contexts
- `shortcutsStore` - Reactive state with `blockedBy: Set<string>`
- `blockShortcuts(reason)` - Block shortcuts, returns unblock function
- `areShortcutsBlocked()` - Check if any blockers are active
- `getBlockingReasons()` - Get list of current blocking reasons
- `clearAllBlocks()` - Remove all blockers (for testing)

**journal.svelte.ts** - Journal entries state management
- `journalStore` - Reactive state with selectedDate, entries, isLoading, datesWithEntries
- `getEntries()` - Get entries for selected date
- `getSelectedDate()` / `getSelectedDateString()` - Get currently selected date
- `getDatesWithEntries()` - Get array of date strings with entries
- `hasEntriesForDate(dateStr)` - Check if date has entries
- `addEntry(text, tags?)` - Add new entry (auto-saves with rollback, updates tag index)
- `removeEntry(id)` - Remove entry by ID (auto-saves with rollback, updates tag index)
- `updateEntryText(id, text)` - Update entry text (auto-saves)
- `updateEntryTags(id, tags)` - Update entry tags (auto-saves, updates tag index)
- `addTagToEntry(id, tag)` / `removeTagFromEntry(id, tag)` - Tag helpers
- `updateEntryOrder(id, order)` - Update entry order (auto-saves)
- `loadEntriesForDate(date)` - Load entries from YAML file
- `saveEntries()` - Save current entries to YAML file
- `scanDatesWithEntries()` - Scan vault for all dates with journal files
- `resetJournal()` - Clear state (for testing)

**tagVocabulary.svelte.ts** - Tag vocabulary for autocomplete
- `tagVocabulary` - Reactive state with tags array and isLoading
- `getTags()` - Get all vocabulary tags sorted by count
- `addTag(name)` - Add new tag to vocabulary
- `incrementTagCount(name)` / `decrementTagCount(name)` - Update tag usage
- `buildVocabularyFromIndex(tagIndex)` - Populate vocabulary from tag index
- `loadTagVocabulary()` / `saveTagVocabulary()` - Persist to .editor-tags.yaml

### Utilities (src/lib/utils/)

**filesystem.ts** - localStorage helpers
- `saveVaultPath(path)` / `getVaultPath()` / `clearVaultPath()` - Vault path persistence
- `saveLastOpenFile(path)` / `getLastOpenFile()` - Last open file path
- `savePaneWidth(width)` / `getPaneWidth()` - Pane width persistence

**frontmatter.ts** - YAML frontmatter
- `extractFrontmatterRaw(content)` - Find frontmatter boundaries
- `parseFrontmatter(content)` - Parse YAML to object
- `splitFrontmatter(content)` - Split into frontmatter + body
- `getFrontmatterValue(content, key)` - Get specific value
- `updateFrontmatterKey(content, key, value)` - Update or insert key

**markdown.ts** - Markdown rendering
- `configureMarked()` - Configure marked with custom renderers (call once)
- `renderMarkdown(text)` - Returns `{ frontmatterHtml, bodyHtml }`
- Custom link renderer: adds `target="_blank"` and `rel="noopener noreferrer"`
- Custom listitem renderer: wraps nested lists in `<details>/<summary>`

**eventBus.ts** - Cross-component communication
- `on(event, callback)` - Subscribe to event, returns unsubscribe function
- `emit(event, data)` - Emit event with typed data
- Typed events: `file:open`, `file:save`, `file:created`, `file:renamed`, `file:deleted`, `tree:refresh`, `modal:open`, `modal:close`, `tags:reindex`, `pane:toggleView`, `journal:scrollToEntry`

**dailyNotes.ts** - Daily note utilities
- `formatDailyNotePath(date)` - Returns `{ year, month, day, filename }` for path construction
- `generateDailyNoteTemplate(date)` - Creates default template
- `getDailyNoteRelativePath(folder, date)` - Returns full relative path
- `getOrCreateDailyNote(rootHandle, folder, date)` - Opens or creates daily note

**tags.ts** - Tag indexing and fuzzy search
- `extractTags(content)` - Extract tags from frontmatter (YAML array, list, or comma-separated)
- `buildTagIndex(rootDirHandle)` - Scan directory and build tag index (includes journal)
- `searchTags(query)` - Fuzzy search tags using Fuse.js
- `getAllTags()` - Get all tags sorted by count descending
- `updateFileInIndex(path, content)` - Update tags for a file (on save)
- `removeFileFromIndex(path)` - Remove file from index (on delete)
- `isJournalSource(key)` / `parseJournalSource(key)` - Journal source key helpers
- `updateJournalEntryInIndex(date, entryId, tags)` - Update journal entry tags
- `removeJournalEntryFromIndex(date, entryId)` - Remove journal entry from index

**fileOperations.ts** - File operations via fileService
- `writeToFile(filePath, content)` - Write content to file
- `createFile(parentPath, filename)` - Create new file, returns path
- `createFolder(parentPath, folderName)` - Create new folder, returns path
- `renameFile(parentPath, oldName, newName)` - Rename file, returns new path
- `renameFolder(parentPath, oldName, newName)` - Rename folder, returns new path
- `deleteEntry(parentPath, name, isDirectory)` - Delete file or folder
- `sortEntries(entries)` - Sort folders first, then alphabetically
- `isVisibleEntry(entry)` - Check if entry should be shown (filters dotfiles, non-md)
- `getVisibleEntries(dirPath)` - Get sorted, filtered entries from directory

### Services (src/lib/services/)

**fileOpen.ts** - File opening operations
- `loadFile(relativePath)` - Load file by path, returns content
- `openFileInTabs(path, openInNewTab)` - Open file in left pane tabs

**fileSave.ts** - File saving with side effects
- `saveFile()` - Save the active tab file
- Handles: dirty state, tag index updates, activity logging

**shortcutHandlers.ts** - Handler functions for keyboard shortcuts
- `handleSave()` - Save focused pane or both if none focused
- `handleToggleView()` - Emit `pane:toggleView` event for focused pane
- `handleCloseTab()` - Close current tab (left pane focused only)
- `handleNextTab()` / `handlePrevTab()` - Cycle through tabs

**fileService.ts** - File service abstraction layer
- `fileService` - Singleton instance for all file operations via server API
- `FileService` interface with methods: `readFile`, `writeFile`, `deleteFile`, `listDirectory`, `createDirectory`, `deleteDirectory`, `exists`, `rename`, `createFile`, `stat`
- `setVaultPath(path)` / `getVaultPath()` - Configure active vault
- `FileServiceError` - Error class with status code and error code

### Server API Routes (src/routes/api/)

**files/read** - `POST /api/files/read`
- Request: `{ path: string }`
- Response: `{ content: string }`

**files/write** - `POST /api/files/write`
- Request: `{ path: string, content: string }`
- Response: `{ success: true }`

**files/list** - `POST /api/files/list`
- Request: `{ path: string }`
- Response: `{ entries: DirectoryEntry[] }` (sorted: directories first, then alphabetical)

**files/create** - `POST /api/files/create`
- Request: `{ path: string, kind: 'file' | 'directory', content?: string }`
- Response: `{ success: true }`

**files/delete** - `POST /api/files/delete`
- Request: `{ path: string, recursive?: boolean }`
- Response: `{ success: true }`

**files/rename** - `POST /api/files/rename`
- Request: `{ oldPath: string, newPath: string }`
- Response: `{ success: true }`

**files/exists** - `POST /api/files/exists`
- Request: `{ path: string }`
- Response: `{ exists: boolean, kind?: 'file' | 'directory' }`

**files/stat** - `POST /api/files/stat`
- Request: `{ path: string }`
- Response: `{ kind, size, modified, created }`

**vault/validate** - `POST /api/vault/validate`
- Request: `{ path: string }`
- Response: `{ valid: true, path: string }` on success
- Sets `VAULT_PATH` environment variable for subsequent API calls

### Server Utilities (src/lib/server/)

**pathUtils.ts** - Path validation and security
- `getVaultRoot()` - Get vault path from `VAULT_PATH` env var
- `validatePath(requestedPath, vaultRoot)` - Prevent path traversal attacks
- `validateAndResolvePath(requestedPath)` - Validate and resolve to absolute path
- `createErrorResponse(err)` - Convert errors to appropriate HTTP responses
- `PathTraversalError` / `VaultNotConfiguredError` - Custom error classes

**fileTypes.ts** - Shared TypeScript types
- Request types: `ReadRequest`, `WriteRequest`, `ListRequest`, `CreateRequest`, `DeleteRequest`, `RenameRequest`, `ExistsRequest`, `StatRequest`
- Response types: `ReadResponse`, `WriteResponse`, `ListResponse`, `DirectoryEntry`, etc.
- `ErrorResponse` - Standard error format with `error` and `code` fields

### Actions (src/lib/actions/)

**clickOutside.ts** - Detect clicks outside an element
- Used for closing dropdowns, context menus, and modals
- Supports `enabled` option for conditional activation

**shortcut.ts** - Declarative keyboard shortcuts
- Attach shortcuts to elements via `use:shortcut={{ binding, handler }}`
- Supports focus conditions: `when: { focusedPane: 'right' }`
- Automatically blocked when modals are open (via shortcuts store)
- See [Actions docs](docs/architecture/actions.md) for full API

### Components (src/lib/components/)

**Modal.svelte** - Base modal component
- Props: `visible`, `title`, `onclose`
- Snippets: `children` (content), `footer` (buttons)
- Features: backdrop click to close, Escape key, fade transition
- Blocks keyboard shortcuts when visible (via shortcuts store)

**ContextMenu.svelte** - Positioned context menu
- Props: `visible`, `x`, `y`, `items`, `onclose`
- Features: viewport boundary detection, click-outside to close
- MenuItem: `{ label, action, disabled?, separator? }`

**FileTree.svelte** - File tree with context menu
- Watches `vault.rootDirHandle` for changes
- Context menu: Open in Tab, New File, New Folder, Rename, Delete
- Emits events: `file:open`, `file:created`, `file:renamed`, `file:deleted`
- Listens for `tree:refresh` to reload entries

**EditorPane.svelte** - Left pane editor with tabs
- Props: `initialViewMode`, `oncontentchange`, `onsave`, `oncancel`
- Renders TabBar + Edit/View toggle buttons, derives content from tabs store
- Listens for `pane:toggleView` events (left pane) to toggle edit/view mode
- Toggle buttons visible for mobile use (keyboard shortcuts don't work on touch devices)
- Exposes: `toggleViewMode()`, `getViewMode()`, `setViewMode()`, `focus()`, `hasFocus()`

**CodeMirrorEditor.svelte** - CodeMirror 6 wrapper
- Props: `content`, `onchange`, `ondocchange`
- Full CM6 setup with markdown and YAML highlighting
- Dark theme (oneDark), Tab indentation, auto-close brackets
- Exposes: `getContent()`, `focus()`, `hasFocus()`

**VaultPicker.svelte** - Vault open/restore UI
- Props: `onopen` (callback when vault successfully opened)
- Shows "Open Folder" and "Restore Last Folder" buttons
- Handles permission request for restore flow

**JournalPane.svelte** - Main journal UI
- Fills right pane entirely
- Date header showing formatted selected date
- Daily task tabs with progress counters (when tasks configured)
- New entry input with CodeMirror editor (pre-fills with template when task selected)
- Entry list sorted by order (filtered by task when task tab selected)

**JournalEntry.svelte** - Individual entry component
- Props: `entry: JournalEntry`
- Uses JournalEntryEditor for content display/editing
- View mode: rendered markdown, tags, order, timestamp, delete button
- Edit mode: CodeMirror editor, tag input, order input, Save/Cancel
- Click to enter edit mode
- Delete with confirmation dialog

**DailyTaskTabs.svelte** - Task tabs with progress counters
- Props: `entries`, `tasks`, `activeTaskId`, `onselect`, `onconfigure`
- Shows "All" tab plus one tab per visible task
- Task tabs display: indicator (gray/green), name, progress (e.g., "2/3")
- Configure button opens DailyTasksConfigModal

**DailyTasksConfigModal.svelte** - Task configuration modal
- Props: `visible`, `onclose`
- Add/edit/delete daily tasks
- Fields: name, tag ID (auto-generated), target count, days (daily or specific days)

**JournalEntryEditor.svelte** - CodeMirror editor for journal entries
- Props: `initialViewMode`, `toolbar` (snippet), `content`, `isDirty`, `oncontentchange`, `onsave`, `oncancel`
- Wraps CodeMirrorEditor and MarkdownPreview with view mode toggle
- Listens for `pane:toggleView` events (right pane) to toggle edit/view mode
- Sets focus tracking to 'right' pane
- Exposes: `toggleViewMode()`, `getViewMode()`, `setViewMode()`, `focus()`, `hasFocus()`

**MobileNav.svelte** - Bottom tab navigation for mobile
- Props: `activeView: MobileView`, `onviewchange: (view: MobileView) => void`
- `MobileView` type: `'sidebar' | 'editor' | 'journal'`
- Fixed to bottom of screen, 56px height with safe area padding
- Three tabs with icons: Files (folder), Editor (pencil), Journal (calendar)
- Hidden on desktop (768px+ breakpoint)

### Svelte 5 Runes Notes
- Module-level `$state` works in `.svelte.ts` files - export the object directly
- `$derived` CANNOT be exported from modules - use getter functions instead
- Tests for runes require `.svelte.test.ts` extension
- Use `toEqual` (not `toBe`) when comparing $state values due to proxy objects

### Svelte 5 Testing Notes
- Need `svelteTesting()` plugin from `@testing-library/svelte/vite` in vite.config.ts
- happy-dom requires mocks for Web Animations API (`element.animate()`) - see `src/test-setup.ts`
- Mock `globalThis.alert` and `globalThis.showOpenFilePicker` in test-setup.ts

## Key Behaviors

- Files clicked in tree open in left pane (tabs mode)
- Calendar date clicks open daily notes in right pane
- Daily notes follow `zzz_Daily Notes/YYYY/MM/YYYY-MM-DD.md` structure
- View toggle switches between edit/view modes per pane
- Pane divider is draggable for resizing
- Right-click on files/folders opens context menu (New File, New Folder, Rename, Delete)
- Search tab provides fuzzy tag search; click tag to see files, click file to open
- Tag index builds on directory open and updates on file save/rename/delete
- Quick Files and Quick Links are configurable via modal (stored in vault's `.editor-config.json`)
- Calendar date clicks load journal entries for that date in right pane
- Journal entries stored as YAML with metadata (type, order, timestamps)
- Journal files only created when first entry is added (not on navigation)
- Calendar enables today, the next 7 days, and past dates with entries; future dates beyond 7 days and past dates without entries are disabled
- Daily tasks appear as tabs in the journal pane with progress counters (e.g., "2/3")
- Tasks use `#dt/` tag prefix (e.g., `#dt/gym`) and can be daily or on specific days of the week
- Task tabs show gray (incomplete) or green (complete) based on entry count vs target
- Clicking a task tab filters entries and pre-fills new entry with template from `templates/tags/dt/<task>/NN.md`

## Responsive Design

The app is fully responsive with a mobile-first approach.

### Breakpoints

- **Mobile**: < 768px - Single pane with bottom tab navigation
- **Desktop**: >= 768px - Sidebar + dual pane layout

### Mobile Layout (< 768px)

- **Bottom tab navigation** (`MobileNav.svelte`) with three tabs: Files, Editor, Journal
- Shows one view at a time; all panes stay mounted (CSS visibility) to preserve state
- Auto-switches to Editor view when opening a file from sidebar
- Auto-switches to Journal view when selecting a calendar date
- Sidebar fills full width
- Edit/View toggle buttons visible in toolbar (keyboard shortcuts don't work on mobile)
- Touch-friendly: 44px minimum tap targets for buttons

### CSS Variables (app.css)

```css
--mobile-nav-height: 56px;
--mobile-nav-bg: #252525;
--mobile-nav-border: #333;
--mobile-nav-active: var(--accent-color);
--touch-target-min: 44px;
```

### Mobile Detection

In `+page.svelte`:
- `isMobile` state tracks viewport width < 768px
- `mobileView` state: `'sidebar' | 'editor' | 'journal'`
- Window resize listener updates `isMobile` reactively

### Responsive Modals

Modals use `width: 90vw; max-width: 500px` on mobile instead of fixed min-widths. Desktop restores `min-width: 400px`.

## Keyboard Shortcuts

Shortcuts are configurable in `src/lib/config.ts`. Default bindings:

- `Cmd/Ctrl+S` - Save focused pane (or both if neither focused)
- `Cmd/Ctrl+E` - Toggle view mode (edit/view) for focused pane only
- `Cmd/Ctrl+W` - Close current tab (left pane only)
- `Cmd/Ctrl+Tab` - Next tab
- `Cmd/Ctrl+Shift+Tab` - Previous tab

### Editor Shortcuts (CodeMirror)
- `Tab` - Indent line/selection
- `Shift+Tab` - Dedent line/selection
- `Alt+drag` - Rectangular/column selection
- Type `(`, `[`, `{`, `"`, `'` - Auto-closes with matching character

## Configuration

Configuration is managed in `src/lib/config.ts`. Edit this file to customize:

- **Keyboard shortcuts**: Modify `defaultConfig.shortcuts` to change key bindings
- **Vault settings**: `obsidianVaultPath`, `dailyNotesFolder`
- **Behavior**: Auto-open settings, restore preferences
- **Quick access defaults**: `defaultQuickLinks`, `defaultQuickFiles`

Settings are loaded into the settings store on app init and can be overridden via localStorage.

### Customizing Shortcuts

Each shortcut has a `key` and `modifiers` array:

```typescript
shortcuts: {
  save: { key: 's', modifiers: ['meta'] },        // Cmd/Ctrl+S
  toggleView: { key: 'e', modifiers: ['meta'] },  // Cmd/Ctrl+E
  closeTab: { key: 'w', modifiers: ['meta'] },    // Cmd/Ctrl+W
  // ... etc
}
```

Modifier options: `'meta'` (Cmd on Mac, Ctrl on Windows/Linux), `'ctrl'`, `'alt'`, `'shift'`

## Persistence

- **Vault path**: Stored in localStorage (`vaultPath`)
- **Last open file**: Stored in localStorage (`editorLastOpenFile`) as relative path from root
- **Pane width**: Stored in localStorage (`editorPaneWidth`)
- **Tag index**: Stored in localStorage with staleness tracking
- **Settings/Shortcuts**: Stored in localStorage (`editorSettings`), overrides `config.ts` defaults
- **Quick Links/Files/Daily Tasks**: Stored in vault's `.editor-config.json` file
- **Journal entries**: Stored in vault as `{dailyNotesFolder}/YYYY/MM/YYYY-MM-DD.yaml`
- **Daily task templates**: Stored in vault as `templates/tags/dt/<task-id>/NN.md`
- **Vault files**: Stored on server filesystem at `VAULT_PATH` (set via API or env var)

## Vault Configuration (.editor-config.json)

Quick Links, Quick Files, and Daily Tasks are stored in a `.editor-config.json` file in the vault root.

```json
{
    "quickLinks": [
        { "name": "Gmail", "url": "https://mail.google.com" }
    ],
    "quickFiles": [
        { "name": "Todo", "path": "01_Todo.md" }
    ],
    "dailyTasks": [
        { "id": "gym", "name": "Gym", "tag": "#dt/gym", "targetCount": 1, "days": ["monday", "wednesday", "friday"] },
        { "id": "songs", "name": "Songs", "tag": "#dt/songs", "targetCount": 1, "days": "daily" }
    ]
}
```

### Daily Tasks

Daily tasks are recurring tasks that appear as tabs in the journal pane. Each task:
- Uses a `#dt/` prefixed tag (e.g., `#dt/gym`)
- Has a `targetCount` for how many completions needed per day
- Has `days` set to `"daily"` or an array of specific days (e.g., `["monday", "wednesday", "friday"]`)
- Requires template files at `templates/tags/dt/<task-id>/01.md`, `02.md`, etc. (one per targetCount)

## Plans

Plans track multi-phase work like feature implementation or refactoring. Located in `/plans`.

### Creating a Plan

1. Create main plan file: `PLAN_NAME.md` (ALL_CAPS_WITH_UNDERSCORES)
2. Create phase files: `plan_name-phase-01-description.md` (lowercase)
3. Follow templates in `/plans/README.md`

### Working with Plans

- Read the main plan to understand scope and current progress
- Read the relevant phase file for detailed tasks
- Update status as you work: `Pending` → `In Progress` → `Completed`
- Check off tasks (`- [x]`) and acceptance criteria as completed
- Update the main plan's phase table when phase status changes

### Plan vs Direct Implementation

**Use a plan when:**
- Work spans multiple sessions or has 3+ distinct phases
- Multiple deliverables with dependencies
- Need to track progress across related tasks
- User requests a structured approach

**Skip the plan when:**
- Single-session task with clear scope
- Simple bug fix or small feature
- Exploratory work without defined deliverables

See `/plans/README.md` for full templates and conventions.

## AI Workflows (Claude Code)

This project uses Claude Code slash commands for AI-assisted workflows that operate on the note files.

**Important:** The full path to the Obsidian vault is stored in `src/lib/config.ts` as `obsidianVaultPath`. Always read this config to locate note files rather than searching within the editor project directory.

### Available Slash Commands

Located in `.claude/commands/`:

- `/rollup-monthly` - Summarize the previous month's daily notes into a monthly rollup

### When to Use Slash Commands vs Sub-agents

**Use slash commands** when:
- The workflow follows a defined, repeatable pattern
- Tasks are sequential (read files -> process -> write output)
- You want a simple trigger for a known operation

**Use sub-agents (Task tool)** when:
- Processing can be parallelized
- The task requires extensive codebase exploration
- Large scope where batching improves efficiency

### Creating New Workflows

1. Create a markdown file in `.claude/commands/` (e.g., `my-workflow.md`)
2. Include clear instructions for what Claude Code should do
3. Document input sources, processing steps, and output location
4. Run with `/my-workflow` in a Claude Code conversation
