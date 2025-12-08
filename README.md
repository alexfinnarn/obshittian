# Minimal MD Editor

A browser-based Markdown editor designed as a lightweight Obsidian alternative. No build process required.

## Features

- **Dual-pane editing**: Work on two documents simultaneously with a resizable split view
- **Daily notes with calendar**: Click any date to create/open a daily note in `YYYY/MM/YYYY-MM-DD.md` format
- **Live preview**: Toggle between edit, split (editor + preview), or preview-only modes per pane
- **Native file access**: Read and write directly to your filesystem (no file copying)
- **File tree navigation**: Browse `.md` and `.txt` files with collapsible folder structure
- **File management**: Right-click context menu to create, rename, and delete files/folders
- **Session persistence**: Remembers your last open file and pane widths between sessions
- **Dark theme**: Easy on the eyes for extended writing sessions

## Usage

1. Open `index.html` in Chrome or Edge (required for File System Access API)
2. Click "Open Folder" and select your notes directory
3. Use the left pane for working documents, right pane for daily notes
4. Click dates in the calendar to navigate daily notes
5. `Ctrl/Cmd+S` saves the currently focused pane

## Layout

```
┌─────────────┬──────────────────┬──────────────────┐
│  Sidebar    │   Left Pane      │   Right Pane     │
│             │   (Working Doc)  │   (Daily Note)   │
│  Calendar   │                  │                  │
│             │                  │                  │
│  File Tree  │                  │                  │
└─────────────┴──────────────────┴──────────────────┘
```

## Daily Notes

Daily notes are stored in a configurable folder (default: `zzz_Daily Notes`) using the structure:

```
zzz_Daily Notes/
  2025/
    01/
      2025-01-15.md
      2025-01-16.md
    12/
      2025-12-05.md
```

New daily notes are created automatically when clicking a date that doesn't have an existing note.

## Browser Support

Full functionality requires Chrome or Edge for the File System Access API. Other browsers will have limited read-only support.

## Configuration

Edit `config.js` to customize behavior:

```javascript
window.editorConfig = {
    dailyNotesFolder: 'zzz_Daily Notes',  // folder for daily notes
    autoOpenLastDirectory: true,           // reopen last folder on load
    autoOpenTodayNote: true,               // open today's note on startup
    restoreLastOpenFile: true,             // remember last working doc
    restorePaneWidth: true,                // remember pane sizes
    dailyNoteNavigation: {
        enabled: true,
        modifier: 'meta'  // 'meta', 'ctrl', 'alt', or 'shift'
    },
    defaultQuickLinks: [                   // quick links shown in header
        { name: 'Gmail', url: 'https://mail.google.com/' },
        { name: 'GitHub', url: 'https://github.com/' }
    ]
};
```

## File Structure

```
index.html         - HTML structure, loads ES modules
style.css          - Dark theme styles
config.js          - User configuration
.github/workflows/ - CI for running tests on PRs
js/
  app.js           - Main entry point, state management
  persistence.js   - IndexedDB & localStorage helpers
  editor.js        - CodeMirror editor setup
  file-tree.js     - File tree building, navigation & context menu
  file-operations.js - File/folder create, rename, delete
  daily-notes.js   - Daily note creation/opening
  ui.js            - View toggles, resizer, keyboard shortcuts
tests/             - Vitest unit tests
```

## Testing

```bash
npm install        # Install dev dependencies
npm test           # Run tests in watch mode
npm run test:run   # Run tests once
```

Tests run automatically on pull requests via GitHub Actions.

## Dependencies

**Runtime (CDN)**
- [marked.js](https://marked.js.org/) - Markdown parsing
- [Pikaday](https://pikaday.com/) - Calendar widget
- [CodeMirror 6](https://codemirror.net/) - Code editor

**Dev (npm)**
- [Vitest](https://vitest.dev/) - Test runner
- [jsdom](https://github.com/jsdom/jsdom) - DOM simulation for tests
