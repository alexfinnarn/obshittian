# Phase 7: Calendar & Daily Notes

## Goal
Implement the Pikaday calendar widget in the sidebar and add daily note creation/opening functionality. Clicking a date opens (or creates) that day's note in the right pane.

## Prerequisites
- Phase 6 complete (Tabs system, left/right pane architecture)

## Tasks

### 7.1 Install Pikaday Package

Add Pikaday to npm dependencies:

```bash
cd svelte-app
npm install pikaday
```

Note: Pikaday includes both JS and CSS. We'll import the CSS and override styles for dark theme.

### 7.2 Create Daily Notes Utilities

Create `src/lib/utils/dailyNotes.ts`:

```typescript
import { getOrCreateDirectory, writeFileContent } from './filesystem';
import type { FileSystemDirectoryHandle, FileSystemFileHandle } from '../global';

/**
 * Format a date into daily note path components.
 * Returns path structure: zzz_Daily Notes/YYYY/MM/YYYY-MM-DD.md
 */
export function formatDailyNotePath(date: Date): {
  year: string;
  month: string;
  day: string;
  filename: string;
} {
  const year = date.getFullYear().toString();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const filename = `${year}-${month}-${day}.md`;
  return { year, month, day, filename };
}

/**
 * Generate default template for a new daily note.
 * Includes sync: delete frontmatter (auto-upgrades to temporary when edited).
 */
export function generateDailyNoteTemplate(date: Date): string {
  const { year, month, day } = formatDailyNotePath(date);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

  return `---
sync: delete
---

# ${year}-${month}-${day}

## ${dayName}

- [ ]

## Notes

`;
}

/**
 * Get the relative path for a daily note.
 */
export function getDailyNoteRelativePath(
  dailyNotesFolder: string,
  date: Date
): string {
  const { year, month, filename } = formatDailyNotePath(date);
  return `${dailyNotesFolder}/${year}/${month}/${filename}`;
}

/**
 * Open or create a daily note for the given date.
 * Returns the file handle and relative path.
 */
export async function getOrCreateDailyNote(
  rootDirHandle: FileSystemDirectoryHandle,
  dailyNotesFolder: string,
  date: Date
): Promise<{
  fileHandle: FileSystemFileHandle;
  dirHandle: FileSystemDirectoryHandle;
  relativePath: string;
  content: string;
  isNew: boolean;
}> {
  const { year, month, filename } = formatDailyNotePath(date);
  const relativePath = getDailyNoteRelativePath(dailyNotesFolder, date);

  // Navigate to or create: dailyNotesFolder/YYYY/MM/
  const dailyDir = await getOrCreateDirectory(rootDirHandle, dailyNotesFolder);
  const yearDir = await getOrCreateDirectory(dailyDir, year);
  const monthDir = await getOrCreateDirectory(yearDir, month);

  // Get or create the daily note file
  let fileHandle: FileSystemFileHandle;
  let content: string;
  let isNew = false;

  try {
    fileHandle = await monthDir.getFileHandle(filename);
    const file = await fileHandle.getFile();
    content = await file.text();
  } catch {
    // File doesn't exist, create it with template
    fileHandle = await monthDir.getFileHandle(filename, { create: true });
    content = generateDailyNoteTemplate(date);
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    isNew = true;
  }

  return { fileHandle, dirHandle: monthDir, relativePath, content, isNew };
}
```

### 7.3 Create Calendar Component

Create `src/lib/components/Calendar.svelte`:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Pikaday from 'pikaday';
  import 'pikaday/css/pikaday.css';

  interface Props {
    /** Currently selected date */
    selectedDate?: Date;
    /** Callback when user selects a date */
    onselect?: (date: Date) => void;
  }

  let { selectedDate = new Date(), onselect }: Props = $props();

  let container: HTMLDivElement;
  let picker: Pikaday | null = $state(null);

  onMount(() => {
    picker = new Pikaday({
      bound: false,
      defaultDate: selectedDate,
      setDefaultDate: true,
      firstDay: 0, // Sunday
      onSelect: (date: Date) => {
        onselect?.(date);
      },
    });
    container.appendChild(picker.el);
  });

  onDestroy(() => {
    picker?.destroy();
  });

  /**
   * Navigate to a specific date (updates calendar view and selection).
   */
  export function gotoDate(date: Date): void {
    picker?.setDate(date);
  }

  /**
   * Get the currently selected date.
   */
  export function getDate(): Date | null {
    return picker?.getDate() ?? null;
  }

  /**
   * Navigate by number of days relative to current selection.
   */
  export function navigateDays(days: number): void {
    const current = picker?.getDate() ?? new Date();
    const newDate = new Date(current);
    newDate.setDate(newDate.getDate() + days);
    picker?.setDate(newDate);
  }
</script>

<div class="calendar" bind:this={container} data-testid="calendar-widget"></div>

<style>
  .calendar {
    padding: 0.5rem;
  }

  /* Pikaday dark theme overrides */
  :global(.pika-single) {
    background: var(--sidebar-bg, #1e1e1e) !important;
    border: none !important;
    color: var(--text-color, #d4d4d4) !important;
    font-family: inherit !important;
    width: 100% !important;
  }

  :global(.pika-single .pika-lendar) {
    width: 100% !important;
    float: none !important;
    margin: 0 !important;
  }

  :global(.pika-title) {
    background: transparent !important;
  }

  :global(.pika-label) {
    color: var(--text-color, #d4d4d4) !important;
    background: transparent !important;
  }

  :global(.pika-prev),
  :global(.pika-next) {
    background-color: var(--hover-bg, #333) !important;
  }

  :global(.pika-table th) {
    color: var(--text-muted, #888) !important;
    font-weight: normal !important;
  }

  :global(.pika-table td) {
    color: var(--text-color, #d4d4d4) !important;
  }

  :global(.pika-table td.is-today .pika-button) {
    color: var(--accent-color, #3794ff) !important;
    font-weight: bold !important;
  }

  :global(.pika-table td.is-selected .pika-button) {
    background: var(--accent-color, #3794ff) !important;
    color: white !important;
    box-shadow: none !important;
  }

  :global(.pika-button) {
    background: transparent !important;
    color: var(--text-color, #d4d4d4) !important;
    border-radius: 4px !important;
  }

  :global(.pika-button:hover) {
    background: var(--hover-bg, #333) !important;
    color: white !important;
  }

  :global(.is-disabled .pika-button) {
    color: var(--text-muted, #888) !important;
    opacity: 0.5;
  }
</style>
```

### 7.4 Update Sidebar to Include Calendar

Update `src/lib/components/Sidebar.svelte`:

```svelte
<script lang="ts">
  import QuickLinks from './QuickLinks.svelte';
  import QuickFiles from './QuickFiles.svelte';
  import FileTree from './FileTree.svelte';
  import Calendar from './Calendar.svelte';
  import { emit } from '$lib/utils/eventBus';

  interface Props {
    /** Callback when a date is selected in the calendar */
    ondateselect?: (date: Date) => void;
  }

  let { ondateselect }: Props = $props();

  // Calendar component reference for keyboard navigation
  let calendarComponent: Calendar | null = $state(null);

  function handleDateSelect(date: Date) {
    ondateselect?.(date);
  }

  /**
   * Navigate calendar by days (for keyboard shortcuts).
   */
  export function navigateCalendar(days: number): void {
    calendarComponent?.navigateDays(days);
  }
</script>

<aside class="sidebar" data-testid="sidebar">
  <div class="sidebar-section calendar-section" data-testid="calendar">
    <header class="section-header">
      <h3>Calendar</h3>
    </header>
    <Calendar bind:this={calendarComponent} onselect={handleDateSelect} />
  </div>

  <QuickLinks />
  <QuickFiles />

  <div class="sidebar-section file-tree-section" data-testid="file-tree-section">
    <header class="section-header">
      <h3>Files</h3>
    </header>
    <FileTree />
  </div>
</aside>
```

### 7.5 Add Daily Note Event to Event Bus

Update `src/lib/utils/eventBus.ts`:

```typescript
export interface AppEvents {
  'file:open': { path: string; pane?: 'left' | 'right'; openInNewTab?: boolean };
  'file:save': { pane: 'left' | 'right' };
  'file:created': { path: string };
  'file:renamed': { oldPath: string; newPath: string };
  'file:deleted': { path: string };
  'dailynote:open': { date: Date };  // NEW
  'tree:refresh': void;
  'modal:open': { id: string };
  'modal:close': { id: string };
}
```

### 7.6 Update App.svelte for Daily Notes

Update `src/App.svelte` to handle daily note opening:

```svelte
<script lang="ts">
  // ... existing imports
  import { getOrCreateDailyNote, getDailyNoteRelativePath } from '$lib/utils/dailyNotes';
  import { settings } from '$lib/stores/settings.svelte';

  // Sidebar component reference for keyboard navigation
  let sidebarComponent: Sidebar | null = $state(null);

  onMount(async () => {
    // ... existing setup

    // Listen for daily note open events
    unsubscribers.push(
      on('dailynote:open', async (data: AppEvents['dailynote:open']) => {
        await handleDailyNoteOpen(data.date);
      })
    );

    // Open today's note if configured
    if (vault.rootDirHandle && settings.autoOpenTodayNote) {
      await handleDailyNoteOpen(new Date());
    }
  });

  /**
   * Open a daily note for the given date in the right pane.
   */
  async function handleDailyNoteOpen(date: Date) {
    if (!vault.rootDirHandle) {
      console.error('No vault open');
      return;
    }

    try {
      const { fileHandle, dirHandle, relativePath, content, isNew } =
        await getOrCreateDailyNote(
          vault.rootDirHandle,
          vault.dailyNotesFolder,
          date
        );

      // Open in right pane (single-file mode for daily notes)
      openFileInPane('right', fileHandle, dirHandle, content, relativePath);

      if (isNew) {
        emit('file:created', { path: relativePath });
      }
    } catch (err) {
      console.error('Failed to open daily note:', err);
    }
  }

  /**
   * Handle date selection from calendar.
   */
  function handleDateSelect(date: Date) {
    emit('dailynote:open', { date });
  }

  /**
   * Handle keyboard shortcuts - update for daily note navigation.
   */
  function handleKeydown(event: KeyboardEvent) {
    const isMod = event.metaKey || event.ctrlKey;

    // ... existing shortcuts (Cmd+S, Cmd+E, Cmd+W, Cmd+Tab)

    // Daily note navigation (Cmd/Ctrl + Arrow keys)
    if (isMod && event.key === 'ArrowLeft') {
      event.preventDefault();
      sidebarComponent?.navigateCalendar(-1); // Previous day
    }

    if (isMod && event.key === 'ArrowRight') {
      event.preventDefault();
      sidebarComponent?.navigateCalendar(1); // Next day
    }

    if (isMod && event.key === 'ArrowUp') {
      event.preventDefault();
      sidebarComponent?.navigateCalendar(-7); // Previous week
    }

    if (isMod && event.key === 'ArrowDown') {
      event.preventDefault();
      sidebarComponent?.navigateCalendar(7); // Next week
    }
  }
</script>

<!-- Update template -->
<div class="app" data-testid="app-container">
  <Sidebar bind:this={sidebarComponent} ondateselect={handleDateSelect} />
  <!-- ... rest of template unchanged -->
</div>
```

### 7.7 Update Settings Store

Update `src/lib/stores/settings.svelte.ts` to add daily notes folder setting:

```typescript
// Add to Settings interface if not already present
interface Settings {
  // ... existing fields
  autoOpenTodayNote: boolean;
  dailyNoteNavigation: {
    enabled: boolean;
    modifier: 'meta' | 'ctrl' | 'alt';
  };
}

// Update defaults
const defaults: Settings = {
  // ... existing defaults
  autoOpenTodayNote: true,
  dailyNoteNavigation: {
    enabled: true,
    modifier: 'meta',
  },
};
```

### 7.8 Update Vault Store

Ensure `src/lib/stores/vault.svelte.ts` includes `dailyNotesFolder`:

```typescript
// This should already exist from Phase 2, but verify:
interface VaultState {
  rootDirHandle: FileSystemDirectoryHandle | null;
  dailyNotesFolder: string;
  syncDirectory: string;
}

export const vault = $state<VaultState>({
  rootDirHandle: null,
  dailyNotesFolder: 'zzz_Daily Notes',
  syncDirectory: 'zzzz_exports',
});
```

### 7.9 Update filesystem.ts

Ensure `getOrCreateDirectory` exists in `src/lib/utils/filesystem.ts`:

```typescript
/**
 * Get a directory handle, creating it if it doesn't exist.
 */
export async function getOrCreateDirectory(
  parentHandle: FileSystemDirectoryHandle,
  name: string
): Promise<FileSystemDirectoryHandle> {
  return parentHandle.getDirectoryHandle(name, { create: true });
}
```

### 7.10 Write Tests

**`dailyNotes.test.ts`** - Daily notes utilities:
- formatDailyNotePath() returns correct components
- formatDailyNotePath() pads month and day with zeros
- generateDailyNoteTemplate() includes date and day name
- generateDailyNoteTemplate() includes sync: delete frontmatter
- getDailyNoteRelativePath() constructs correct path

**`Calendar.test.ts`** - Calendar component:
- Renders Pikaday calendar
- Calls onselect when date clicked
- navigateDays() moves selection forward/backward
- gotoDate() jumps to specific date
- getDate() returns current selection

**`Sidebar.test.ts`** (update):
- Renders Calendar component
- Passes ondateselect to Calendar
- navigateCalendar() calls Calendar.navigateDays()

### 7.11 Integration Verification

- [ ] Calendar displays in sidebar
- [ ] Click date opens daily note in right pane
- [ ] New daily notes created with template
- [ ] Existing daily notes open correctly
- [ ] Nested folders created (zzz_Daily Notes/YYYY/MM/)
- [ ] Cmd+Arrow navigates calendar (Left/Right: day, Up/Down: week)
- [ ] Today's note opens on app start (if configured)
- [ ] Right pane shows daily note in single-file mode
- [ ] Left pane tabs unaffected by daily note operations
- [ ] All tests pass
- [ ] `npm run check` passes

## File Structure After Phase 7

```
src/lib/
├── types/
│   └── tabs.ts
├── stores/
│   ├── vault.svelte.ts
│   ├── settings.svelte.ts        # UPDATED (dailyNoteNavigation)
│   ├── vaultConfig.svelte.ts
│   ├── editor.svelte.ts
│   └── tabs.svelte.ts
├── components/
│   ├── Sidebar.svelte            # UPDATED (Calendar + navigation)
│   ├── Calendar.svelte           # NEW
│   ├── QuickLinks.svelte
│   ├── QuickFiles.svelte
│   ├── FileTree.svelte
│   ├── FileTreeItem.svelte
│   ├── FilenameModal.svelte
│   ├── Modal.svelte
│   ├── ContextMenu.svelte
│   ├── EditorPane.svelte
│   ├── TabBar.svelte
│   ├── Tab.svelte
│   ├── CodeMirrorEditor.svelte
│   ├── MarkdownPreview.svelte
│   └── PaneResizer.svelte
├── actions/
│   └── clickOutside.ts
└── utils/
    ├── eventBus.ts               # UPDATED (dailynote:open)
    ├── dailyNotes.ts             # NEW
    ├── fileOperations.ts
    ├── filesystem.ts             # UPDATED (getOrCreateDirectory)
    ├── frontmatter.ts
    └── markdown.ts
```

## Success Criteria

- [ ] Pikaday calendar renders in sidebar with dark theme
- [ ] Click date opens/creates daily note in right pane
- [ ] Daily note path: `{dailyNotesFolder}/YYYY/MM/YYYY-MM-DD.md`
- [ ] New notes use template with `sync: delete` frontmatter
- [ ] Cmd+Left/Right navigates days
- [ ] Cmd+Up/Down navigates weeks
- [ ] Today's note auto-opens on start (configurable)
- [ ] Right pane stays in single-file mode
- [ ] Left pane tabs unaffected
- [ ] All tests pass
- [ ] `npm run check` passes

## Porting Notes

From vanilla JS:
- `js/daily-notes.js` → `utils/dailyNotes.ts` + `Calendar.svelte`
- Pikaday initialization → Svelte `onMount`/`onDestroy` lifecycle
- CSS overrides → Scoped `:global()` styles in Calendar.svelte

Key differences:
- Pikaday imported as npm package, not CDN
- CSS imported directly from pikaday package
- Calendar state managed via component reference, not global picker variable
- Keyboard navigation via App.svelte → Sidebar → Calendar method chain
- Daily note opening via event bus (`dailynote:open`)

## Notes

### Implementation Notes (2024-12-23)

**Completed:**
- Installed Pikaday via npm (`npm install pikaday @types/pikaday`)
- Created `dailyNotes.ts` with path formatting, template generation, and file creation
- Created `Calendar.svelte` with Pikaday wrapper and dark theme CSS overrides
- Updated `Sidebar.svelte` with Calendar component and `ondateselect` prop
- Added `dailynote:open` event to event bus
- Updated `App.svelte` with daily note handling and keyboard navigation
- Keyboard navigation (Cmd+Arrow) only triggers when right pane is focused (per user request)

**Testing Notes:**
- Pikaday mock must be a class (not plain function) since it's called with `new`
- Used `lastPikadayOptions` variable to inspect constructor args in tests
- All 353 tests pass, type checking passes with one CSS warning

**Key Decisions:**
- Daily note navigation shortcuts only work when right pane focused (avoids conflict with text editing)
- Calendar triggers `dailynote:open` event, App.svelte handles the actual file opening
- New daily notes refresh file tree via `tree:refresh` event
