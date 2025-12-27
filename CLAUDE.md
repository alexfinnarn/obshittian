# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A minimal browser-based Markdown editor with dual-pane editing and daily notes functionality. Designed as a lightweight Obsidian alternative. Uses the File System Access API to read/write files directly on the user's filesystem.

Built with Svelte 5, TypeScript, and Vite.

## Development

```bash
npm install           # Install dependencies (requires Node 22+)
npm run dev           # Start dev server at localhost:5173
npm run build         # Production build to dist/
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

Tests run automatically on pull requests to `main` via GitHub Actions (`.github/workflows/test.yml`).

### Unit Tests
Tests use Vitest with happy-dom. Unit tests are colocated with source files in `src/lib/`:
- `stores/*.svelte.test.ts` - Store tests (vault, settings, editor, tabs, tags)
- `utils/*.test.ts` - Utility function tests (tags, sync, markdown, dailyNotes, fileOperations)

### E2E Tests
Playwright tests are in `tests/e2e/` and test real browser interactions:
- `editor.spec.ts` - Editor pane behavior
- `file-tree.spec.ts` - File tree and context menu
- `sidebar.spec.ts` - Sidebar components
- `vault-picker.spec.ts` - Vault open/restore flow

Test fixtures are in `tests/data/testing-files/` with sample markdown files.

## Architecture

### File Structure
```
src/
  App.svelte           - Root component (layout shell: sidebar + dual-pane editor)
  main.ts              - Entry point
  app.css              - Global CSS reset
  global.d.ts          - Type declarations for File System Access API
  lib/
    stores/
      vault.svelte.ts      - Vault state (rootDirHandle, dailyNotesFolder, syncDirectory)
      settings.svelte.ts   - User preferences (autoOpen, restore, limits)
      vaultConfig.svelte.ts - Quick links/files from .editor-config.json
      editor.svelte.ts     - Dual-pane editor state with focus tracking
      tabs.svelte.ts       - Tabs management for left pane
      tags.svelte.ts       - Tag index state with localStorage persistence
    types/
      tabs.ts              - Tab interface and createTab function
    components/
      Sidebar.svelte       - Container for calendar, quick links/files, tabbed file tree/search
      SidebarTabs.svelte   - Files/Search tab toggle
      TagSearch.svelte     - Tag search input and results
      Calendar.svelte      - Pikaday calendar wrapper with dark theme
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
    actions/
      clickOutside.ts      - Svelte action for detecting clicks outside element
    utils/
      eventBus.ts       - Pub/sub for cross-component communication
      dailyNotes.ts     - Daily note path formatting, template, create/open
      tags.ts           - Tag extraction, indexing, Fuse.js search
      sync.ts           - Sync export utilities, daily note auto-upgrade
      fileOperations.ts - File/folder create, rename, delete, sorting
      filesystem.ts     - IndexedDB & localStorage helpers
      frontmatter.ts    - YAML frontmatter parsing
      markdown.ts       - Marked.js configuration and rendering
tests/
  data/
    testing-files/       - E2E test fixtures (sample markdown files)
  e2e/
    *.spec.ts            - Playwright E2E tests
public/                  - Static assets
config.js                - User configuration (NOTE: settings persistence needs work, see below)
index.html               - Vite entry point
vite.config.ts           - Vite configuration
svelte.config.js         - Svelte configuration
playwright.config.ts     - Playwright E2E test configuration
.github/
  workflows/
    test.yml             - GitHub Actions workflow for PR testing
.claude/
  commands/              - Claude Code slash commands
docs/                    - Documentation
scripts/                 - Utility scripts
```

### Stores (src/lib/stores/)

**vault.svelte.ts** - Vault state management
- `vault` - Reactive state object with `rootDirHandle`, `dailyNotesFolder`, `syncDirectory`
- `getIsVaultOpen()` - Returns whether a vault is open (getter function, not $derived export)
- `openVault(handle)` - Set the root directory handle
- `closeVault()` - Clear the vault state
- `updateVaultConfig(config)` - Update dailyNotesFolder/syncDirectory

**settings.svelte.ts** - User preferences
- `settings` - Reactive state with autoOpen, restore, sync/quickFiles limits
- `updateSettings(partial)` - Update specific settings
- `resetSettings()` - Reset to defaults
- `loadSettings()` / `saveSettings()` - localStorage persistence

**vaultConfig.svelte.ts** - Vault-specific configuration
- `vaultConfig` - Reactive state with quickLinks, quickFiles arrays
- `getQuickLinks()` / `setQuickLinks(links)` - Get/set quick links
- `getQuickFiles()` / `setQuickFiles(files)` - Get/set quick files
- `loadVaultConfig(handle, defaults)` - Load from .editor-config.json
- `saveVaultConfig()` - Save to .editor-config.json
- `resetVaultConfig()` - Clear to defaults

**editor.svelte.ts** - Dual-pane editor state
- `editor` - Reactive state with left/right pane state and focusedPane
- `PaneState` - fileHandle, dirHandle, content, isDirty, relativePath
- `openFileInPane(pane, fileHandle, dirHandle, content, path)` - Open file
- `updatePaneContent(pane, content)` - Update content and mark dirty
- `markPaneDirty(pane)` / `markPaneClean(pane, content?)` - Dirty state
- `closePaneFile(pane)` - Clear pane state
- `setFocusedPane(pane)` / `getFocusedPane()` - Focus tracking

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

### Utilities (src/lib/utils/)

**filesystem.ts** - Storage helpers
- `saveDirectoryHandle(handle)` / `getDirectoryHandle()` - IndexedDB for vault handle
- `saveLastOpenFile(path)` / `getLastOpenFile()` - localStorage
- `savePaneWidth(width)` / `getPaneWidth()` - localStorage
- `getOrCreateDirectory(parent, name)` - Create directory if needed
- `readFileContent(fileHandle)` / `writeFileContent(fileHandle, content)` - File I/O

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
- Typed events: `file:open`, `file:save`, `file:created`, `file:renamed`, `file:deleted`, `dailynote:open`, `tree:refresh`, `modal:open`, `modal:close`, `tags:reindex`

**dailyNotes.ts** - Daily note utilities
- `formatDailyNotePath(date)` - Returns `{ year, month, day, filename }` for path construction
- `generateDailyNoteTemplate(date)` - Creates default template with `sync: delete` frontmatter
- `getDailyNoteRelativePath(folder, date)` - Returns full relative path
- `getOrCreateDailyNote(rootHandle, folder, date)` - Opens or creates daily note

**tags.ts** - Tag indexing and fuzzy search
- `extractTags(content)` - Extract tags from frontmatter (YAML array, list, or comma-separated)
- `buildTagIndex(rootDirHandle)` - Scan directory and build tag index
- `searchTags(query)` - Fuzzy search tags using Fuse.js
- `getAllTags()` - Get all tags sorted by count descending
- `updateFileInIndex(path, content)` - Update tags for a file (on save)
- `removeFileFromIndex(path)` - Remove file from index (on delete)

**sync.ts** - Sync export utilities
- `SYNC_MODES` - Constants: `permanent`, `temporary`, `delete`
- `getSyncMode(content)` - Extract sync mode from frontmatter
- `isDailyNote(relativePath, dailyNotesFolder)` - Check if path is in daily notes folder
- `isDailyNoteModified(content, date)` - Compare content to default template
- `processSync(relativePath, content, rootHandle, syncDirectory)` - Export markdown to sync directory
- `cleanupTempExports(rootHandle, syncDirectory, limit)` - Remove old temporary exports

**fileOperations.ts** - File system operations
- `writeToFile(fileHandle, content)` - Write content to file
- `createFile(parentDirHandle, filename)` - Create new file
- `createFolder(parentDirHandle, folderName)` - Create new folder
- `renameFile(dirHandle, oldName, newName)` - Rename file (copy + delete)
- `renameFolder(parentDirHandle, oldName, newName)` - Rename folder recursively
- `deleteEntry(parentDirHandle, name, isDirectory)` - Delete file or folder
- `getRelativePath(rootDirHandle, fileHandle)` - Get path from root to file
- `sortEntries(entries)` - Sort folders first, then alphabetically
- `getVisibleEntries(dirHandle)` - Get sorted, filtered entries

### Components (src/lib/components/)

**Modal.svelte** - Base modal component
- Props: `visible`, `title`, `onclose`
- Snippets: `children` (content), `footer` (buttons)
- Features: backdrop click to close, Escape key, fade transition

**ContextMenu.svelte** - Positioned context menu
- Props: `visible`, `x`, `y`, `items`, `onclose`
- Features: viewport boundary detection, click-outside to close
- MenuItem: `{ label, action, disabled?, separator? }`

**FileTree.svelte** - File tree with context menu
- Watches `vault.rootDirHandle` for changes
- Context menu: Open in Tab, New File, New Folder, Rename, Delete
- Emits events: `file:open`, `file:created`, `file:renamed`, `file:deleted`
- Listens for `tree:refresh` to reload entries

**EditorPane.svelte** - Combined editor/preview pane with toolbar
- Props: `pane`, `mode` ('single' | 'tabs'), `filename`, `content`, `isDirty`, `oncontentchange`
- Mode 'tabs': Renders TabBar, derives content from tabs store (used for left pane)
- Mode 'single': Uses props directly for content (used for right pane/daily notes)
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

## Keyboard Shortcuts

- `Ctrl/Cmd+S` - Save focused pane (or both if neither focused)
- `Ctrl/Cmd+E` - Toggle view mode (edit/view) for focused pane only
- `Ctrl/Cmd+W` - Close current tab (left pane only)
- `Ctrl/Cmd+Tab` - Next tab
- `Ctrl/Cmd+Shift+Tab` - Previous tab
- `Meta/Ctrl+Arrow` - Navigate daily notes (right pane focused)

### Editor Shortcuts (CodeMirror)
- `Tab` - Indent line/selection
- `Shift+Tab` - Dedent line/selection
- `Alt+drag` - Rectangular/column selection
- Type `(`, `[`, `{`, `"`, `'` - Auto-closes with matching character

## Configuration

**TODO:** The settings persistence from `config.js` needs to be integrated with the Svelte stores. Currently `config.js` exists but its values aren't fully wired to the application. This should be addressed in a future issue.

Current `config.js` options (not yet fully integrated):
- `obsidianVaultPath` - Full filesystem path to Obsidian vault (used by Claude Code workflows)
- `dailyNotesFolder` - Root folder name for daily notes (default: `'zzz_Daily Notes'`)
- `syncDirectory` - Folder name for docx exports (default: `'zzzz_exports'`)
- `defaultQuickLinks` / `defaultQuickFiles` - Default fallbacks for vault config

## Persistence

- **Directory handle**: Stored in IndexedDB (`mdEditorDB`) to restore the last opened folder
- **Last open file**: Stored in localStorage (`editorLastOpenFile`) as relative path from root
- **Pane width**: Stored in localStorage (`editorPaneWidth`)
- **Tag index**: Stored in localStorage with staleness tracking
- **Quick Links/Files**: Stored in vault's `.editor-config.json` file

## Sync / Google Drive Export

Files can be exported to `.docx` format for Google Drive sync by adding a `sync` key to frontmatter:

```yaml
---
sync: permanent   # Always exported, never auto-deleted
sync: temporary   # Exported, older ones cleaned up
sync: delete      # Not exported, removes existing export if present
---
```

### Behavior
- **Daily notes** start with `sync: delete` by default
- When you edit a daily note (add content beyond template), it auto-upgrades to `sync: temporary`
- Exports go to `{syncDirectory}/` preserving original folder structure
- Cleanup runs after each save, keeping only the most recent temporary exports

## Vault Configuration (.editor-config.json)

Quick Links and Quick Files are stored in a `.editor-config.json` file in the vault root.

```json
{
    "quickLinks": [
        { "name": "Gmail", "url": "https://mail.google.com" }
    ],
    "quickFiles": [
        { "name": "Todo", "path": "01_Todo.md" }
    ]
}
```

## AI Workflows (Claude Code)

This project uses Claude Code slash commands for AI-assisted workflows that operate on the note files.

**Important:** The full path to the Obsidian vault is stored in `config.js` as `obsidianVaultPath`. Always read this config to locate note files rather than searching within the editor project directory.

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
