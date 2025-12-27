# Phase 4: File Tree

## Goal
Implement the FileTree and FileTreeItem components with recursive rendering, file operations (create, rename, delete), and context menu integration. Connect to the existing ContextMenu component and emit events for file opening.

## Prerequisites
- Phase 3 complete (Sidebar, Modal, ContextMenu, QuickLinks, QuickFiles, vaultConfig store, event bus)

## Tasks

### 4.1 Create File Operations Utility

Create `src/lib/utils/fileOperations.ts`:

```typescript
// Port from js/file-operations.js

export async function writeToFile(fileHandle: FileSystemFileHandle, content: string): Promise<void>
export async function createFile(parentDirHandle: FileSystemDirectoryHandle, filename: string): Promise<FileSystemFileHandle>
export async function createFolder(parentDirHandle: FileSystemDirectoryHandle, folderName: string): Promise<FileSystemDirectoryHandle>
export async function renameFile(dirHandle: FileSystemDirectoryHandle, oldName: string, newName: string): Promise<FileSystemFileHandle>
export async function renameFolder(parentDirHandle: FileSystemDirectoryHandle, oldName: string, newName: string): Promise<FileSystemDirectoryHandle>
export async function deleteEntry(parentDirHandle: FileSystemDirectoryHandle, name: string, isDirectory: boolean): Promise<void>
export async function getRelativePath(rootDirHandle: FileSystemDirectoryHandle, fileHandle: FileSystemFileHandle): Promise<string | null>
```

### 4.2 Create FileTreeItem Component

Create `src/lib/components/FileTreeItem.svelte`:

```svelte
<script lang="ts">
  import { emit } from '$lib/utils/eventBus';

  interface Props {
    entry: FileSystemHandle;
    parentDirHandle: FileSystemDirectoryHandle;
    depth?: number;
    oncontextmenu?: (e: MouseEvent, entry: FileSystemHandle, parentDir: FileSystemDirectoryHandle, isDirectory: boolean) => void;
  }

  let { entry, parentDirHandle, depth = 0, oncontextmenu }: Props = $props();

  let isExpanded = $state(false);
  let children = $state<FileSystemHandle[]>([]);
</script>

{#if entry.kind === 'file'}
  <div
    class="file-item"
    class:active={/* check if active */}
    onclick={handleClick}
    oncontextmenu={handleContextMenu}
    data-testid="file-item-{entry.name}"
  >
    {entry.name}
  </div>
{:else}
  <details bind:open={isExpanded} onToggle={loadChildren}>
    <summary
      oncontextmenu={handleContextMenu}
      data-testid="folder-summary-{entry.name}"
    >
      {entry.name}
    </summary>
    {#if isExpanded}
      {#each children as child}
        <svelte:self
          entry={child}
          parentDirHandle={entry as FileSystemDirectoryHandle}
          depth={depth + 1}
          {oncontextmenu}
        />
      {/each}
    {/if}
  </details>
{/if}
```

Features:
- Recursive rendering using `<svelte:self>`
- Lazy loading of directory contents on expand
- Single click opens file in left pane (via event bus)
- Ctrl/Cmd+click or double-click opens in new tab (Phase 6)
- Right-click triggers context menu callback
- Visual indication of active file

### 4.3 Create FileTree Component

Create `src/lib/components/FileTree.svelte`:

```svelte
<script lang="ts">
  import FileTreeItem from './FileTreeItem.svelte';
  import ContextMenu from './ContextMenu.svelte';
  import { vault } from '$lib/stores/vault.svelte';
  import { emit } from '$lib/utils/eventBus';

  // Context menu state
  let contextMenuVisible = $state(false);
  let contextMenuX = $state(0);
  let contextMenuY = $state(0);
  let contextMenuTarget = $state<{
    entry: FileSystemHandle;
    parentDir: FileSystemDirectoryHandle;
    isDirectory: boolean;
  } | null>(null);

  // Root entries
  let rootEntries = $state<FileSystemHandle[]>([]);

  // Load root entries when vault opens
  $effect(() => {
    if (vault.rootDirHandle) {
      loadRootEntries();
    } else {
      rootEntries = [];
    }
  });

  async function loadRootEntries() { ... }
  function handleContextMenu(e: MouseEvent, entry: FileSystemHandle, parentDir: FileSystemDirectoryHandle, isDirectory: boolean) { ... }
  function closeContextMenu() { ... }
  async function handleContextMenuAction(action: string) { ... }
  async function refreshTree() { ... }
</script>

<div class="file-tree" data-testid="file-tree-content" oncontextmenu={handleRootContextMenu}>
  {#if vault.rootDirHandle}
    {#each rootEntries as entry}
      <FileTreeItem
        {entry}
        parentDirHandle={vault.rootDirHandle}
        oncontextmenu={handleContextMenu}
      />
    {/each}
    {#if rootEntries.length === 0}
      <p class="empty-message">No files</p>
    {/if}
  {:else}
    <p class="empty-message">Open a folder to browse files</p>
  {/if}
</div>

<ContextMenu
  visible={contextMenuVisible}
  x={contextMenuX}
  y={contextMenuY}
  items={contextMenuItems}
  onclose={closeContextMenu}
/>
```

Features:
- Watches vault.rootDirHandle for changes
- Renders FileTreeItem for each root entry
- Manages context menu state
- Provides refresh function via event bus

### 4.4 Add Context Menu Actions

Update context menu to support file operations:

```typescript
const contextMenuItems = $derived(() => {
  if (!contextMenuTarget) return [];

  const items = [
    { label: 'New File', action: () => handleAction('new-file') },
    { label: 'New Folder', action: () => handleAction('new-folder') },
  ];

  if (contextMenuTarget.entry !== vault.rootDirHandle) {
    items.push(
      { separator: true },
      { label: 'Rename', action: () => handleAction('rename') },
      { label: 'Delete', action: () => handleAction('delete') },
    );
  }

  return items;
});
```

### 4.5 Create Rename/Create Modal

Create `src/lib/components/FilenameModal.svelte`:

```svelte
<script lang="ts">
  import Modal from './Modal.svelte';

  interface Props {
    visible: boolean;
    title: string;
    defaultValue?: string;
    placeholder?: string;
    onconfirm: (value: string) => void;
    oncancel: () => void;
  }
</script>

<Modal {visible} {title} onclose={oncancel}>
  <input
    type="text"
    bind:value={inputValue}
    {placeholder}
    onkeydown={handleKeydown}
    data-testid="filename-input"
  />

  {#snippet footer()}
    <button onclick={oncancel}>Cancel</button>
    <button onclick={handleConfirm}>Confirm</button>
  {/snippet}
</Modal>
```

Features:
- Used for New File, New Folder, and Rename operations
- Auto-focuses input on open
- Enter key confirms, Escape cancels

### 4.6 Update Sidebar Component

Replace file tree placeholder with actual FileTree:

```svelte
<script lang="ts">
  import QuickLinks from './QuickLinks.svelte';
  import QuickFiles from './QuickFiles.svelte';
  import FileTree from './FileTree.svelte';
</script>

<aside class="sidebar" data-testid="sidebar">
  <!-- Calendar placeholder -->
  <div class="calendar-placeholder" data-testid="calendar">...</div>

  <QuickLinks />
  <QuickFiles />

  <div class="file-tree-section" data-testid="file-tree-section">
    <header class="section-header">
      <h3>Files</h3>
    </header>
    <FileTree />
  </div>
</aside>
```

### 4.7 Add Event Bus Events

Update `src/lib/utils/eventBus.ts` with new events:

```typescript
export interface AppEvents {
  'file:open': { path: string; pane?: 'left' | 'right' };
  'file:save': { pane: 'left' | 'right' };
  'file:created': { path: string };
  'file:renamed': { oldPath: string; newPath: string };
  'file:deleted': { path: string };
  'tree:refresh': void;
  // ... existing events
}
```

### 4.8 Write Tests

Create tests for:
- `fileOperations.ts` - All file operation functions with mocked File System API
- `FileTreeItem.svelte` - Rendering files/folders, click handlers, context menu
- `FileTree.svelte` - Loading entries, context menu integration, operations
- `FilenameModal.svelte` - Input behavior, keyboard shortcuts

### 4.9 Update App.svelte Event Handling

Wire up file:open events from FileTree:

```svelte
<script lang="ts">
  import { on } from '$lib/utils/eventBus';

  onMount(() => {
    const unsubFileOpen = on('file:open', async (data) => {
      // TODO (Phase 5): Open file in editor pane
      console.log('Opening file:', data.path, 'in', data.pane ?? 'left');
    });

    return () => {
      unsubFileOpen();
    };
  });
</script>
```

### 4.10 Verify Integration

- FileTree renders when vault is opened
- Files/folders display correctly with proper sorting (folders first, alphabetical)
- Single click on file emits file:open event
- Right-click shows context menu with appropriate options
- New File creates file and refreshes tree
- New Folder creates folder and refreshes tree
- Rename updates name and refreshes tree
- Delete removes entry and refreshes tree
- Hidden files (starting with .) are not shown
- All tests pass
- `npm run check` passes

## File Structure After Phase 4

```
src/lib/
├── stores/
│   ├── vault.svelte.ts
│   ├── settings.svelte.ts
│   └── vaultConfig.svelte.ts
├── components/
│   ├── Sidebar.svelte           # Updated
│   ├── QuickLinks.svelte
│   ├── QuickFiles.svelte
│   ├── FileTree.svelte          # NEW
│   ├── FileTreeItem.svelte      # NEW
│   ├── FilenameModal.svelte     # NEW
│   ├── Modal.svelte
│   └── ContextMenu.svelte
├── actions/
│   └── clickOutside.ts
└── utils/
    ├── eventBus.ts              # Updated
    ├── fileOperations.ts        # NEW
    ├── filesystem.ts
    └── frontmatter.ts
```

## Success Criteria

- [ ] File operations utility with create, rename, delete functions
- [ ] FileTreeItem component with recursive rendering
- [ ] FileTree component with context menu integration
- [ ] FilenameModal for input prompts
- [ ] Right-click context menu shows New File, New Folder, Rename, Delete
- [ ] File operations work correctly and refresh tree
- [ ] Hidden files are filtered out
- [ ] Folders sorted before files, then alphabetically
- [ ] File clicks emit file:open event
- [ ] Unit tests pass for all components
- [ ] `npm run check` passes

## Research Needed

1. **Svelte 5 `<svelte:self>`** - Verify recursive component syntax still works
2. **`$effect` for async loading** - Best pattern for loading directory contents
3. **Details/summary with Svelte** - Event handling for `<details>` toggle

## Porting Notes

From vanilla JS:
- `js/file-tree.js` → `FileTree.svelte` + `FileTreeItem.svelte`
- `js/file-operations.js` → `fileOperations.ts` utility
- Context menu logic integrated into `FileTree.svelte`

Key differences:
- Recursive rendering with `<svelte:self>` instead of manual DOM creation
- Reactive directory loading with `$effect` instead of manual refreshes
- Context menu state managed as component state, not global
- Events via event bus instead of callback threading

## Notes

### Session Notes - Phase 4 Implementation

**Completed Tasks:**
1. Created `fileOperations.ts` utility with typed functions
2. Extended `eventBus.ts` with `file:created`, `file:renamed`, `file:deleted`, `tree:refresh` events
3. Created `FileTreeItem.svelte` with recursive rendering
4. Created `FileTree.svelte` with context menu integration
5. Created `FilenameModal.svelte` for create/rename operations
6. Updated `Sidebar.svelte` to include FileTree
7. Added event handlers in `App.svelte` (stubbed for Phase 5)

**Key Learnings:**

1. **Svelte 5 Recursive Components**: Instead of `<svelte:self>`, the modern approach is to import the component itself:
   ```svelte
   <script>
     import Self from './FileTreeItem.svelte';
   </script>
   <Self {entry} {parentDirHandle} />
   ```

2. **Async iterators for FileSystem API**: When iterating `dirHandle.values()`, TypeScript infers `FileSystemHandle` but needs casting for specific operations:
   ```typescript
   if (entry.kind === 'file') {
     const fileHandle = entry as FileSystemFileHandle;
     const file = await fileHandle.getFile();
   }
   ```

3. **$state and $effect for async loading**: Pattern for lazy loading directory contents works well:
   ```svelte
   let children = $state<FileSystemHandle[]>([]);

   async function loadChildren() {
     if (isLoading) return;
     isLoading = true;
     children = await getVisibleEntries(dirHandle);
     isLoading = false;
   }
   ```

4. **Modal input defaultValue**: To make defaultValue reactive in FilenameModal, initialize with empty string and set value in `$effect`:
   ```svelte
   let inputValue = $state('');
   $effect(() => {
     if (visible) {
       inputValue = defaultValue;
     }
   });
   ```

5. **Accessibility**: Svelte check enforces accessibility. Key requirements:
   - `role="treeitem"` needs `aria-selected`
   - `role="tree"` needs `tabindex`
   - Click handlers need keyboard handlers too

**Test Mocking Pattern:**
When mocking `FileSystemDirectoryHandle`, avoid recursive mock creation in `getDirectoryHandle`:
```typescript
getDirectoryHandle: vi.fn().mockImplementation((name) => {
  return Promise.resolve({
    kind: 'directory',
    name,
    // Simple inline mock, not recursive call
  });
})
