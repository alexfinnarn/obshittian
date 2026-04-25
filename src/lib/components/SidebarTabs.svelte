<script lang="ts">
  import FileTree from './FileTree.svelte';
  import TagSearch from './TagSearch.svelte';
  import Modal from './Modal.svelte';
  import { vaultConfig, setFileBrowserConfig } from '$lib/stores/vaultConfig.svelte';
  import { emit } from '$lib/utils/eventBus';

  type TabName = 'files' | 'search';
  let activeTab = $state<TabName>('files');

  let showFileBrowserConfig = $state(false);
  let editingHiddenPaths = $state<string[]>([]);

  function switchTab(tab: TabName) {
    activeTab = tab;
  }

  function openFileBrowserConfig() {
    editingHiddenPaths = [...vaultConfig.fileBrowser.hiddenPaths];
    showFileBrowserConfig = true;
  }

  function closeFileBrowserConfig() {
    showFileBrowserConfig = false;
    editingHiddenPaths = [];
  }

  function addPath() {
    editingHiddenPaths = [...editingHiddenPaths, ''];
  }

  function removePath(index: number) {
    editingHiddenPaths = editingHiddenPaths.filter((_, i) => i !== index);
  }

  function updatePath(index: number, value: string) {
    editingHiddenPaths[index] = value;
  }

  async function saveFileBrowserConfig() {
    const validPaths = editingHiddenPaths.map((p) => p.trim()).filter(Boolean);
    await setFileBrowserConfig({ hiddenPaths: validPaths });
    emit('tree:refresh', undefined);
    closeFileBrowserConfig();
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
    {#if activeTab === 'files'}
      <button
        class="tab-settings-btn"
        onclick={openFileBrowserConfig}
        title="Configure file browser"
        data-testid="configure-file-browser"
      >
        &#9881;
      </button>
    {/if}
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

<Modal visible={showFileBrowserConfig} title="Configure File Browser" onclose={closeFileBrowserConfig}>
  <div class="paths-editor" data-testid="hidden-paths-editor">
    <p class="paths-hint">Vault-relative paths to hide from the file tree (e.g. <code>_reports</code>)</p>
    {#each editingHiddenPaths as path, i}
      <div class="path-row" data-testid="path-row-{i}">
        <input
          type="text"
          class="path-input"
          placeholder="folder/path"
          value={path}
          oninput={(e) => updatePath(i, e.currentTarget.value)}
          data-testid="path-input-{i}"
        />
        <button
          class="path-delete"
          onclick={() => removePath(i)}
          title="Remove"
          data-testid="path-delete-{i}"
        >
          &times;
        </button>
      </div>
    {/each}
    <button class="add-path-btn" onclick={addPath} data-testid="add-hidden-path">
      + Add Path
    </button>
  </div>

  {#snippet footer()}
    <button class="btn btn-secondary" onclick={closeFileBrowserConfig} data-testid="cancel-file-browser">
      Cancel
    </button>
    <button class="btn btn-primary" onclick={saveFileBrowserConfig} data-testid="save-file-browser">
      Save
    </button>
  {/snippet}
</Modal>

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

  .tab-settings-btn {
    margin-left: auto;
    background: none;
    border: none;
    color: var(--text-muted, #888);
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    font-size: 1rem;
    opacity: 0;
    transition: opacity 0.15s;
    flex-shrink: 0;
  }

  .tab-buttons:hover .tab-settings-btn {
    opacity: 1;
  }

  .tab-settings-btn:hover {
    color: var(--text-color, #fff);
  }

  /* Modal editor styles */
  .paths-editor {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .paths-hint {
    margin: 0 0 0.25rem;
    font-size: 0.8rem;
    color: var(--text-muted, #888);
  }

  .paths-hint code {
    background: var(--input-bg, #1e1e1e);
    padding: 0.1em 0.3em;
    border-radius: 3px;
  }

  .path-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .path-input {
    flex: 1;
    padding: 0.5rem;
    background: var(--input-bg, #1e1e1e);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    color: var(--text-color, #fff);
    font-size: 0.875rem;
  }

  .path-input:focus {
    outline: none;
    border-color: var(--accent-color, #0078d4);
  }

  .path-delete {
    background: none;
    border: none;
    color: var(--text-muted, #888);
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .path-delete:hover {
    color: var(--error-color, #f44);
    background: var(--hover-bg, #3a3a3a);
  }

  .add-path-btn {
    background: none;
    border: 1px dashed var(--border-color, #444);
    color: var(--text-muted, #888);
    padding: 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .add-path-btn:hover {
    border-color: var(--accent-color, #0078d4);
    color: var(--text-color, #fff);
  }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
    border: none;
  }

  .btn-secondary {
    background: var(--button-secondary-bg, #3a3a3a);
    color: var(--text-color, #fff);
  }

  .btn-secondary:hover {
    background: var(--button-secondary-hover, #444);
  }

  .btn-primary {
    background: var(--accent-color, #0078d4);
    color: white;
  }

  .btn-primary:hover {
    background: var(--accent-color-hover, #006cbd);
  }
</style>
