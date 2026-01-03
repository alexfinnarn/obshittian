<script lang="ts">
  import { onMount } from 'svelte';
  import FileTreeItem from './FileTreeItem.svelte';
  import ContextMenu, { type MenuItem } from './ContextMenu.svelte';
  import FilenameModal from './FilenameModal.svelte';
  import { vault } from '$lib/stores/vault.svelte';
  import { emit, on } from '$lib/utils/eventBus';
  import {
    getVisibleEntries,
    createFile,
    createFolder,
    renameFile,
    renameFolder,
    deleteEntry,
  } from '$lib/utils/fileOperations';
  import { canAddTab } from '$lib/stores/tabs.svelte';
  import type { DirectoryEntry } from '$lib/server/fileTypes';

  // Root entries
  let rootEntries = $state<DirectoryEntry[]>([]);
  let isLoading = $state(false);
  let activePath = $state<string | null>(null);

  // Context menu state
  let contextMenuVisible = $state(false);
  let contextMenuX = $state(0);
  let contextMenuY = $state(0);
  let contextMenuTarget = $state<{
    entry: DirectoryEntry;
    parentPath: string;
    isDirectory: boolean;
    isRoot: boolean;
  } | null>(null);

  // Filename modal state
  let filenameModalVisible = $state(false);
  let filenameModalTitle = $state('');
  let filenameModalDefaultValue = $state('');
  let filenameModalAction = $state<'new-file' | 'new-folder' | 'rename' | null>(null);

  // Load root entries when vault opens
  $effect(() => {
    if (vault.path) {
      loadRootEntries();
    } else {
      rootEntries = [];
    }
  });

  async function loadRootEntries() {
    if (!vault.path) return;

    isLoading = true;
    try {
      rootEntries = await getVisibleEntries('');
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
    entry: DirectoryEntry,
    parentPath: string,
    isDirectory: boolean
  ) {
    contextMenuX = e.clientX;
    contextMenuY = e.clientY;
    contextMenuTarget = { entry, parentPath, isDirectory, isRoot: false };
    contextMenuVisible = true;
  }

  // Handle right-click on empty area (root)
  function handleRootContextMenu(e: MouseEvent) {
    // Only if clicking directly on the file tree container, not on a child
    if (e.target === e.currentTarget && vault.path) {
      e.preventDefault();
      contextMenuX = e.clientX;
      contextMenuY = e.clientY;
      contextMenuTarget = {
        entry: { name: '', kind: 'directory' },
        parentPath: '',
        isDirectory: true,
        isRoot: true,
      };
      contextMenuVisible = true;
    }
  }

  function closeContextMenu() {
    contextMenuVisible = false;
  }

  // Build context menu items based on target
  const contextMenuItems = $derived.by(() => {
    if (!contextMenuTarget) return [];

    const items: MenuItem[] = [];

    // For files: add "Open in Tab" option (disabled if at tab limit)
    if (!contextMenuTarget.isDirectory && !contextMenuTarget.isRoot) {
      items.push({
        label: 'Open in Tab',
        action: () => handleAction('open-in-tab'),
        disabled: !canAddTab(),
      });
      items.push({ label: '', action: () => {}, separator: true });
    }

    items.push(
      { label: 'New File', action: () => handleAction('new-file') },
      { label: 'New Folder', action: () => handleAction('new-folder') }
    );

    // Only show Rename/Delete if not the root directory
    if (!contextMenuTarget.isRoot) {
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
      // Determine target directory path
      const targetPath = contextMenuTarget.isDirectory
        ? contextMenuTarget.isRoot
          ? ''
          : contextMenuTarget.parentPath
            ? `${contextMenuTarget.parentPath}/${contextMenuTarget.entry.name}`
            : contextMenuTarget.entry.name
        : contextMenuTarget.parentPath;

      if (filenameModalAction === 'new-file') {
        // Ensure .md extension
        const filename = value.endsWith('.md') || value.endsWith('.txt') ? value : value + '.md';
        const filePath = await createFile(targetPath, filename);
        emit('file:created', { path: filePath });
        emit('file:open', { path: filePath, pane: 'left' });
      } else if (filenameModalAction === 'new-folder') {
        await createFolder(targetPath, value);
      } else if (filenameModalAction === 'rename') {
        const oldName = contextMenuTarget.entry.name;
        if (value === oldName) return;

        const oldPath = contextMenuTarget.parentPath
          ? `${contextMenuTarget.parentPath}/${oldName}`
          : oldName;

        if (contextMenuTarget.isDirectory) {
          await renameFolder(contextMenuTarget.parentPath, oldName, value);
        } else {
          const newPath = await renameFile(contextMenuTarget.parentPath, oldName, value);
          emit('file:renamed', { oldPath, newPath });
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
    if (!contextMenuTarget || contextMenuTarget.isRoot) {
      alert('Cannot delete root directory');
      return;
    }

    const name = contextMenuTarget.entry.name;
    const type = contextMenuTarget.isDirectory ? 'folder' : 'file';

    if (!confirm(`Delete ${type} "${name}"?`)) return;

    try {
      const filePath = contextMenuTarget.parentPath
        ? `${contextMenuTarget.parentPath}/${name}`
        : name;

      await deleteEntry(contextMenuTarget.parentPath, name, contextMenuTarget.isDirectory);

      if (!contextMenuTarget.isDirectory) {
        emit('file:deleted', { path: filePath });
      }

      await refreshTree();
    } catch (err) {
      console.error('Delete failed:', err);
      alert(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function handleOpenInTab() {
    if (!contextMenuTarget || contextMenuTarget.isDirectory) return;

    const filePath = contextMenuTarget.parentPath
      ? `${contextMenuTarget.parentPath}/${contextMenuTarget.entry.name}`
      : contextMenuTarget.entry.name;

    emit('file:open', { path: filePath, pane: 'left', openInNewTab: true });
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
  {#if vault.path}
    {#if isLoading}
      <p class="status-message">Loading...</p>
    {:else if rootEntries.length === 0}
      <p class="empty-message">No files</p>
    {:else}
      {#each rootEntries as entry (entry.name)}
        <FileTreeItem
          {entry}
          parentPath=""
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
