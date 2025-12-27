<script lang="ts">
  import FileTree from './FileTree.svelte';
  import TagSearch from './TagSearch.svelte';

  type TabName = 'files' | 'search';
  let activeTab = $state<TabName>('files');

  function switchTab(tab: TabName) {
    activeTab = tab;
  }
</script>

<div class="sidebar-tabs" data-testid="sidebar-tabs">
  <div class="tab-buttons" role="tablist">
    <button
      class="tab-button"
      class:active={activeTab === 'files'}
      onclick={() => switchTab('files')}
      role="tab"
      aria-selected={activeTab === 'files'}
      data-testid="files-tab-button"
    >
      Files
    </button>
    <button
      class="tab-button"
      class:active={activeTab === 'search'}
      onclick={() => switchTab('search')}
      role="tab"
      aria-selected={activeTab === 'search'}
      data-testid="search-tab-button"
    >
      Search
    </button>
  </div>

  <div class="tab-content">
    {#if activeTab === 'files'}
      <div class="tab-panel" role="tabpanel" data-testid="files-tab-panel">
        <FileTree />
      </div>
    {:else}
      <div class="tab-panel" role="tabpanel" data-testid="search-tab-panel">
        <TagSearch />
      </div>
    {/if}
  </div>
</div>

<style>
  .sidebar-tabs {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .tab-buttons {
    display: flex;
    border-bottom: 1px solid var(--border-color, #333);
    padding: 0 0.5rem;
  }

  .tab-button {
    flex: 1;
    padding: 0.5rem;
    border: none;
    background: transparent;
    color: var(--text-muted, #888);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition:
      color 0.15s,
      border-color 0.15s;
  }

  .tab-button:hover {
    color: var(--text-color, #d4d4d4);
  }

  .tab-button.active {
    color: var(--accent-color, #3794ff);
    border-bottom-color: var(--accent-color, #3794ff);
  }

  .tab-content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .tab-panel {
    height: 100%;
    overflow-y: auto;
  }
</style>
