# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A minimal browser-based Markdown editor with dual-pane editing and daily notes functionality. Designed as a lightweight Obsidian alternative. Uses the File System Access API to read/write files directly on the user's filesystem.

## Development

### Vanilla JS (Current)
No build process required. Open `index.html` directly in Chrome or Edge (required for File System Access API support).

### Svelte 5 (Migration in Progress)
A Svelte 5 migration is underway in `svelte-app/`. See `plans/MIGRATION_PHASES.md` for progress.

```bash
cd svelte-app
npm install           # Install dependencies (requires Node 22+)
npm run dev           # Start dev server at localhost:5173
npm run build         # Production build to dist/
npm run test:run      # Run Vitest tests
npm run check         # TypeScript/Svelte type checking
```

### Testing

```bash
npm install              # Install dev dependencies
npm test                 # Run unit tests in watch mode
npm run test:run         # Run unit tests once
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Run E2E tests with Playwright UI
npm run test:e2e:headed  # Run E2E tests in headed browser
```

Tests run automatically on pull requests to `main` via GitHub Actions (`.github/workflows/test.yml`).

#### Unit Tests
Tests use Vitest with jsdom. Test files are in `tests/` and cover:
- `daily-notes.test.js` - Date formatting, template generation, directory creation
- `file-operations.test.js` - File/folder create, rename, delete, context menu state
- `marked-config.test.js` - Custom link/list renderers, preview rendering
- `persistence.test.js` - localStorage helpers
- `file-tree.test.js` - Path resolution, file opening by path
- `tags.test.js` - Frontmatter parsing, tag extraction, index operations
- `sync.test.js` - Sync mode detection, daily note modification detection, export paths

#### E2E Tests
Playwright tests are in `tests/e2e/` and test real browser interactions:
- `app.spec.js` - UI elements, view toggles, modals, quick links, editor features (Tab indent, auto-close brackets)

Test fixtures for E2E tests are in `tests/data/testing-files/` with sample markdown files and daily notes structure.

## Architecture

### File Structure
```
index.html           - HTML structure only, loads ES modules (vanilla JS)
style.css            - Dark theme styles (vanilla JS)
config.js            - User configuration (window.editorConfig)
playwright.config.js - Playwright E2E test configuration
.github/
  workflows/
    test.yml         - GitHub Actions workflow for PR testing
svelte-app/          - Svelte 5 migration (in progress)
  src/
    App.svelte       - Root component (layout shell: sidebar + dual-pane editor)
    main.ts          - Entry point
    app.css          - Global CSS reset
    global.d.ts      - Type declarations for File System Access API
    lib/
      stores/
        vault.svelte.ts      - Vault state (rootDirHandle, dailyNotesFolder, syncDirectory)
        settings.svelte.ts   - User preferences (autoOpen, restore, limits)
        vaultConfig.svelte.ts - Quick links/files from .editor-config.json
        editor.svelte.ts     - Dual-pane editor state with focus tracking
        tabs.svelte.ts       - Tabs management for left pane (Phase 6)
        tags.svelte.ts       - Tag index state with localStorage persistence (Phase 8)
      types/
        tabs.ts              - Tab interface and createTab function (Phase 6)
      components/
        Sidebar.svelte       - Container for calendar, quick links/files, tabbed file tree/search
        SidebarTabs.svelte   - Files/Search tab toggle (Phase 8)
        TagSearch.svelte     - Tag search input and results (Phase 8)
        Calendar.svelte      - Pikaday calendar wrapper with dark theme (Phase 7)
        QuickLinks.svelte    - Quick links section with configure modal
        QuickFiles.svelte    - Quick files section with configure modal
        FileTree.svelte      - File tree with context menu and file operations
        FileTreeItem.svelte  - Recursive tree item (file or folder)
        FilenameModal.svelte - Input modal for create/rename operations
        Modal.svelte         - Base modal component with backdrop, transitions
        ContextMenu.svelte   - Positioned context menu with click-outside
        EditorPane.svelte    - Combined editor/preview pane with toolbar (tabs/single mode)
        TabBar.svelte        - Tab bar for multiple open files (Phase 6)
        Tab.svelte           - Individual tab component (Phase 6)
        CodeMirrorEditor.svelte - CodeMirror 6 editor wrapper
        MarkdownPreview.svelte  - Markdown preview with frontmatter
        PaneResizer.svelte   - Draggable pane divider
        VaultPicker.svelte   - Vault open/restore UI (shown when no vault open) (Phase 9)
      actions/
        clickOutside.ts      - Svelte action for detecting clicks outside element
      utils/
        eventBus.ts       - Pub/sub for cross-component communication
        dailyNotes.ts     - Daily note path formatting, template, create/open (Phase 7)
        tags.ts           - Tag extraction, indexing, Fuse.js search (Phase 8)
        sync.ts           - Sync export utilities, daily note auto-upgrade (Phase 9)
        fileOperations.ts - File/folder create, rename, delete, sorting (ported from file-operations.js)
        filesystem.ts     - IndexedDB & localStorage helpers (ported from persistence.js)
        frontmatter.ts    - YAML frontmatter parsing (ported from frontmatter.js)
        markdown.ts       - Marked.js configuration and rendering (ported from marked-config.js)
plans/               - Migration planning documents
  SVELTE_MIGRATION_PLAN.md
  MIGRATION_PHASES.md
  phase-*.md
js/
  app.js             - Main entry point, state management, initialization
  dependencies.js    - Centralized external library loading and ready-state management
  persistence.js     - IndexedDB & localStorage helpers
  editor.js          - CodeMirror editor setup
  file-tree.js       - File tree building, navigation & context menu
  file-operations.js - File/folder create, rename, delete operations
  daily-notes.js     - Daily note creation/opening
  ui.js              - View toggles, pane resizer, UI shortcuts
  keyboard.js        - Centralized keyboard shortcut registration and handling
  sidebar.js         - Sidebar tabs and tag search UI
  frontmatter.js     - Shared frontmatter parsing utilities
  marked-config.js   - Custom marked.js renderer configuration
  tags.js            - Tag indexing and fuzzy search
  sync.js            - Google Drive sync via docx export
  quick-links.js     - Quick Links sidebar feature (external URLs)
  quick-files.js     - Quick Files sidebar feature (frequently-used files)
  vault-config.js    - Vault-specific config (.editor-config.json)
tests/
  mocks/
    file-system.js   - Mock File System Access API for unit testing
  data/
    testing-files/   - E2E test fixtures (sample markdown files)
  e2e/
    app.spec.js      - Playwright E2E tests
  daily-notes.test.js
  file-operations.test.js
  file-tree.test.js
  frontmatter.test.js
  marked-config.test.js
  persistence.test.js
  tags.test.js
  sync.test.js
```

### HTML Structure (index.html)
- Sidebar with calendar widget, quick links, quick files, and tabbed file tree/search
- Tabbed sidebar section: Files tab (file tree) and Search tab (tag search)
- Two independent editor panes (left for working documents, right for daily notes)
- Both pane toolbars have filename display with unsaved indicator

### CSS (style.css)
- Dark theme using CSS custom properties
- Flexbox layout with resizable panes
- Pikaday calendar theme overrides to match dark UI

### JavaScript Modules

**js/app.js** - Main entry point
- `state` object tracks root directory handle and per-pane state (fileHandle, dirHandle, content, isDirty)
- `elements` object holds DOM references for both panes
- Waits for all dependencies via `whenAllReady()` before initializing
- Initializes editors, calendar, and all event handlers
- Orchestrates other modules

**js/dependencies.js** - External library loading
- `whenReady(libName)` - Returns Promise that resolves when a library is loaded (with timeout)
- `whenAllReady()` - Returns Promise that resolves when all configured libraries are loaded
- `isLoaded(libName)` - Check if a library is currently available
- `getLibraryNames()` - Get list of all configured library names
- Configured libraries: `CM` (CodeMirror), `Pikaday`, `marked`, `Fuse`, `docx`
- Each library has a configurable timeout (default 5-10 seconds)

**js/persistence.js** - Storage helpers
- `saveDirectoryHandle(handle)` / `getDirectoryHandle()` - IndexedDB for directory handle
- `saveLastOpenFile(path)` / `getLastOpenFile()` - localStorage for last file
- `savePaneWidth(width)` / `getPaneWidth()` - localStorage for pane width
- `saveTempExports(exports)` / `getTempExports()` - localStorage for temporary sync export tracking

**js/editor.js** - CodeMirror setup
- `createEditor(CM, container, pane, state, elements)` - Creates CodeMirror instance with dark theme
- Extensions enabled:
  - `indentWithTab` - Tab/Shift-Tab for indent/dedent
  - `closeBrackets` - Auto-close `()`, `[]`, `{}`, quotes
  - `scrollPastEnd` - Allows scrolling past last line
  - `rectangularSelection` - Alt+drag for column selection
  - `dropCursor` - Visual feedback when dragging text

**js/file-tree.js** - File navigation & context menu
- `buildFileTree(dirHandle, parentElement, openFileInPane, state)` - Recursively builds sidebar tree with right-click handlers
- `setupContextMenu(state, openFileInPane, refreshFileTree)` - Initializes context menu for file operations
- `getRelativePath(rootDirHandle, fileHandle)` - Gets relative path from root
- `openFileByPath(relativePath, pane, state, openFileInPane)` - Opens file by path
- `openFileInPane(fileHandle, parentDirHandle, pane, state, elements, uiElement)` - Opens file in pane

**js/file-operations.js** - File system operations
- `createFile(parentDirHandle, filename)` - Creates a new empty file
- `createFolder(parentDirHandle, folderName)` - Creates a new folder
- `renameFile(dirHandle, oldName, newName)` - Renames a file (copy + delete, since FS API has no native rename)
- `renameFolder(parentDirHandle, oldName, newName)` - Renames a folder recursively
- `deleteEntry(parentDirHandle, name, isDirectory)` - Deletes a file or folder
- Context menu state helpers (`getContextMenuState`, `setContextMenuState`, `showContextMenu`, `hideContextMenu`)

**js/daily-notes.js** - Daily notes
- `formatDailyNotePath(date)` - Returns `{ year, month, day, filename }` for a date
- `generateDailyNoteTemplate(date)` - Creates default template for new daily notes (includes `sync: delete` frontmatter)
- `getOrCreateDirectory(parentHandle, name)` - Gets or creates a directory
- `openDailyNote(date, state, openFileInPane)` - Creates/opens daily note
- `registerDailyNoteShortcuts(config, picker, openDailyNote)` - Registers navigation shortcuts with keyboard hook

**js/ui.js** - UI functionality
- `savePane(pane, state, elements)` - Saves pane content to filesystem, triggers sync export and cleanup
- `registerUIShortcuts(state, elements)` - Registers Ctrl/Cmd+S (save) and Ctrl/Cmd+E (toggle view) with keyboard hook
- `setupViewToggle(elements)` - Edit/View toggle button click handlers
- `getCurrentViewMode(pane)` - Returns current view mode ('edit' or 'view') for a pane
- `setViewMode(pane, view, elements)` - Sets view mode for a pane
- `cycleViewMode(pane, elements)` - Toggles between edit and view modes
- `setupPaneResizer()` - Draggable pane divider
- `restorePaneWidth(config)` - Restore saved width

**js/keyboard.js** - Centralized keyboard shortcut management
- `registerShortcut({ keys, handler, description, category })` - Register a keyboard shortcut
- `initKeyboardShortcuts()` - Initialize the single keyboard event listener (call after all registrations)
- `getShortcuts()` - Returns all registered shortcuts for help UI
- Keys object supports: `key`, `ctrl`, `meta`, `alt`, `shift`, and `mod` (ctrl on Windows, meta on Mac)

**js/sidebar.js** - Sidebar tabs and tag search UI
- `setupSidebarTabs(elements, state, openFileInPane)` - Initializes tab switching and tag search event handlers
- `renderTagResults(query, tabs, state, openFileInPane)` - Renders fuzzy search results for tags
- `renderFileResults(tag, tabs, state, openFileInPane)` - Renders files containing a selected tag
- `showIndexingStatus(tabs)` / `clearIndexingStatus(tabs)` - Show/hide indexing status message

**js/frontmatter.js** - Shared frontmatter parsing utilities
- `extractFrontmatterRaw(content)` - Finds frontmatter boundaries, returns `{ raw, endIndex }` or null
- `parseFrontmatter(content)` - Parses YAML frontmatter into object (used by tags.js)
- `splitFrontmatter(content)` - Splits into `{ frontmatter, body }` (used by marked-config.js)
- `getFrontmatterValue(content, key)` - Gets a specific frontmatter value
- `updateFrontmatterKey(content, key, value)` - Updates or inserts a frontmatter key

**js/marked-config.js** - Markdown rendering customization
- `configureMarked()` - Configures marked.js with custom renderer (called once at startup)
- `renderPreview(text, previewElement)` - Renders markdown to HTML in preview pane
- Custom `link` renderer adds `target="_blank"` to open links in new tabs
- Custom `listitem` renderer wraps nested lists in native `<details>`/`<summary>` elements for collapsible behavior

**js/tags.js** - Tag indexing and fuzzy search
- `extractTags(content)` - Gets tags array from frontmatter (supports comma-separated, YAML array, YAML list)
- `buildTagIndex(rootDirHandle)` - Scans all .md files and builds tag index (reads only first 2KB per file)
- `searchTags(query)` - Fuzzy search tags using Fuse.js
- `getFilesForTag(tag)` - Returns all file paths containing a specific tag
- `updateFileInIndex(filePath, content)` - Updates tags for a file (called on save)
- `removeFileFromIndex(filePath)` - Removes file from index (called on delete)
- `renameFileInIndex(oldPath, newPath)` - Updates file path in index (called on rename)

**js/sync.js** - Google Drive sync via docx export
- `SYNC_MODES` - Constants: `permanent`, `temporary`, `delete`
- `getSyncMode(content)` - Extracts sync mode from frontmatter
- `isDailyNote(relativePath, dailyNotesFolder)` - Checks if path is in daily notes folder
- `parseDailyNotePath(relativePath)` - Extracts Date from daily note filename
- `isDailyNoteModified(content, date)` - Compares content to default template
- `getExportPath(relativePath, syncDir)` - Converts `.md` path to `.docx` export path
- `markdownToDocx(content, title)` - Converts markdown to docx Blob using docx library
- `processSync(relativePath, content, rootHandle, config)` - Main export logic (called on save)
- `cleanupTempExports(rootHandle, config)` - Removes old temporary exports beyond limit

**js/quick-links.js** - Quick Links sidebar feature
- `initQuickLinks()` - Initialize quick links display and configure modal
- `refreshQuickLinks()` - Re-render links after vault config loads
- Links stored in vault's `.editor-config.json`, falls back to `config.js` defaults

**js/quick-files.js** - Quick Files sidebar feature
- `initQuickFiles(state, elements, openFileInPane)` - Initialize sidebar links and configure modal
- `refreshQuickFiles()` - Re-render links after vault config loads
- Files stored in vault's `.editor-config.json`, falls back to `config.js` defaults
- Click a quick file to open it in the left pane

**js/vault-config.js** - Vault-specific configuration
- `loadVaultConfig(rootDirHandle)` - Loads `.editor-config.json` from vault root
- `saveVaultConfig()` - Saves current config to `.editor-config.json`
- `getQuickLinks()` / `setQuickLinks(links)` - Get/set quick links
- `getQuickFiles()` / `setQuickFiles(files)` - Get/set quick files
- `getRootDirHandle()` - Get current root directory handle
- Falls back to `config.js` defaults when vault config doesn't exist

**External Libraries (CDN)**

Libraries are loaded via CDN in `index.html` and managed by `js/dependencies.js`:
- `marked.js` - Markdown to HTML parsing (customized via `js/marked-config.js`)
- `Pikaday` - Calendar widget (see `docs/pikaday.md` for API)
- `CodeMirror 6` - Code editor with markdown support (ES modules via esm.sh)
- `Fuse.js` - Fuzzy search library for tag search
- `docx` - Word document generation for sync exports

### Svelte 5 Modules (svelte-app/src/lib/)

**stores/vault.svelte.ts** - Vault state management
- `vault` - Reactive state object with `rootDirHandle`, `dailyNotesFolder`, `syncDirectory`
- `getIsVaultOpen()` - Returns whether a vault is open (getter function, not $derived export)
- `openVault(handle)` - Set the root directory handle
- `closeVault()` - Clear the vault state
- `updateVaultConfig(config)` - Update dailyNotesFolder/syncDirectory

**stores/settings.svelte.ts** - User preferences
- `settings` - Reactive state with autoOpen, restore, sync/quickFiles limits
- `updateSettings(partial)` - Update specific settings
- `resetSettings()` - Reset to defaults
- `loadSettings()` / `saveSettings()` - localStorage persistence

**utils/filesystem.ts** - Storage helpers (TypeScript port of persistence.js)
- `saveDirectoryHandle(handle)` / `getDirectoryHandle()` - IndexedDB for vault handle
- `saveLastOpenFile(path)` / `getLastOpenFile()` - localStorage
- `savePaneWidth(width)` / `getPaneWidth()` - localStorage
- `saveTempExports(exports)` / `getTempExports()` - localStorage for sync tracking
- `getOrCreateDirectory(parent, name)` - Create directory if needed
- `readFileContent(fileHandle)` / `writeFileContent(fileHandle, content)` - File I/O

**utils/frontmatter.ts** - YAML frontmatter (TypeScript port of frontmatter.js)
- `extractFrontmatterRaw(content)` - Find frontmatter boundaries
- `parseFrontmatter(content)` - Parse YAML to object
- `splitFrontmatter(content)` - Split into frontmatter + body
- `getFrontmatterValue(content, key)` - Get specific value
- `updateFrontmatterKey(content, key, value)` - Update or insert key

**stores/vaultConfig.svelte.ts** - Vault-specific configuration
- `vaultConfig` - Reactive state with quickLinks, quickFiles arrays
- `getQuickLinks()` / `setQuickLinks(links)` - Get/set quick links
- `getQuickFiles()` / `setQuickFiles(files)` - Get/set quick files
- `loadVaultConfig(handle, defaults)` - Load from .editor-config.json
- `saveVaultConfig()` - Save to .editor-config.json
- `resetVaultConfig()` - Clear to defaults

**stores/editor.svelte.ts** - Dual-pane editor state
- `editor` - Reactive state with left/right pane state and focusedPane
- `PaneState` - fileHandle, dirHandle, content, isDirty, relativePath
- `openFileInPane(pane, fileHandle, dirHandle, content, path)` - Open file
- `updatePaneContent(pane, content)` - Update content and mark dirty
- `markPaneDirty(pane)` / `markPaneClean(pane, content?)` - Dirty state
- `closePaneFile(pane)` - Clear pane state
- `setFocusedPane(pane)` / `getFocusedPane()` - Focus tracking
- `isPaneFileOpen(pane)` / `getPaneFilename(pane)` - Status helpers

**stores/tabs.svelte.ts** - Tabs management for left pane
- `tabsStore` - Reactive state with `tabs: Tab[]` and `activeTabIndex`
- `TAB_LIMIT` - Maximum tabs (5)
- `getActiveTab()` - Get current active tab or null
- `getTabCount()` / `canAddTab()` - Tab limit checking
- `findTabByPath(relativePath)` - Find tab index by path
- `addTab(tab)` - Add new tab (switches if already open)
- `replaceCurrentTab(tab)` - Replace current tab's content
- `removeTab(index, skipConfirmation?)` - Close tab (prompts if dirty)
- `switchTab(index)` - Switch to different tab
- `updateTabContent(index, content)` - Update editor content
- `markTabDirty(index)` / `markTabClean(index, content)` - Dirty state
- `saveTabsToStorage()` / `getTabsFromStorage()` / `clearTabsStorage()` - localStorage persistence
- `resetTabsStore()` / `setTabs(tabs, activeIndex)` - Testing and restoration

**stores/tags.svelte.ts** - Tag index state with localStorage persistence (Phase 8)
- `tagsStore` - Reactive state with `index`, `isIndexing`, `selectedTag`, `meta`
- `TagIndex` - Files -> tags mapping, tags -> files mapping, allTags array
- `TagEntry` - Tag name and file count for Fuse.js
- `ReindexEventData` - Event payload with type, files/tags added/removed, meta
- `resetTagIndex()` - Clear all index data
- `isIndexBuilt()` - Check if index has entries
- `getFilesForTag(tag)` - Get files containing a tag
- `setIndexing(bool)` / `getIsIndexing()` - Indexing state
- `setSelectedTag(tag)` / `getSelectedTag()` - Selected tag state
- `setTagIndex(index)` - Update index and metadata
- `saveTagIndexToStorage()` / `loadTagIndexFromStorage()` - localStorage persistence
- `clearTagIndexStorage()` - Remove stored index
- `isTagIndexStale(maxAge)` - Check if index is older than maxAge

**types/tabs.ts** - Tab type definitions
- `Tab` interface - id, fileHandle, dirHandle, savedContent, editorContent, isDirty, filename, relativePath
- `TabStorageItem` / `TabsStorageData` - Persistence formats
- `createTab(fileHandle, dirHandle, content, relativePath)` - Create new Tab

**utils/markdown.ts** - Markdown rendering (TypeScript port of marked-config.js)
- `configureMarked()` - Configure marked with custom renderers (call once)
- `renderMarkdown(text)` - Returns `{ frontmatterHtml, bodyHtml }`
- `renderFrontmatterHtml(yaml)` - Escape and wrap YAML in pre/code
- Custom link renderer: adds `target="_blank"` and `rel="noopener noreferrer"`
- Custom listitem renderer: wraps nested lists in `<details>/<summary>`

**utils/eventBus.ts** - Cross-component communication
- `on(event, callback)` - Subscribe to event, returns unsubscribe function
- `emit(event, data)` - Emit event with typed data
- `off(event, callback)` - Unsubscribe from event
- `clear()` - Clear all listeners (for testing)
- Typed events: `file:open` (path, pane?, openInNewTab?), `file:save`, `file:created`, `file:renamed`, `file:deleted`, `dailynote:open` (date), `tree:refresh`, `modal:open`, `modal:close`, `tags:reindex` (ReindexEventData)

**utils/dailyNotes.ts** - Daily note utilities (Phase 7)
- `formatDailyNotePath(date)` - Returns `{ year, month, day, filename }` for path construction
- `generateDailyNoteTemplate(date)` - Creates default template with `sync: delete` frontmatter
- `getDailyNoteRelativePath(folder, date)` - Returns full relative path like `folder/YYYY/MM/YYYY-MM-DD.md`
- `getOrCreateDailyNote(rootHandle, folder, date)` - Opens or creates daily note, returns handles and content

**utils/tags.ts** - Tag indexing and fuzzy search (Phase 8)
- `extractTags(content)` - Extract tags from frontmatter (YAML array, list, or comma-separated)
- `buildTagIndex(rootDirHandle)` - Scan directory and build tag index
- `searchTags(query)` - Fuzzy search tags using Fuse.js
- `getAllTags()` - Get all tags sorted by count descending
- `updateFileInIndex(path, content)` - Update tags for a file (on save)
- `removeFileFromIndex(path)` - Remove file from index (on delete)
- `renameFileInIndex(oldPath, newPath)` - Update file path in index (on rename)
- `initializeFuseFromIndex()` - Initialize Fuse.js after loading from storage

**utils/sync.ts** - Sync export utilities (Phase 9)
- `SYNC_MODES` - Constants: `permanent`, `temporary`, `delete`
- `getSyncMode(content)` - Extract sync mode from frontmatter
- `isDailyNote(relativePath, dailyNotesFolder)` - Check if path is in daily notes folder
- `parseDailyNotePath(relativePath)` - Extract Date from daily note filename
- `isDailyNoteModified(content, date)` - Compare content to default template
- `getExportPath(relativePath, syncDirectory)` - Get export path for file
- `processSync(relativePath, content, rootHandle, syncDirectory)` - Export markdown to sync directory
- `cleanupTempExports(rootHandle, syncDirectory, limit)` - Remove old temporary exports

**utils/fileOperations.ts** - File system operations (TypeScript port of file-operations.js)
- `writeToFile(fileHandle, content)` - Write content to file
- `createFile(parentDirHandle, filename)` - Create new file
- `createFolder(parentDirHandle, folderName)` - Create new folder
- `renameFile(dirHandle, oldName, newName)` - Rename file (copy + delete)
- `renameFolder(parentDirHandle, oldName, newName)` - Rename folder recursively
- `deleteEntry(parentDirHandle, name, isDirectory)` - Delete file or folder
- `getRelativePath(rootDirHandle, fileHandle)` - Get path from root to file
- `sortEntries(entries)` - Sort folders first, then alphabetically
- `isVisibleEntry(entry)` - Filter dotfiles and non-md/txt files
- `getVisibleEntries(dirHandle)` - Get sorted, filtered entries

**actions/clickOutside.ts** - Svelte action for click detection
- `use:clickOutside={callback}` - Call callback when clicking outside element
- `use:clickOutside={{ callback, enabled }}` - With enabled flag
- Returns `update` and `destroy` methods

**components/Modal.svelte** - Base modal component
- Props: `visible`, `title`, `onclose`
- Snippets: `children` (content), `footer` (buttons)
- Features: backdrop click to close, Escape key, fade transition

**components/ContextMenu.svelte** - Positioned context menu
- Props: `visible`, `x`, `y`, `items`, `onclose`
- Features: viewport boundary detection, click-outside to close
- MenuItem: `{ label, action, disabled?, separator? }`

**components/QuickLinks.svelte** - Quick links sidebar section
- Displays links from vaultConfig store
- Configure modal for add/edit/delete
- Links open in new browser tabs

**components/QuickFiles.svelte** - Quick files sidebar section
- Displays file shortcuts from vaultConfig store
- Configure modal with file picker
- Clicks emit `file:open` events via event bus
- Respects `settings.quickFilesLimit`

**components/Calendar.svelte** - Pikaday calendar wrapper (Phase 7)
- Props: `selectedDate`, `onselect`
- Wraps Pikaday library with dark theme CSS overrides
- Exposes: `gotoDate(date)`, `getDate()`, `navigateDays(days)`
- `navigateDays` triggers `onselect` callback for date changes

**components/Sidebar.svelte** - Sidebar container (updated Phase 8)
- Props: `ondateselect` - callback when calendar date is selected
- Exposes: `navigateCalendar(days)` - for keyboard navigation
- Contains Calendar, QuickLinks, QuickFiles, SidebarTabs

**components/SidebarTabs.svelte** - Files/Search tab toggle (Phase 8)
- Files tab (default): Shows FileTree
- Search tab: Shows TagSearch
- Tab state managed with local $state
- ARIA: role="tablist", role="tab", role="tabpanel"

**components/TagSearch.svelte** - Tag search input and results (Phase 8)
- Search input with debounced Fuse.js fuzzy search
- Shows all tags sorted by count when no query
- Clicking tag shows files containing that tag
- Clicking file emits `file:open` event
- Shows "Indexing tags..." status during index build
- Shows "No tags found" / "No matching tags" states

**components/FileTree.svelte** - File tree with context menu
- Watches `vault.rootDirHandle` for changes
- Renders FileTreeItem for each root entry
- Manages context menu state for file operations
- Context menu: Open in Tab (files only, disabled at limit), New File, New Folder, Rename, Delete
- Uses FilenameModal for create/rename operations
- Emits events: `file:open`, `file:created`, `file:renamed`, `file:deleted`
- Listens for `tree:refresh` to reload entries

**components/FileTreeItem.svelte** - Recursive tree item
- Renders file or folder with lazy loading
- Uses modern Svelte 5 pattern: imports itself for recursion
- Single click emits `file:open` event
- Right-click triggers context menu callback
- Visual indication of active file
- Keyboard accessible (Enter/Space to open)

**components/FilenameModal.svelte** - Input modal for file operations
- Props: `visible`, `title`, `defaultValue`, `placeholder`, `onconfirm`, `oncancel`
- Used for New File, New Folder, and Rename operations
- Auto-focuses and selects input on open
- Enter key confirms, Escape cancels

**components/EditorPane.svelte** - Combined editor/preview pane with toolbar
- Props: `pane`, `mode` ('single' | 'tabs'), `filename`, `content`, `isDirty`, `oncontentchange`
- Mode 'tabs': Renders TabBar, derives content from tabs store (used for left pane)
- Mode 'single': Uses props directly for content (used for right pane/daily notes)
- Toolbar with filename and unsaved indicator (●)
- Edit/View mode toggle buttons
- Shows CodeMirrorEditor in edit mode, MarkdownPreview in view mode
- Tracks focus via focusin/mousedown events
- Exposes: `toggleViewMode()`, `getViewMode()`, `setViewMode()`, `focus()`, `hasFocus()`

**components/TabBar.svelte** - Tab bar for multiple open files
- Props: `ontabchange` (callback when tab changes)
- Renders Tab components from tabsStore
- Shows "No file open" when empty
- role="tablist" for accessibility

**components/Tab.svelte** - Individual tab component
- Props: `tab`, `isActive`, `onclick`, `onclose`
- Displays filename with path tooltip
- Unsaved indicator (●) when dirty
- Close button (×)
- Keyboard accessible (Enter/Space to activate)
- ARIA: role="tab", aria-selected

**components/CodeMirrorEditor.svelte** - CodeMirror 6 wrapper
- Props: `content`, `onchange`, `ondocchange`
- Full CM6 setup with markdown and YAML highlighting
- Dark theme (oneDark), Tab indentation, auto-close brackets
- Line wrapping enabled
- Content sync via $effect (uses isSyncing flag to prevent loops)
- Exposes: `getContent()`, `focus()`, `hasFocus()`

**components/MarkdownPreview.svelte** - Markdown preview
- Props: `content`
- Reactive rendering via $derived
- Collapsible frontmatter section via <details>/<summary>
- Links open in new tabs (target="_blank")
- Collapsible nested lists via <details>/<summary>

**components/PaneResizer.svelte** - Draggable pane divider
- Props: `onresize` (callback with left pane width percentage)
- Drag to resize with visual feedback
- Clamps width between 20% and 80%
- Accessible: role="separator" with ARIA attributes

**components/VaultPicker.svelte** - Vault open/restore UI (Phase 9)
- Props: `onopen` (callback when vault successfully opened)
- Shows "Open Folder" button (always visible)
- Shows "Restore Last Folder" button (only if stored handle exists)
- Auto-checks for stored handle on mount
- Handles permission request for restore flow
- Shows error messages for failures

**components/Sidebar.svelte** - Sidebar container
- Props: `ondateselect` - callback when calendar date is selected
- Exposes: `navigateCalendar(days)` - for keyboard navigation
- Contains Calendar, QuickLinks, QuickFiles, SidebarTabs (Files/Search)

**Svelte 5 Runes Notes:**
- Module-level `$state` works in `.svelte.ts` files - export the object directly
- `$derived` CANNOT be exported from modules - use getter functions instead
- Tests for runes require `.svelte.test.ts` extension
- Use `toEqual` (not `toBe`) when comparing $state values due to proxy objects

**Svelte 5 Testing Notes:**
- Need `svelteTesting()` plugin from `@testing-library/svelte/vite` in vite.config.ts
- happy-dom requires mocks for Web Animations API (`element.animate()`) - see `src/test-setup.ts`
- Modal transition tests are complex in happy-dom - fade transition delays DOM removal
- Action return types are `void | ActionReturn` - use type assertion in tests
- Mock `globalThis.alert` and `globalThis.showOpenFilePicker` in test-setup.ts

**Adding a new external library:**
1. Add `<script>` tag to `index.html` with `onload` and `onerror` handlers:
   ```html
   <script src="https://cdn.example.com/lib.js"
       onload="window.dispatchEvent(new Event('libname-ready'))"
       onerror="console.error('Failed to load LibName from CDN')"></script>
   ```
2. Add entry to `libs` object in `js/dependencies.js`:
   ```javascript
   const libs = {
       // ... existing libs
       LibName: { timeout: 5000 }  // timeout in milliseconds
   };
   ```
3. The library will automatically be awaited by `whenAllReady()` before app init
4. Access the library via `window.LibName` after initialization

### Key Behaviors
- Files clicked in tree open in left pane
- Calendar date clicks open daily notes in right pane
- Daily notes follow `zzz_Daily Notes/YYYY/MM/YYYY-MM-DD.md` structure
- View toggle switches between edit/view modes per pane
- Pane divider is draggable for resizing
- Right-click on files/folders opens context menu (New File, New Folder, Rename, Delete)
- Right-click on empty file tree area creates files/folders in root
- Search tab provides fuzzy tag search; click tag to see files, click file to open
- Tag index builds on directory open and updates on file save/rename/delete
- Quick Files in sidebar; click to open file in left pane
- Quick Files and Quick Links are configurable via modal (stored in vault's `.editor-config.json`)

### Keyboard Shortcuts
All shortcuts are registered via `js/keyboard.js` hook system:
- `Ctrl/Cmd+S` - Save focused pane (or both if neither focused)
- `Ctrl/Cmd+E` - Toggle view mode (edit/view) for focused pane only
- `Ctrl/Cmd+W` - Close current tab (left pane only, Svelte)
- `Ctrl/Cmd+Tab` - Next tab (Svelte)
- `Ctrl/Cmd+Shift+Tab` - Previous tab (Svelte)
- `Meta/Ctrl+←/→` - Navigate to previous/next day (daily notes, right pane focused in Svelte)
- `Meta/Ctrl+↑/↓` - Navigate to previous/next week (daily notes, right pane focused in Svelte)

Daily note navigation modifier is configurable via `dailyNoteNavigation.modifier` in config.
In Svelte 5, daily note navigation shortcuts only trigger when the right (daily note) pane is focused.

### Editor Shortcuts (CodeMirror)
These work when the editor is focused:
- `Tab` - Indent line/selection
- `Shift+Tab` - Dedent line/selection
- `Alt+drag` - Rectangular/column selection
- Type `(`, `[`, `{`, `"`, `'` - Auto-closes with matching character

## Configuration

Settings are managed in `config.js` via the `window.editorConfig` object:
- `obsidianVaultPath` - **Full filesystem path to Obsidian vault** (used by Claude Code workflows to locate note files)
- `dailyNotesFolder` - Root folder name for daily notes (default: `'zzz_Daily Notes'`)
- `autoOpenLastDirectory` - Reopen last used directory on page load (default: `true`)
- `autoOpenTodayNote` - Open today's daily note when opening a directory (default: `true`)
- `dailyNoteNavigation` - Keyboard navigation settings (modifier + arrow keys)
- `restoreLastOpenFile` - Remember and restore last file in left pane (default: `true`)
- `restorePaneWidth` - Remember and restore pane widths after resizing (default: `true`)
- `syncDirectory` - Folder name for docx exports (default: `'zzzz_exports'`)
- `syncTempLimit` - Number of temporary exports to keep before cleanup (default: `7`)
- `defaultQuickLinks` - Default quick links (fallback when no vault config exists)
- `defaultQuickFiles` - Default quick files for left pane tabs (fallback when no vault config exists)
- `quickFilesLimit` - Maximum number of quick file tabs (default: `5`)

Daily note template can be customized in `generateDailyNoteTemplate()` in `js/daily-notes.js`.

## Persistence

- **Directory handle**: Stored in IndexedDB (`mdEditorDB`) to restore the last opened folder
- **Last open file**: Stored in localStorage (`editorLastOpenFile`) as relative path from root
- **Pane width**: Stored in localStorage (`editorPaneWidth`)
- **Temp exports**: Stored in localStorage (`editorTempExports`) as JSON object mapping file paths to timestamps
- **Quick Links/Files**: Stored in vault's `.editor-config.json` file (version controlled with notes)

## Sync / Google Drive Export

Files can be exported to `.docx` format for Google Drive sync by adding a `sync` key to frontmatter:

```yaml
---
sync: permanent   # Always exported, never auto-deleted
sync: temporary   # Exported, older ones cleaned up (keeps syncTempLimit most recent)
sync: delete      # Not exported, removes existing export if present
---
```

### Behavior
- **Daily notes** start with `sync: delete` by default
- When you edit a daily note (add content beyond template), it auto-upgrades to `sync: temporary`
- Exports go to `{syncDirectory}/` preserving original folder structure (e.g., `zzzz_exports/zzz_Daily Notes/2024/12/2024-12-14.docx`)
- Cleanup runs on app start and after each save, keeping only `syncTempLimit` most recent temporary exports
- Markdown is converted to basic docx format (headings, lists, checkboxes, paragraphs)

## Vault Configuration (.editor-config.json)

Quick Links and Quick Files are stored in a `.editor-config.json` file in the vault root. This file is version controlled with your notes and allows per-vault customization.

### File Format
```json
{
    "quickLinks": [
        { "name": "Gmail", "url": "https://mail.google.com" },
        { "name": "Calendar", "url": "https://calendar.google.com" }
    ],
    "quickFiles": [
        { "name": "Todo", "path": "01_Todo.md" },
        { "name": "Notes", "path": "folder/notes.md" }
    ]
}
```

### Behavior
- **On directory open**: Reads `.editor-config.json` if it exists, otherwise uses `config.js` defaults
- **On modal save**: Creates/updates `.editor-config.json` in vault root
- **Fallback**: If vault config is missing or malformed, defaults from `config.js` are used
- **Quick Files paths**: Relative to vault root (e.g., `folder/file.md`)
- **Quick Links URLs**: Full URLs with protocol (e.g., `https://...`)

### Quick Files
- Appear in the sidebar below Quick Links as clickable links
- Click a file to open it in the left pane
- Configure button appears on section hover

### Quick Links
- Appear in the sidebar below the calendar
- Open in new browser tabs
- Configure button appears on section hover

## AI Workflows (Claude Code)

This project uses Claude Code slash commands for AI-assisted workflows that operate on the note files. The browser app stays simple; complex operations are handled via Claude Code conversations.

**Important:** The full path to the Obsidian vault is stored in `config.js` as `obsidianVaultPath`. Always read this config to locate note files rather than searching within the editor project directory.

### Available Slash Commands

Located in `.claude/commands/`:

- `/rollup-monthly` - Summarize the previous month's daily notes into a monthly rollup

### When to Use Slash Commands vs Sub-agents

**Use slash commands** when:
- The workflow follows a defined, repeatable pattern
- Tasks are sequential (read files → process → write output)
- You want a simple trigger for a known operation
- The scope is bounded (e.g., "last month's notes")

**Use sub-agents (Task tool)** when:
- Processing can be parallelized (e.g., summarize 4 weeks simultaneously, then combine)
- The task requires extensive codebase exploration
- You need to delegate specialized subtasks that run independently
- Large scope where batching improves efficiency (100+ files)

**Examples:**
- Monthly rollup: Slash command (sequential read → summarize → write)
- Reorganize all notes by topic: Sub-agents (parallel categorization of different folders)
- Find and fix broken links across vault: Sub-agents (parallel scanning)
- Generate weekly summary: Slash command (bounded scope, sequential)

### Creating New Workflows

1. Create a markdown file in `.claude/commands/` (e.g., `my-workflow.md`)
2. Include clear instructions for what Claude Code should do
3. Document input sources, processing steps, and output location
4. Run with `/my-workflow` in a Claude Code conversation
