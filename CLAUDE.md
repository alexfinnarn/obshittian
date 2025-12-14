# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A minimal browser-based Markdown editor with dual-pane editing and daily notes functionality. Designed as a lightweight Obsidian alternative. Uses the File System Access API to read/write files directly on the user's filesystem.

## Development

No build process required. Open `index.html` directly in Chrome or Edge (required for File System Access API support).

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

#### E2E Tests
Playwright tests are in `tests/e2e/` and test real browser interactions:
- `app.spec.js` - UI elements, view toggles, modals, quick links

Test fixtures for E2E tests are in `tests/data/testing-files/` with sample markdown files and daily notes structure.

## Architecture

### File Structure
```
index.html           - HTML structure only, loads ES modules
style.css            - Dark theme styles
config.js            - User configuration (window.editorConfig)
playwright.config.js - Playwright E2E test configuration
.github/
  workflows/
    test.yml         - GitHub Actions workflow for PR testing
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
```

### HTML Structure (index.html)
- Sidebar with calendar widget, quick links, and tabbed file tree/search
- Tabbed sidebar section: Files tab (file tree) and Search tab (tag search)
- Two independent editor panes (left for working documents, right for daily notes)
- Each pane has its own toolbar with filename, unsaved indicator, and view toggle

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
- Configured libraries: `CM` (CodeMirror), `Pikaday`, `marked`, `Fuse`
- Each library has a configurable timeout (default 5-10 seconds)

**js/persistence.js** - Storage helpers
- `saveDirectoryHandle(handle)` / `getDirectoryHandle()` - IndexedDB for directory handle
- `saveLastOpenFile(path)` / `getLastOpenFile()` - localStorage for last file
- `savePaneWidth(width)` / `getPaneWidth()` - localStorage for pane width

**js/editor.js** - CodeMirror setup
- `createEditor(CM, container, pane, state, elements)` - Creates CodeMirror instance with dark theme

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
- `generateDailyNoteTemplate(date)` - Creates default template for new daily notes
- `getOrCreateDirectory(parentHandle, name)` - Gets or creates a directory
- `openDailyNote(date, state, openFileInPane)` - Creates/opens daily note
- `registerDailyNoteShortcuts(config, picker, openDailyNote)` - Registers navigation shortcuts with keyboard hook

**js/ui.js** - UI functionality
- `savePane(pane, state, elements)` - Saves pane content to filesystem
- `registerUIShortcuts(state, elements)` - Registers Ctrl/Cmd+S (save) and Ctrl/Cmd+E (cycle view) with keyboard hook
- `setupViewToggle(elements)` - Edit/Split/Preview toggle button click handlers
- `getCurrentViewMode(pane)` - Returns current view mode ('edit', 'split', or 'preview') for a pane
- `setViewMode(pane, view, elements)` - Sets view mode for a pane
- `cycleViewMode(pane, elements)` - Cycles to next view mode (edit → split → preview → edit)
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

**External Libraries (CDN)**

Libraries are loaded via CDN in `index.html` and managed by `js/dependencies.js`:
- `marked.js` - Markdown to HTML parsing (customized via `js/marked-config.js`)
- `Pikaday` - Calendar widget (see `docs/pikaday.md` for API)
- `CodeMirror 6` - Code editor with markdown support (ES modules via esm.sh)
- `Fuse.js` - Fuzzy search library for tag search

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
- View toggle switches between edit/split/preview modes per pane
- Pane divider is draggable for resizing
- Right-click on files/folders opens context menu (New File, New Folder, Rename, Delete)
- Right-click on empty file tree area creates files/folders in root
- Search tab provides fuzzy tag search; click tag to see files, click file to open
- Tag index builds on directory open and updates on file save/rename/delete

### Keyboard Shortcuts
All shortcuts are registered via `js/keyboard.js` hook system:
- `Ctrl/Cmd+S` - Save focused pane (or both if neither focused)
- `Ctrl/Cmd+E` - Cycle view mode (edit → split → preview) for focused pane
- `Meta/Ctrl+←/→` - Navigate to previous/next day (daily notes)
- `Meta/Ctrl+↑/↓` - Navigate to previous/next week (daily notes)

Daily note navigation modifier is configurable via `dailyNoteNavigation.modifier` in config.

## Configuration

Settings are managed in `config.js` via the `window.editorConfig` object:
- `dailyNotesFolder` - Root folder name for daily notes (default: `'zzz_Daily Notes'`)
- `autoOpenLastDirectory` - Reopen last used directory on page load (default: `true`)
- `autoOpenTodayNote` - Open today's daily note when opening a directory (default: `true`)
- `dailyNoteNavigation` - Keyboard navigation settings (modifier + arrow keys)
- `restoreLastOpenFile` - Remember and restore last file in left pane (default: `true`)
- `restorePaneWidth` - Remember and restore pane widths after resizing (default: `true`)

Daily note template can be customized in `generateDailyNoteTemplate()` in `js/daily-notes.js`.

## Persistence

- **Directory handle**: Stored in IndexedDB (`mdEditorDB`) to restore the last opened folder
- **Last open file**: Stored in localStorage (`editorLastOpenFile`) as relative path from root
- **Pane width**: Stored in localStorage (`editorPaneWidth`)
