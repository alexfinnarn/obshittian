<script lang="ts">
  import { onMount } from 'svelte';
  import FileTreeItem from './FileTreeItem.svelte';
  import ContextMenu, { type MenuItem } from './ContextMenu.svelte';
  import FilenameModal from './FilenameModal.svelte';
  import { vault } from '$lib/stores/vault.svelte';
  import { emit, on } from '$lib/utils/eventBus';
  import {
    getVisibleEntries,
    getRelativePath,
    createFile,
    createFolder,
    renameFile,
    renameFolder,
    deleteEntry,
  } from '$lib/utils/fileOperations';
  import { canAddTab } from '$lib/stores/tabs.svelte';

  // Root entries
  let rootEntries = $state<FileSystemHandle[]>([]);
  let isLoading = $state(false);
  let activePath = $state<string | null>(null);

  // Context menu state
  let contextMenuVisible = $state(false);
  let contextMenuX = $state(0);
  let contextMenuY = $state(0);
  let contextMenuTarget = $state<{
    entry: FileSystemHandle;
    parentDir: FileSystemDirectoryHandle;
    isDirectory: boolean;
  } | null>(null);

  // Filename modal state
  let filenameModalVisible = $state(false);
  let filenameModalTitle = $state('');
  let filenameModalDefaultValue = $state('');
  let filenameModalAction = $state<'new-file' | 'new-folder' | 'rename' | null>(null);

  // Load root entries when vault opens
  $effect(() => {
    if (vault.rootDirHandle) {
      loadRootEntries();
    } else {
      rootEntries = [];
    }
  });

  async function loadRootEntries() {
    if (!vault.rootDirHandle) return;

    isLoading = true;
    try {
      rootEntries = await getVisibleEntries(vault.rootDirHandle);
    } catch (err) {
      console.error('Failed to load root entries:', err);
      rootEntries = [];
    } finally {
      isLoading = false;
    }
  }

  async function refreshTree() {
    await loadRootEntries();
  }

  // Handle context menu from items
  function handleContextMenu(
    e: MouseEvent,
    entry: FileSystemHandle,
    parentDir: FileSystemDirectoryHandle,
    isDirectory: boolean
  ) {
    contextMenuX = e.clientX;
    contextMenuY = e.clientY;
    contextMenuTarget = { entry, parentDir, isDirectory };
    contextMenuVisible = true;
  }

  // Handle right-click on empty area (root)
  function handleRootContextMenu(e: MouseEvent) {
    // Only if clicking directly on the file tree container, not on a child
    if (e.target === e.currentTarget && vault.rootDirHandle) {
      e.preventDefault();
      contextMenuX = e.clientX;
      contextMenuY = e.clientY;
      contextMenuTarget = {
        entry: vault.rootDirHandle,
        parentDir: vault.rootDirHandle,
        isDirectory: true,
      };
      contextMenuVisible = true;
    }
  }

  function closeContextMenu() {
    contextMenuVisible = false;
    contextMenuTarget = null;
  }

  // Build context menu items based on target
  const contextMenuItems = $derived.by(() => {
    if (!contextMenuTarget) return [];

    const items: MenuItem[] = [];

    // For files: add "Open in Tab" option (disabled if at tab limit)
    if (!contextMenuTarget.isDirectory && contextMenuTarget.entry !== vault.rootDirHandle) {
      items.push({
        label: 'Open in Tab',
        action: () => handleAction('open-in-tab'),
        disabled: !canAddTab(),
      });
      items.push({ label: '', action: () => {}, separator: true });
    }

    items.push(
      { label: 'New File', action: () => handleAction('new-file') },
      { label: 'New Folder', action: () => handleAction('new-folder') },
    );

    // Only show Rename/Delete if not the root directory
    if (contextMenuTarget.entry !== vault.rootDirHandle) {
      items.push(
        { label: '', action: () => {}, separator: true },
        { label: 'Rename', action: () => handleAction('rename') },
        { label: 'Delete', action: () => handleAction('delete') }
      );
    }

    return items;
  });

  function handleAction(action: 'new-file' | 'new-folder' | 'rename' | 'delete' | 'open-in-tab') {
    closeContextMenu();

    if (!contextMenuTarget) return;

    if (action === 'delete') {
      handleDelete();
      return;
    }

    if (action === 'open-in-tab') {
      handleOpenInTab();
      return;
    }

    // Set up modal for file/folder operations
    filenameModalAction = action;

    if (action === 'new-file') {
      filenameModalTitle = 'New File';
      filenameModalDefaultValue = 'untitled.md';
    } else if (action === 'new-folder') {
      filenameModalTitle = 'New Folder';
      filenameModalDefaultValue = 'New Folder';
    } else if (action === 'rename') {
      filenameModalTitle = 'Rename';
      filenameModalDefaultValue = contextMenuTarget.entry.name;
    }

    filenameModalVisible = true;
  }

  async function handleFilenameConfirm(value: string) {
    filenameModalVisible = false;

    if (!contextMenuTarget || !filenameModalAction) return;

    try {
      const targetDir = contextMenuTarget.isDirectory
        ? (contextMenuTarget.entry as FileSystemDirectoryHandle)
        : contextMenuTarget.parentDir;

      if (filenameModalAction === 'new-file') {
        // Ensure .md extension
        const filename = value.endsWith('.md') || value.endsWith('.txt')
          ? value
          : value + '.md';
        const fileHandle = await createFile(targetDir, filename);
        const path = await getRelativePath(vault.rootDirHandle!, fileHandle);
        if (path) {
          emit('file:created', { path });
          emit('file:open', { path, pane: 'left' });
        }
      } else if (filenameModalAction === 'new-folder') {
        await createFolder(targetDir, value);
      } else if (filenameModalAction === 'rename') {
        const oldName = contextMenuTarget.entry.name;
        if (value === oldName) return;

        // Get old path before rename
        let oldPath: string | null = null;
        if (!contextMenuTarget.isDirectory && contextMenuTarget.entry.kind === 'file') {
          oldPath = await getRelativePath(
            vault.rootDirHandle!,
            contextMenuTarget.entry as FileSystemFileHandle
          );
        }

        if (contextMenuTarget.isDirectory) {
          await renameFolder(contextMenuTarget.parentDir, oldName, value);
        } else {
          const newHandle = await renameFile(contextMenuTarget.parentDir, oldName, value);
          if (oldPath) {
            const newPath = await getRelativePath(vault.rootDirHandle!, newHandle);
            if (newPath) {
              emit('file:renamed', { oldPath, newPath });
            }
          }
        }
      }

      await refreshTree();
    } catch (err) {
      console.error('File operation failed:', err);
      alert(`Operation failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    filenameModalAction = null;
  }

  function handleFilenameCancel() {
    filenameModalVisible = false;
    filenameModalAction = null;
  }

  async function handleDelete() {
    if (!contextMenuTarget || contextMenuTarget.entry === vault.rootDirHandle) {
      alert('Cannot delete root directory');
      return;
    }

    const name = contextMenuTarget.entry.name;
    const type = contextMenuTarget.isDirectory ? 'folder' : 'file';

    if (!confirm(`Delete ${type} "${name}"?`)) return;

    try {
      // Get path before delete for event
      let filePath: string | null = null;
      if (!contextMenuTarget.isDirectory && contextMenuTarget.entry.kind === 'file') {
        filePath = await getRelativePath(
          vault.rootDirHandle!,
          contextMenuTarget.entry as FileSystemFileHandle
        );
      }

      await deleteEntry(contextMenuTarget.parentDir, name, contextMenuTarget.isDirectory);

      if (filePath) {
        emit('file:deleted', { path: filePath });
      }

      await refreshTree();
    } catch (err) {
      console.error('Delete failed:', err);
      alert(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function handleOpenInTab() {
    if (!contextMenuTarget || contextMenuTarget.isDirectory) return;

    try {
      const filePath = await getRelativePath(
        vault.rootDirHandle!,
        contextMenuTarget.entry as FileSystemFileHandle
      );
      if (filePath) {
        emit('file:open', { path: filePath, pane: 'left', openInNewTab: true });
      }
    } catch (err) {
      console.error('Failed to open file in tab:', err);
    }
  }

  // Listen for tree:refresh events
  onMount(() => {
    const unsubscribe = on('tree:refresh', () => {
      refreshTree();
    });

    return () => {
      unsubscribe();
    };
  });
</script>

<div
  class="file-tree"
  oncontextmenu={handleRootContextMenu}
  role="tree"
  tabindex="0"
  data-testid="file-tree-content"
>
  {#if vault.rootDirHandle}
    {#if isLoading}
      <p class="status-message">Loading...</p>
    {:else if rootEntries.length === 0}
      <p class="empty-message">No files</p>
    {:else}
      {#each rootEntries as entry (entry.name)}
        <FileTreeItem
          {entry}
          parentDirHandle={vault.rootDirHandle}
          {activePath}
          oncontextmenu={handleContextMenu}
        />
      {/each}
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

<FilenameModal
  visible={filenameModalVisible}
  title={filenameModalTitle}
  defaultValue={filenameModalDefaultValue}
  onconfirm={handleFilenameConfirm}
  oncancel={handleFilenameCancel}
/>

<style>
  .file-tree {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0;
    min-height: 100px;
  }

  .empty-message,
  .status-message {
    color: var(--text-muted, #666);
    padding: 0.5rem 1rem;
    margin: 0;
    font-style: italic;
  }
</style>
