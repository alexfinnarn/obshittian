<script lang="ts">
  import Self from './FileTreeItem.svelte';
  import { emit } from '$lib/utils/eventBus';
  import { getVisibleEntries } from '$lib/utils/fileOperations';
  import type { DirectoryEntry } from '$lib/server/fileTypes';

  interface Props {
    entry: DirectoryEntry;
    parentPath: string;
    depth?: number;
    activePath?: string | null;
    oncontextmenu?: (
      e: MouseEvent,
      entry: DirectoryEntry,
      parentPath: string,
      isDirectory: boolean
    ) => void;
  }

  let {
    entry,
    parentPath,
    depth = 0,
    activePath = null,
    oncontextmenu,
  }: Props = $props();

  let isExpanded = $state(false);
  let children = $state<DirectoryEntry[]>([]);
  let isLoading = $state(false);

  // Build the full path for this entry
  const entryPath = $derived(parentPath ? `${parentPath}/${entry.name}` : entry.name);

  // Check if this file is the currently active one
  const isActive = $derived(() => {
    if (entry.kind !== 'file' || !activePath) return false;
    return activePath === entryPath;
  });

  async function loadChildren() {
    if (entry.kind !== 'directory' || isLoading) return;

    isLoading = true;
    try {
      children = await getVisibleEntries(entryPath);
    } catch (err) {
      console.error('Failed to load directory contents:', err);
      children = [];
    } finally {
      isLoading = false;
    }
  }

  function handleFileClick(e: MouseEvent) {
    e.stopPropagation();

    if (entry.kind !== 'file') return;

    emit('file:open', {
      path: entryPath,
      pane: 'left',
    });
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    oncontextmenu?.(e, entry, parentPath, entry.kind === 'directory');
  }

  function handleToggle(e: Event) {
    const details = e.target as HTMLDetailsElement;
    isExpanded = details.open;

    if (isExpanded && children.length === 0) {
      loadChildren();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleFileClick(e as unknown as MouseEvent);
    }
  }
</script>

{#if entry.kind === 'file'}
  <div
    class="file-item"
    class:active={isActive()}
    style="padding-left: {depth * 16 + 8}px"
    onclick={handleFileClick}
    onkeydown={handleKeydown}
    oncontextmenu={handleContextMenu}
    role="treeitem"
    aria-selected={isActive()}
    tabindex="0"
    data-testid="file-item-{entry.name}"
  >
    <span class="file-icon">📄</span>
    <span class="file-name">{entry.name}</span>
  </div>
{:else}
  <details
    bind:open={isExpanded}
    ontoggle={handleToggle}
    class="folder"
    data-testid="folder-{entry.name}"
  >
    <summary
      style="padding-left: {depth * 16 + 8}px"
      oncontextmenu={handleContextMenu}
      data-testid="folder-summary-{entry.name}"
    >
      <span class="folder-icon">{isExpanded ? '📂' : '📁'}</span>
      <span class="folder-name">{entry.name}</span>
    </summary>

    {#if isExpanded}
      <div class="folder-children">
        {#if isLoading}
          <div class="loading" style="padding-left: {(depth + 1) * 16 + 8}px">
            Loading...
          </div>
        {:else}
          {#each children as child (child.name)}
            <Self
              entry={child}
              parentPath={entryPath}
              depth={depth + 1}
              {activePath}
              {oncontextmenu}
            />
          {/each}
        {/if}
      </div>
    {/if}
  </details>
{/if}

<style>
  .file-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 4px 8px;
    cursor: pointer;
    color: var(--text-color, #ccc);
    border-radius: 4px;
  }

  .file-item:hover {
    background: var(--hover-bg, #2a2a2a);
  }

  .file-item.active {
    background: var(--active-bg, #0078d4);
    color: white;
  }

  .file-item:focus {
    outline: 1px solid var(--accent-color, #0078d4);
    outline-offset: -1px;
  }

  .file-icon,
  .folder-icon {
    font-size: 0.875rem;
    flex-shrink: 0;
  }

  .file-name,
  .folder-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .folder {
    user-select: none;
  }

  .folder > summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 4px 8px;
    cursor: pointer;
    color: var(--text-color, #ccc);
    border-radius: 4px;
    list-style: none;
  }

  .folder > summary::-webkit-details-marker {
    display: none;
  }

  .folder > summary::marker {
    display: none;
  }

  .folder > summary:hover {
    background: var(--hover-bg, #2a2a2a);
  }

  .folder-children {
    margin: 0;
    padding: 0;
  }

  .loading {
    color: var(--text-muted, #666);
    font-style: italic;
    padding: 4px 8px;
  }
</style>
