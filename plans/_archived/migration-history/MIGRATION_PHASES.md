# Svelte 5 Migration - Phase Overview

This document tracks the overall migration progress. Each phase is designed to be completed in a single conversation.

## Workflow

**Agile approach**: Don't plan too far ahead. Each phase may reveal unexpected challenges or better approaches that affect later phases.

### Per-Phase Process

1. **Before starting a phase**: Review/create the detailed phase plan (`phase-XX-*.md`)
2. **During the phase**: Complete all tasks, make notes about learnings
3. **After completing a phase**:
   - Update this tracker (status, notes)
   - Update `CLAUDE.md` if architecture/commands changed
   - Update `README.md` if user-facing features changed
   - Create the next phase's detailed plan based on lessons learned
4. **Only then**: Start the next phase

### Why This Works

- Earlier phases inform later ones (no wasted planning)
- Documentation stays current with actual implementation
- Each conversation has clear scope and deliverables

---

## Progress Tracker

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 1 | Project Setup | Complete | TypeScript from start, happy-dom for tests, minimal CSS reset |
| 2 | App Shell & Stores | Complete | Module-level $state works, $derived cannot be exported (use getter functions), File System Access API types built into TypeScript |
| 3 | Sidebar Components | Complete | Modal, ContextMenu, QuickLinks, QuickFiles, Sidebar components with tests. Event bus for cross-component communication. Added global.d.ts for File System Access API types. |
| 4 | File Tree | Complete | FileTree with recursive FileTreeItem, FilenameModal for create/rename. Modern Svelte 5 pattern: import component itself instead of `<svelte:self>`. Event bus extended with file:created/renamed/deleted events. |
| 5 | Editor Core | Complete | CodeMirror 6 editor with markdown/YAML highlighting, MarkdownPreview with collapsible frontmatter, EditorPane with edit/view toggle, PaneResizer for resizing, editor store with focus tracking, keyboard shortcuts (Cmd+S/E). Used $state for component refs. |
| 6 | Tabs System | Complete | Tabs store with Tab/TabBar components, EditorPane supports 'single' and 'tabs' modes. Left pane uses tabs, right pane stays single-file for daily notes. "Open in Tab" context menu disabled at 5-tab limit. Keyboard shortcuts: Cmd+W (close tab), Cmd+Tab/Cmd+Shift+Tab (navigate tabs). Tab persistence to localStorage. |
| 7 | Calendar & Daily Notes | Complete | Pikaday npm package with class mock for tests. Daily note keyboard navigation (Cmd+Arrow) only when right pane focused. Calendar triggers `dailynote:open` event. |
| 8 | Search & Tags | Complete | Fuse.js for fuzzy search. Tags store with localStorage persistence (only reindexes when needed). SidebarTabs component for Files/Search toggle. Tag index updates on file save/rename/delete. `tags:reindex` event with metadata payload. 47 new tests. |
| 9 | Sync & Persistence | Complete | VaultPicker for first-time open, auto-restore vault on load. Sync exports keep markdown format (no docx conversion). Daily notes auto-upgrade from `sync: delete` to `sync: temporary` when edited. Tab and last-file persistence via $effect. Added FileSystemHandle.requestPermission to global.d.ts. 26 new tests (426 total). |
| 10 | Testing & Cleanup | Complete | Playwright E2E tests with mock filesystem (VITE_E2E_TEST env var). 56 E2E tests passing, 10 skipped (modal timing issues). Mock filesystem enables full E2E testing without real File System Access API user interaction. Removed debugging console.logs. Total: 426 unit tests + 56 E2E tests. |

---

## Phase Summaries

### Phase 1: Project Setup
Initialize Vite + Svelte 5 project alongside existing code. Configure build, port global CSS, set up test infrastructure.

### Phase 2: App Shell & Stores
Create App.svelte layout shell, implement global stores (vault, settings), port filesystem utilities.

### Phase 3: Sidebar Components
Build Sidebar container, QuickLinks, QuickFiles, base Modal component, and ContextMenu.

### Phase 4: File Tree
Implement FileTree and FileTreeItem components with recursive rendering, file operations, and context menu integration.

### Phase 5: Editor Core
Create CodeMirror wrapper, MarkdownPreview component, and EditorPane in single-file mode.

### Phase 6: Tabs System
Add TabBar and Tab components, implement EditorPane tabs mode, wire up dual-pane layout.

### Phase 7: Calendar & Daily Notes
Pikaday calendar wrapper, daily note creation/opening logic, keyboard navigation.

### Phase 8: Search & Tags
Port tag indexing logic, create TagSearch component, integrate Fuse.js.

### Phase 9: Sync & Persistence
Docx export functionality, localStorage/IndexedDB persistence, global keyboard shortcuts.

### Phase 10: Testing & Cleanup
Adapt E2E tests, add component tests, final integration testing, remove old vanilla JS (optional).

---

## Key Decisions

- **Framework**: Vite + Svelte 5 (not SvelteKit)
- **TypeScript**: From the start (provides better refactoring support)
- **Testing**: Vitest with happy-dom, E2E tests stay in root `tests/e2e/`
- **CSS**: Minimal reset, add styling incrementally (no old CSS port)
- **Node**: Requires Node 22.12+ (set in package.json engines)
- **Migration Style**: Build new app alongside existing, breaking changes OK during phases

---

## Running Both Versions

During migration, both versions will coexist:
- **Vanilla JS**: Open `index.html` directly in browser
- **Svelte**: Run `npm run dev` from `svelte-app/` directory

Once migration is complete and tested, the Svelte build can replace the vanilla version.

---

## Documentation Updates

After each phase, update documentation to reflect changes:

### CLAUDE.md
- New file structure (if files added/moved)
- New modules and their responsibilities
- Changed commands or workflows
- Updated architecture diagrams

### README.md
- New user-facing features
- Changed usage instructions
- Updated keyboard shortcuts
- New configuration options

Keep documentation in sync with implementation - don't let it drift.
