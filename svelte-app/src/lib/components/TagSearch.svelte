<script lang="ts">
  import { searchTags, getAllTags } from '$lib/utils/tags';
  import { tagsStore, getFilesForTag, setSelectedTag } from '$lib/stores/tags.svelte';
  import { emit } from '$lib/utils/eventBus';

  let searchQuery = $state('');
  let searchResults = $state<Array<{ tag: string; count: number }>>([]);
  let fileResults = $state<string[]>([]);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Show all tags when no search query
  let displayTags = $derived(searchQuery.trim() ? searchResults : getAllTags().slice(0, 20));

  function handleSearchInput(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    searchQuery = query;

    // Clear file results when search changes
    setSelectedTag(null);
    fileResults = [];

    // Debounce the search
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (query.trim()) {
        searchResults = searchTags(query.trim());
      } else {
        searchResults = [];
      }
    }, 150);
  }

  function handleTagClick(tag: string) {
    setSelectedTag(tag);
    fileResults = getFilesForTag(tag);
  }

  function handleFileClick(path: string) {
    emit('file:open', { path, pane: 'left' });
  }

  function getFilename(path: string): string {
    return path.split('/').pop() || path;
  }
</script>

<div class="tag-search" data-testid="tag-search">
  <input
    type="text"
    class="search-input"
    placeholder="Search tags..."
    value={searchQuery}
    oninput={handleSearchInput}
    data-testid="tag-search-input"
  />

  <div class="tag-results" data-testid="tag-results">
    {#if tagsStore.isIndexing}
      <div class="search-status">Indexing tags...</div>
    {:else if searchQuery && displayTags.length === 0}
      <div class="search-status">No matching tags</div>
    {:else if !searchQuery && displayTags.length === 0}
      <div class="search-status">No tags found</div>
    {:else}
      {#each displayTags as result}
        <button
          class="tag-item"
          class:active={tagsStore.selectedTag === result.tag}
          onclick={() => handleTagClick(result.tag)}
          data-testid="tag-item"
        >
          {result.tag}
          <span class="tag-count">{result.count}</span>
        </button>
      {/each}
    {/if}
  </div>

  {#if tagsStore.selectedTag && fileResults.length > 0}
    <div class="file-results" data-testid="file-results">
      <div class="file-results-header">Files with #{tagsStore.selectedTag}</div>
      {#each fileResults as path}
        <button
          class="file-result-item"
          title={path}
          onclick={() => handleFileClick(path)}
          data-testid="file-result-item"
        >
          {getFilename(path)}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .tag-search {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .search-input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border-color, #333);
    border-radius: 4px;
    background: var(--input-bg, #2d2d2d);
    color: var(--text-color, #d4d4d4);
    font-size: 0.875rem;
    box-sizing: border-box;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--accent-color, #3794ff);
  }

  .tag-results {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    min-height: 1.5rem;
  }

  .search-status {
    color: var(--text-muted, #888);
    font-size: 0.875rem;
    font-style: italic;
    padding: 0.25rem;
  }

  .tag-item {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border: none;
    border-radius: 4px;
    background: var(--tag-bg, #3a3a3a);
    color: var(--text-color, #d4d4d4);
    font-size: 0.75rem;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .tag-item:hover {
    background: var(--hover-bg, #4a4a4a);
  }

  .tag-item.active {
    background: var(--accent-color, #3794ff);
    color: white;
  }

  .tag-count {
    font-size: 0.625rem;
    opacity: 0.7;
    background: rgba(0, 0, 0, 0.2);
    padding: 0.125rem 0.25rem;
    border-radius: 2px;
  }

  .file-results {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.5rem;
    border-top: 1px solid var(--border-color, #333);
    padding-top: 0.5rem;
  }

  .file-results-header {
    font-size: 0.75rem;
    color: var(--text-muted, #888);
    padding: 0.25rem 0;
  }

  .file-result-item {
    display: block;
    width: 100%;
    padding: 0.375rem 0.5rem;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-color, #d4d4d4);
    font-size: 0.875rem;
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-result-item:hover {
    background: var(--hover-bg, #333);
  }
</style>
