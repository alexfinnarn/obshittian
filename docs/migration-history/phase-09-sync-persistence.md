# Phase 9: Sync & Persistence

## Goal
Implement vault open/restore flow, docx export for Google Drive sync, and complete the persistence layer for tabs and last open file.

## Prerequisites
- Phase 8 complete (Search & Tags)

## Tasks

### 9.1 Install docx Package

Add docx for Word document generation:

```bash
cd svelte-app
npm install docx
```

### 9.2 Create Sync Utilities

Create `src/lib/utils/sync.ts`:

```typescript
/**
 * Sync Utilities - Docx export and cleanup for Google Drive sync
 *
 * Files with `sync: permanent` or `sync: temporary` in frontmatter
 * are exported to .docx format. Temporary exports are cleaned up
 * beyond the syncTempLimit.
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { getFrontmatterValue, splitFrontmatter } from './frontmatter';
import { generateDailyNoteTemplate } from './dailyNotes';
import {
  getOrCreateDirectory,
  saveTempExports,
  getTempExports,
} from './filesystem';

export const SYNC_MODES = {
  PERMANENT: 'permanent',
  TEMPORARY: 'temporary',
  DELETE: 'delete',
} as const;

export type SyncMode = (typeof SYNC_MODES)[keyof typeof SYNC_MODES];

export interface SyncResult {
  action: 'exported' | 'deleted' | 'none';
  path?: string;
  mode?: SyncMode;
}

/**
 * Get sync mode from file content frontmatter
 */
export function getSyncMode(content: string): SyncMode | null {
  const mode = getFrontmatterValue(content, 'sync');
  if (mode && Object.values(SYNC_MODES).includes(mode as SyncMode)) {
    return mode as SyncMode;
  }
  return null;
}

/**
 * Check if a file is a daily note based on its path
 */
export function isDailyNote(relativePath: string, dailyNotesFolder: string): boolean {
  return relativePath.startsWith(dailyNotesFolder + '/');
}

/**
 * Extract date from daily note path
 * @param relativePath - Path like "zzz_Daily Notes/2024/12/2024-12-14.md"
 */
export function parseDailyNotePath(relativePath: string): Date | null {
  const match = relativePath.match(/(\d{4})-(\d{2})-(\d{2})\.md$/);
  if (!match) return null;
  return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
}

/**
 * Check if daily note content differs from default template
 */
export function isDailyNoteModified(content: string, date: Date): boolean {
  const { body: currentBody } = splitFrontmatter(content);
  const templateContent = generateDailyNoteTemplate(date);
  const { body: templateBody } = splitFrontmatter(templateContent);

  // Normalize whitespace for comparison
  const normalizedCurrent = currentBody.trim().replace(/\s+/g, ' ');
  const normalizedTemplate = templateBody.trim().replace(/\s+/g, ' ');

  return normalizedCurrent !== normalizedTemplate;
}

/**
 * Convert relative md path to export path
 */
export function getExportPath(relativePath: string, syncDirectory: string): string {
  const docxPath = relativePath.replace(/\.md$/, '.docx');
  return `${syncDirectory}/${docxPath}`;
}

/**
 * Convert markdown content to docx Blob
 */
export async function markdownToDocx(markdownContent: string, title: string = 'Document'): Promise<Blob> {
  const lines = markdownContent.split('\n');
  const children: Paragraph[] = [];

  for (const line of lines) {
    if (line.startsWith('# ')) {
      children.push(
        new Paragraph({
          text: line.substring(2),
          heading: HeadingLevel.HEADING_1,
        })
      );
    } else if (line.startsWith('## ')) {
      children.push(
        new Paragraph({
          text: line.substring(3),
          heading: HeadingLevel.HEADING_2,
        })
      );
    } else if (line.startsWith('### ')) {
      children.push(
        new Paragraph({
          text: line.substring(4),
          heading: HeadingLevel.HEADING_3,
        })
      );
    } else if (line.startsWith('- [ ] ')) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '[ ] ' + line.substring(6) })],
        })
      );
    } else if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '[x] ' + line.substring(6) })],
        })
      );
    } else if (line.startsWith('- ')) {
      children.push(
        new Paragraph({
          text: line.substring(2),
          bullet: { level: 0 },
        })
      );
    } else if (line.trim()) {
      children.push(new Paragraph({ text: line }));
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children.length > 0 ? children : [new Paragraph({ text: '' })],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Write a docx blob to the filesystem
 */
async function writeDocx(
  rootHandle: FileSystemDirectoryHandle,
  exportPath: string,
  blob: Blob
): Promise<void> {
  const parts = exportPath.split('/');
  const filename = parts.pop()!;

  // Navigate/create directory structure
  let currentDir = rootHandle;
  for (const dir of parts) {
    currentDir = await getOrCreateDirectory(currentDir, dir);
  }

  // Create file and write
  const fileHandle = await currentDir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/**
 * Delete an export file if it exists
 */
async function deleteExport(
  rootHandle: FileSystemDirectoryHandle,
  exportPath: string
): Promise<void> {
  try {
    const parts = exportPath.split('/');
    const filename = parts.pop()!;

    let currentDir = rootHandle;
    for (const dir of parts) {
      currentDir = await currentDir.getDirectoryHandle(dir);
    }

    await currentDir.removeEntry(filename);
  } catch {
    // File or directory doesn't exist, ignore
  }
}

/**
 * Track a temporary export
 */
function addTempExport(relativePath: string): void {
  const exports = getTempExports();
  exports[relativePath] = Date.now();
  saveTempExports(exports);
}

/**
 * Remove a file from temp export tracking
 */
function removeTempExport(relativePath: string): void {
  const exports = getTempExports();
  delete exports[relativePath];
  saveTempExports(exports);
}

/**
 * Process sync for a file after save
 */
export async function processSync(
  relativePath: string,
  content: string,
  rootHandle: FileSystemDirectoryHandle,
  syncDirectory: string
): Promise<SyncResult> {
  const syncMode = getSyncMode(content);
  const exportPath = getExportPath(relativePath, syncDirectory);

  if (syncMode === SYNC_MODES.DELETE) {
    // Delete existing export if present
    await deleteExport(rootHandle, exportPath);
    removeTempExport(relativePath);
    return { action: 'deleted', path: exportPath };
  }

  if (syncMode === SYNC_MODES.PERMANENT || syncMode === SYNC_MODES.TEMPORARY) {
    // Export to docx
    const { body } = splitFrontmatter(content);
    const title = relativePath.split('/').pop()?.replace(/\.md$/, '') ?? 'Document';
    const blob = await markdownToDocx(body, title);
    await writeDocx(rootHandle, exportPath, blob);

    // Track temporary exports
    if (syncMode === SYNC_MODES.TEMPORARY) {
      addTempExport(relativePath);
    } else {
      removeTempExport(relativePath);
    }

    return { action: 'exported', path: exportPath, mode: syncMode };
  }

  // No sync mode specified
  return { action: 'none' };
}

/**
 * Run cleanup of old temporary exports
 */
export async function cleanupTempExports(
  rootHandle: FileSystemDirectoryHandle,
  syncDirectory: string,
  limit: number
): Promise<number> {
  const exports = getTempExports();
  const entries = Object.entries(exports);

  if (entries.length <= limit) {
    return 0; // Nothing to clean
  }

  // Sort by timestamp (oldest first)
  entries.sort((a, b) => a[1] - b[1]);

  // Delete oldest entries beyond limit
  const toDelete = entries.slice(0, entries.length - limit);
  let deletedCount = 0;

  for (const [relativePath] of toDelete) {
    const exportPath = getExportPath(relativePath, syncDirectory);
    await deleteExport(rootHandle, exportPath);
    delete exports[relativePath];
    deletedCount++;
  }

  saveTempExports(exports);
  return deletedCount;
}
```

### 9.3 Create VaultPicker Component

Create `src/lib/components/VaultPicker.svelte`:

```svelte
<script lang="ts">
  import { vault, openVault } from '$lib/stores/vault.svelte';
  import { saveDirectoryHandle, getDirectoryHandle } from '$lib/utils/filesystem';

  interface Props {
    onopen?: () => void;
  }

  let { onopen }: Props = $props();

  let hasStoredHandle = $state(false);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  // Check for stored handle on mount
  $effect(() => {
    checkStoredHandle();
  });

  async function checkStoredHandle() {
    try {
      const handle = await getDirectoryHandle();
      hasStoredHandle = handle !== null;
    } catch {
      hasStoredHandle = false;
    }
  }

  async function handleOpenFolder() {
    isLoading = true;
    error = null;

    try {
      const dirHandle = await window.showDirectoryPicker();
      openVault(dirHandle);
      await saveDirectoryHandle(dirHandle);
      onopen?.();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        error = 'Failed to open folder';
        console.error('Open folder error:', err);
      }
    } finally {
      isLoading = false;
    }
  }

  async function handleRestoreFolder() {
    isLoading = true;
    error = null;

    try {
      const savedHandle = await getDirectoryHandle();
      if (!savedHandle) {
        error = 'No saved folder found';
        return;
      }

      const permission = await savedHandle.requestPermission({ mode: 'readwrite' });
      if (permission === 'granted') {
        openVault(savedHandle);
        onopen?.();
      } else {
        error = 'Permission denied';
      }
    } catch (err) {
      error = 'Failed to restore folder';
      console.error('Restore folder error:', err);
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="vault-picker" data-testid="vault-picker">
  <div class="picker-content">
    <h2>Open a Folder</h2>
    <p>Select a folder to use as your vault, or restore a previously opened folder.</p>

    <div class="picker-buttons">
      <button
        class="btn primary"
        onclick={handleOpenFolder}
        disabled={isLoading}
        data-testid="open-folder-btn"
      >
        {isLoading ? 'Opening...' : 'Open Folder'}
      </button>

      {#if hasStoredHandle}
        <button
          class="btn secondary"
          onclick={handleRestoreFolder}
          disabled={isLoading}
          data-testid="restore-folder-btn"
        >
          Restore Last Folder
        </button>
      {/if}
    </div>

    {#if error}
      <p class="error" data-testid="picker-error">{error}</p>
    {/if}
  </div>
</div>

<style>
  .vault-picker {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    background: var(--bg-color, #1e1e1e);
  }

  .picker-content {
    text-align: center;
    padding: 2rem;
    max-width: 400px;
  }

  h2 {
    margin: 0 0 0.5rem;
    color: var(--text-color, #d4d4d4);
  }

  p {
    color: var(--text-muted, #888);
    margin: 0 0 1.5rem;
  }

  .picker-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn.primary {
    background: var(--accent-color, #3794ff);
    color: white;
  }

  .btn.primary:hover:not(:disabled) {
    background: var(--accent-hover, #2d7cd6);
  }

  .btn.secondary {
    background: var(--button-bg, #3a3a3a);
    color: var(--text-color, #d4d4d4);
  }

  .btn.secondary:hover:not(:disabled) {
    background: var(--hover-bg, #4a4a4a);
  }

  .error {
    color: var(--error-color, #f44747);
    margin-top: 1rem;
  }
</style>
```

### 9.4 Update App.svelte for Vault Flow

Update `src/App.svelte` to:
1. Show VaultPicker when no vault is open
2. Auto-restore vault on load if configured
3. Integrate sync processing on file save
4. Restore tabs and last open file

```typescript
// Add imports
import VaultPicker from '$lib/components/VaultPicker.svelte';
import {
  processSync,
  cleanupTempExports,
  getSyncMode,
  isDailyNote,
  parseDailyNotePath,
  isDailyNoteModified,
  SYNC_MODES,
} from '$lib/utils/sync';
import { updateFrontmatterKey } from '$lib/utils/frontmatter';
import {
  getDirectoryHandle,
  saveLastOpenFile,
  getLastOpenFile,
} from '$lib/utils/filesystem';
import { loadSettings } from '$lib/stores/settings.svelte';

// In onMount, add vault restoration logic:
onMount(async () => {
  // Load settings first
  loadSettings();

  // Try to auto-restore vault if configured
  if (settings.autoOpenLastDirectory) {
    await tryRestoreVault();
  }

  // ... rest of existing onMount code
});

/**
 * Try to restore the previously opened vault
 */
async function tryRestoreVault() {
  try {
    const savedHandle = await getDirectoryHandle();
    if (!savedHandle) return;

    // Request permission - this may require user interaction
    const permission = await savedHandle.requestPermission({ mode: 'readwrite' });
    if (permission === 'granted') {
      openVault(savedHandle);
      await onVaultOpened();
    }
  } catch (err) {
    console.error('Failed to restore vault:', err);
  }
}

/**
 * Called after vault is opened (new or restored)
 */
async function onVaultOpened() {
  if (!vault.rootDirHandle) return;

  // Run sync cleanup
  try {
    const deleted = await cleanupTempExports(
      vault.rootDirHandle,
      vault.syncDirectory,
      settings.syncTempLimit
    );
    if (deleted > 0) {
      console.log(`Sync: Cleaned up ${deleted} old temporary export(s)`);
    }
  } catch (err) {
    console.error('Sync cleanup error:', err);
  }

  // Initialize tag index
  await initializeTagIndex();

  // Restore tabs
  await restoreTabs();

  // Open today's note if configured
  if (settings.autoOpenTodayNote) {
    await handleDailyNoteOpen(new Date());
  }
}

/**
 * Restore tabs from localStorage
 */
async function restoreTabs() {
  const storedTabs = getTabsFromStorage();
  if (!storedTabs || storedTabs.tabs.length === 0) return;

  // Re-open each stored tab
  for (const tabData of storedTabs.tabs) {
    try {
      await handleFileOpenInTabs(tabData.relativePath, true);
    } catch (err) {
      console.error('Failed to restore tab:', tabData.relativePath, err);
    }
  }

  // Switch to the previously active tab
  if (storedTabs.activeIndex >= 0 && storedTabs.activeIndex < tabsStore.tabs.length) {
    switchTab(storedTabs.activeIndex);
  }
}

// Update handleFileSave to include sync processing and daily note auto-upgrade:
async function handleFileSave(pane: PaneId) {
  if (pane === 'left') {
    const activeTab = getActiveTab();
    if (!activeTab || !activeTab.isDirty) return;

    let content = activeTab.editorContent;
    const relativePath = activeTab.relativePath;

    // Auto-upgrade daily notes from delete to temporary
    if (relativePath && isDailyNote(relativePath, vault.dailyNotesFolder)) {
      const syncMode = getSyncMode(content);
      if (syncMode === SYNC_MODES.DELETE || syncMode === null) {
        const date = parseDailyNotePath(relativePath);
        if (date && isDailyNoteModified(content, date)) {
          content = updateFrontmatterKey(content, 'sync', 'temporary');
          updateTabContent(tabsStore.activeTabIndex, content);
        }
      }
    }

    try {
      await writeToFile(activeTab.fileHandle, content);
      markTabClean(tabsStore.activeTabIndex, content);
      console.log('File saved:', activeTab.filename);

      // Update tag index
      if (relativePath) {
        updateFileInIndex(relativePath, content);
      }

      // Process sync
      if (relativePath && vault.rootDirHandle) {
        const result = await processSync(
          relativePath,
          content,
          vault.rootDirHandle,
          vault.syncDirectory
        );
        if (result.action !== 'none') {
          console.log(`Sync: ${result.action} - ${result.path}`);
        }

        // Cleanup after each save
        await cleanupTempExports(
          vault.rootDirHandle,
          vault.syncDirectory,
          settings.syncTempLimit
        );
      }
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  } else {
    // Similar logic for right pane...
  }
}

// Update template to show VaultPicker when no vault:
{#if vault.rootDirHandle}
  <!-- Existing app UI -->
{:else}
  <VaultPicker onopen={onVaultOpened} />
{/if}
```

### 9.5 Add Tab Persistence on Change

Update tabs store to auto-save when tabs change. In `src/lib/stores/tabs.svelte.ts`, add:

```typescript
/**
 * Save tabs to storage (call after any tab change)
 */
function persistTabs(): void {
  saveTabsToStorage();
}

// Add persistTabs() calls to: addTab, replaceCurrentTab, removeTab, switchTab, updateTabContent, markTabClean
```

Or use a $effect in App.svelte to watch tabsStore changes:

```typescript
$effect(() => {
  // Auto-save tabs when they change
  if (tabsStore.tabs.length > 0) {
    saveTabsToStorage();
  }
});
```

### 9.6 Add Last Open File Persistence

In App.svelte, save the active tab's path when it changes:

```typescript
$effect(() => {
  const activeTab = getActiveTab();
  if (activeTab?.relativePath) {
    saveLastOpenFile(activeTab.relativePath);
  }
});
```

### 9.7 Write Tests

**`sync.test.ts`** - Sync utilities:
- getSyncMode() extracts mode from frontmatter
- getSyncMode() returns null for invalid mode
- isDailyNote() identifies daily notes by path
- parseDailyNotePath() extracts date from path
- parseDailyNotePath() returns null for invalid path
- isDailyNoteModified() detects changes from template
- isDailyNoteModified() returns false for unmodified
- getExportPath() converts .md to .docx path
- markdownToDocx() converts basic markdown
- markdownToDocx() handles headings
- markdownToDocx() handles checkboxes
- markdownToDocx() handles bullet lists
- processSync() exports for permanent mode
- processSync() exports for temporary mode
- processSync() deletes for delete mode
- processSync() returns none for no mode
- cleanupTempExports() removes oldest beyond limit
- cleanupTempExports() keeps within limit

**`VaultPicker.test.ts`** - VaultPicker component:
- Renders open folder button
- Shows restore button when stored handle exists
- Hides restore button when no stored handle
- Calls onopen after successful open
- Shows error on failure
- Disables buttons while loading

### 9.8 Integration Verification

- [ ] docx package installed
- [ ] Vault picker shows when no vault open
- [ ] Open Folder button works with showDirectoryPicker
- [ ] Restore Folder button requests permission
- [ ] Vault auto-restores on app load (if configured)
- [ ] Sync cleanup runs on vault open
- [ ] File save triggers sync processing
- [ ] Daily notes auto-upgrade from delete to temporary
- [ ] Tabs persist to localStorage
- [ ] Tabs restore on app load
- [ ] Last open file persists
- [ ] All tests pass
- [ ] `npm run check` passes

## File Structure After Phase 9

```
src/lib/
├── types/
│   └── tabs.ts
├── stores/
│   ├── vault.svelte.ts
│   ├── settings.svelte.ts
│   ├── vaultConfig.svelte.ts
│   ├── editor.svelte.ts
│   ├── tabs.svelte.ts
│   └── tags.svelte.ts
├── components/
│   ├── Sidebar.svelte
│   ├── SidebarTabs.svelte
│   ├── TagSearch.svelte
│   ├── Calendar.svelte
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
│   ├── PaneResizer.svelte
│   └── VaultPicker.svelte     # NEW
├── actions/
│   └── clickOutside.ts
└── utils/
    ├── eventBus.ts
    ├── dailyNotes.ts
    ├── tags.ts
    ├── sync.ts                 # NEW
    ├── fileOperations.ts
    ├── filesystem.ts
    ├── frontmatter.ts
    └── markdown.ts
```

## Success Criteria

- [ ] Vault picker UI shows when no vault is open
- [ ] Can open folder with file picker dialog
- [ ] Can restore previously opened folder with one click
- [ ] Vault auto-restores on page load (respects settings)
- [ ] Files with `sync: permanent` export to .docx on save
- [ ] Files with `sync: temporary` export and track for cleanup
- [ ] Files with `sync: delete` remove any existing export
- [ ] Daily notes auto-upgrade to temporary when edited
- [ ] Old temporary exports cleaned up (keeps syncTempLimit)
- [ ] Open tabs persist across page reloads
- [ ] Tab restoration opens files in correct order
- [ ] Last active tab restored correctly
- [ ] All tests pass
- [ ] `npm run check` passes

## Porting Notes

From vanilla JS:
- `js/persistence.js` → Already mostly in `utils/filesystem.ts`
- `js/sync.js` → `utils/sync.ts`
- Vault open/restore flow from `js/app.js` → `VaultPicker.svelte` + `App.svelte`

Key differences:
- docx imported as npm package (not CDN)
- VaultPicker as dedicated component
- Reactive vault state triggers UI changes
- Tab persistence uses existing tabs store functions
- $effect for auto-persistence of tabs and last file

## Notes

### Session Notes - Phase 9 Complete

**Changes from original plan:**
1. **No docx conversion** - User preference to keep exports as markdown files instead of converting to .docx
2. **Auto-restore is primary flow** - VaultPicker is only shown when:
   - No stored directory handle exists (first-time use)
   - Permission request fails
   - Auto-restore fails for any reason

**Key implementation details:**
1. Added `FileSystemHandle.requestPermission` and `queryPermission` to `global.d.ts` (not in default TypeScript types)
2. `isRestoringVault` state starts as `true` to prevent flash of VaultPicker during restore attempt
3. Sync exports markdown body only (strips frontmatter) to sync directory
4. Daily note auto-upgrade happens at save time, updating the tab/pane content before writing
5. Tab persistence via `$effect` watching `tabsStore.tabs` and `tabsStore.activeTabIndex`
6. Last open file persistence via `$effect` watching `getActiveTab()?.relativePath`

**Tests added:**
- 26 new tests in `sync.test.ts` covering:
  - `getSyncMode` - frontmatter extraction
  - `isDailyNote` - path detection
  - `parseDailyNotePath` - date extraction from filename
  - `isDailyNoteModified` - template comparison
  - `getExportPath` - sync directory path construction
  - `SYNC_MODES` constants

**Files created/modified:**
- `src/lib/utils/sync.ts` - NEW (sync utilities, simplified without docx)
- `src/lib/components/VaultPicker.svelte` - NEW (vault open/restore UI)
- `src/App.svelte` - Updated with vault flow, sync integration, persistence $effects
- `src/global.d.ts` - Added FileSystemHandle permission methods
- `src/lib/stores/editor.svelte.test.ts` - Updated mock to include permission methods
- `src/lib/utils/sync.test.ts` - NEW (26 tests)

**Total tests: 426 (26 new)**
