# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A minimal browser-based Markdown editor with dual-pane editing and daily notes functionality. Designed as a lightweight Obsidian alternative. Uses the File System Access API to read/write files directly on the user's filesystem.

## Development

No build process required. Open `index.html` directly in Chrome or Edge (required for File System Access API support).

## Architecture

### File Structure
```
index.html       - HTML structure only, loads ES modules
style.css        - Dark theme styles
config.js        - User configuration (window.editorConfig)
js/
  app.js         - Main entry point, state management, initialization
  persistence.js - IndexedDB & localStorage helpers
  editor.js      - CodeMirror editor setup
  file-tree.js   - File tree building & navigation
  daily-notes.js - Daily note creation/opening
  ui.js          - View toggles, pane resizer, keyboard shortcuts
```

### HTML Structure (index.html)
- Sidebar with calendar widget and file tree
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
- Initializes editors, calendar, and all event handlers
- Orchestrates other modules

**js/persistence.js** - Storage helpers
- `saveDirectoryHandle(handle)` / `getDirectoryHandle()` - IndexedDB for directory handle
- `saveLastOpenFile(path)` / `getLastOpenFile()` - localStorage for last file
- `savePaneWidth(width)` / `getPaneWidth()` - localStorage for pane width

**js/editor.js** - CodeMirror setup
- `createEditor(CM, container, pane, state, elements)` - Creates CodeMirror instance with dark theme

**js/file-tree.js** - File navigation
- `buildFileTree(dirHandle, parentElement, openFileInPane, state)` - Recursively builds sidebar tree
- `getRelativePath(rootDirHandle, fileHandle)` - Gets relative path from root
- `openFileByPath(relativePath, pane, state, openFileInPane)` - Opens file by path
- `openFileInPane(fileHandle, parentDirHandle, pane, state, elements, uiElement)` - Opens file in pane

**js/daily-notes.js** - Daily notes
- `openDailyNote(date, state, openFileInPane)` - Creates/opens daily note
- `setupDailyNoteNavigation(config, picker, openDailyNote)` - Keyboard navigation

**js/ui.js** - UI functionality
- `savePane(pane, state, elements)` - Saves pane content to filesystem
- `setupKeyboardShortcuts(state, elements)` - Ctrl/Cmd+S handling
- `setupViewToggle(elements)` - Edit/Split/Preview toggle
- `setupPaneResizer()` - Draggable pane divider
- `restorePaneWidth(config)` - Restore saved width

**External Libraries (CDN)**
- `marked.js` - Markdown to HTML parsing
- `Pikaday` - Calendar widget (see `docs/pikaday.md` for API)
- `CodeMirror 6` - Code editor with markdown support

### Key Behaviors
- Files clicked in tree open in left pane
- Calendar date clicks open daily notes in right pane
- Daily notes follow `zzz_Daily Notes/YYYY/MM/YYYY-MM-DD.md` structure
- `Ctrl/Cmd+S` saves the focused pane (or both if neither focused)
- View toggle switches between edit/split/preview modes per pane
- Pane divider is draggable for resizing

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
