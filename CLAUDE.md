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
- `utils/*.test.ts` - Utility function tests (tags, markdown, dailyNotes, fileOperations)

### E2E Tests
Playwright tests are in `tests/e2e/` and test real browser interactions:
- `editor.spec.ts` - Editor pane behavior
- `file-tree.spec.ts` - File tree and context menu
- `sidebar.spec.ts` - Sidebar components
- `todos.spec.ts` - Todo list component
- `vault-picker.spec.ts` - Vault open/restore flow

Test fixtures are in `tests/data/testing-files/` with sample markdown files.

## Architecture

For detailed documentation on the architecture layers, see:
- [Services](docs/architecture/services.md) - Orchestration and side effects
- [State Management](docs/architecture/state-management.md) - Svelte 5 stores and persistence
- [Events](docs/architecture/events.md) - Event bus and cross-component communication
- [Actions](docs/architecture/actions.md) - Svelte actions for DOM behavior (shortcuts, click-outside)

### File Structure
```
src/
  App.svelte           - Root component (layout shell: sidebar + dual-pane editor)
  main.ts              - Entry point
  app.css              - Global CSS reset
  global.d.ts          - Type declarations for File System Access API
  lib/
    stores/
      vault.svelte.ts      - Vault state (rootDirHandle, dailyNotesFolder)
      settings.svelte.ts   - User preferences (autoOpen, restore, limits)
      vaultConfig.svelte.ts - Quick links/files from .editor-config.json
      editor.svelte.ts     - Dual-pane editor state with focus tracking
      tabs.svelte.ts       - Tabs management for left pane
      tags.svelte.ts       - Tag index state with localStorage persistence
      shortcuts.svelte.ts  - Shortcut blocking contexts for modal awareness
      todos.svelte.ts      - Global todo list with vault file persistence
    config.ts            - Editor configuration (keyboard shortcuts, defaults)
    types/
      tabs.ts              - Tab interface and createTab function
      todos.ts             - Todo types, status labels, and createTodo function
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
      TodoList.svelte      - Global todo list component (above right pane editor)
    actions/
      clickOutside.ts      - Svelte action for detecting clicks outside element
      shortcut.ts          - Svelte action for declarative keyboard shortcuts
    services/
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
public/                  - Static assets
index.html               - Vite entry point
vite.config.ts           - Vite configuration
svelte.config.js         - Svelte configuration
playwright.config.ts     - Playwright E2E test configuration
.github/
  workflows/
    test.yml             - GitHub Actions workflow for PR testing
.claude/
  commands/              - Claude Code slash commands
docs/                    - Documentation (see architecture/ for design docs)
scripts/                 - Utility scripts
```

### Stores (src/lib/stores/)

**vault.svelte.ts** - Vault state management
- `vault` - Reactive state object with `rootDirHandle`, `dailyNotesFolder`
- `getIsVaultOpen()` - Returns whether a vault is open (getter function, not $derived export)
- `openVault(handle)` - Set the root directory handle
- `closeVault()` - Clear the vault state
- `updateVaultConfig(config)` - Update dailyNotesFolder

**settings.svelte.ts** - User preferences
- `settings` - Reactive state with autoOpen, restore, quickFiles limits, shortcuts
- `updateSettings(partial)` - Update specific settings (deep merges shortcuts)
- `resetSettings()` - Reset to defaults
- `loadSettings()` / `saveSettings()` - localStorage persistence
- `getShortcut(name)` - Get a specific keyboard shortcut binding

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

**shortcuts.svelte.ts** - Shortcut blocking contexts
- `shortcutsStore` - Reactive state with `blockedBy: Set<string>`
- `blockShortcuts(reason)` - Block shortcuts, returns unblock function
- `areShortcutsBlocked()` - Check if any blockers are active
- `getBlockingReasons()` - Get list of current blocking reasons
- `clearAllBlocks()` - Remove all blockers (for testing)

**todos.svelte.ts** - Global todo list
- `todosStore` - Reactive state with `todos: Todo[]`, `isLoading`, `showCompleted`
- `getTodos()` - Get all todos
- `getTodosByStatus(status)` - Filter todos by status
- `getActiveTodos()` / `getCompletedTodos()` - Filter by completion state
- `getVisibleTodos()` - Get todos respecting showCompleted setting
- `addTodo(text, status?)` - Add new todo (auto-saves)
- `removeTodo(id)` - Remove todo by ID (auto-saves)
- `updateTodoText(id, text)` - Update text (auto-saves)
- `updateTodoStatus(id, status)` - Update status (auto-saves)
- `resetTodos()` - Clear state (for testing)
- `loadTodos()` / `saveTodos()` - Vault file persistence (`data/todos.json`)
- `setShowCompleted(show)` / `loadShowCompleted()` - localStorage for UI preference

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
- Typed events: `file:open`, `file:save`, `file:created`, `file:renamed`, `file:deleted`, `dailynote:open`, `tree:refresh`, `modal:open`, `modal:close`, `tags:reindex`, `pane:toggleView`, `calendar:navigate`

**dailyNotes.ts** - Daily note utilities
- `formatDailyNotePath(date)` - Returns `{ year, month, day, filename }` for path construction
- `generateDailyNoteTemplate(date)` - Creates default template
- `getDailyNoteRelativePath(folder, date)` - Returns full relative path
- `getOrCreateDailyNote(rootHandle, folder, date)` - Opens or creates daily note

**tags.ts** - Tag indexing and fuzzy search
- `extractTags(content)` - Extract tags from frontmatter (YAML array, list, or comma-separated)
- `buildTagIndex(rootDirHandle)` - Scan directory and build tag index
- `searchTags(query)` - Fuzzy search tags using Fuse.js
- `getAllTags()` - Get all tags sorted by count descending
- `updateFileInIndex(path, content)` - Update tags for a file (on save)
- `removeFileFromIndex(path)` - Remove file from index (on delete)

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

### Services (src/lib/services/)

**fileOpen.ts** - File opening operations
- `loadFile(relativePath)` - Load file by path, returns handles + content
- `openFileInTabs(path, openInNewTab)` - Open file in left pane tabs
- `openFileInSinglePane(path, pane)` - Open file in specified pane (single mode)
- `openDailyNote(date)` - Create/open daily note in right pane

**fileSave.ts** - File saving with side effects
- `saveFile(pane)` - Save file in specified pane (left uses tabs, right uses editor store)
- Handles: dirty state, tag index updates

**shortcutHandlers.ts** - Handler functions for keyboard shortcuts
- `handleSave()` - Save focused pane or both if none focused
- `handleToggleView()` - Emit `pane:toggleView` event for focused pane
- `handleCloseTab()` - Close current tab (left pane focused only)
- `handleNextTab()` / `handlePrevTab()` - Cycle through tabs
- `createCalendarNavigator(days)` - Create handler that emits `calendar:navigate`

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

**EditorPane.svelte** - Combined editor/preview pane with toolbar
- Props: `pane`, `mode` ('single' | 'tabs'), `filename`, `content`, `isDirty`, `oncontentchange`
- Mode 'tabs': Renders TabBar, derives content from tabs store (used for left pane)
- Mode 'single': Uses props directly for content (used for right pane/daily notes)
- Listens for `pane:toggleView` events to toggle edit/view mode
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

**TodoList.svelte** - Global todo list
- Renders in right pane above the editor (150px fixed height)
- Add todos via input field (Enter or click button)
- Double-click todo text to edit
- Status dropdown with Kanban-like workflow: New → Backlog → Todo → In Progress → In Review → Complete
- Show/hide completed toggle
- Delete with confirmation dialog
- Auto-saves to `data/todos.json` on every change

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
- Todo list sits above right pane editor with Kanban-like status workflow

## Keyboard Shortcuts

Shortcuts are configurable in `src/lib/config.ts`. Default bindings:

- `Cmd/Ctrl+S` - Save focused pane (or both if neither focused)
- `Cmd/Ctrl+E` - Toggle view mode (edit/view) for focused pane only
- `Cmd/Ctrl+W` - Close current tab (left pane only)
- `Cmd/Ctrl+Tab` - Next tab
- `Cmd/Ctrl+Shift+Tab` - Previous tab
- `Cmd/Ctrl+Arrow` - Navigate daily notes (right pane focused)

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

- **Directory handle**: Stored in IndexedDB (`mdEditorDB`) to restore the last opened folder
- **Last open file**: Stored in localStorage (`editorLastOpenFile`) as relative path from root
- **Pane width**: Stored in localStorage (`editorPaneWidth`)
- **Tag index**: Stored in localStorage with staleness tracking
- **Settings/Shortcuts**: Stored in localStorage (`editorSettings`), overrides `config.ts` defaults
- **Quick Links/Files**: Stored in vault's `.editor-config.json` file
- **Todos**: Stored in vault's `data/todos.json` file (user content, not config)
- **Show completed toggle**: Stored in localStorage (`todosShowCompleted`)

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
