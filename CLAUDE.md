# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A minimal browser-based Markdown editor built as a single HTML file. Designed as a lightweight Obsidian alternative with dual-pane editing and daily notes functionality. Uses the File System Access API to read/write files directly on the user's filesystem.

## Development

No build process required. Open `index.html` directly in Chrome or Edge (required for File System Access API support).

## Architecture

Single-file application (`index.html`) containing:

### HTML Structure
- Sidebar with calendar widget and file tree
- Two independent editor panes (left for working documents, right for daily notes)
- Each pane has its own toolbar with filename, unsaved indicator, and view toggle

### CSS
- Dark theme using CSS custom properties
- Flexbox layout with resizable panes
- Pikaday calendar theme overrides to match dark UI

### JavaScript

**State Management**
- `state` object tracks root directory handle and per-pane state (fileHandle, dirHandle, content, isDirty)
- `elements` object holds DOM references for both panes

**External Libraries**
- `marked.js` (CDN) - Markdown to HTML parsing
- `Pikaday` (CDN) - Calendar widget (see `docs/pikaday.md` for API documentation)

**Core Functions**
- `buildFileTree(dirHandle, parentElement)` - Recursively builds sidebar file tree, filters to `.md`/`.txt` files
- `openFileInPane(fileHandle, parentDirHandle, pane, uiElement)` - Opens a file in specified pane ('left' or 'right')
- `openDailyNote(date)` - Creates/opens daily note for given date in right pane
- `getOrCreateDirectory(parentHandle, name)` - Helper for creating nested folder structure
- `generateDailyNoteTemplate(date)` - Returns default content for new daily notes
- `savePane(pane)` - Saves content of specified pane to filesystem

**Key Behaviors**
- Files clicked in tree open in left pane
- Calendar date clicks open daily notes in right pane
- Daily notes follow `zzz_Daily Notes/YYYY/MM/YYYY-MM-DD.md` structure
- `Ctrl/Cmd+S` saves the focused pane (or both if neither focused)
- View toggle switches between edit/split/preview modes per pane
- Pane divider is draggable for resizing

## Configuration

Configurable values in the `state` object:
- `dailyNotesFolder` - Root folder name for daily notes (default: `'zzz_Daily Notes'`)

Daily note template can be customized in `generateDailyNoteTemplate()`.
