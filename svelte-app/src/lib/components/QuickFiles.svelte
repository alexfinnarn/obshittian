<script lang="ts">
  import Modal from './Modal.svelte';
  import { vaultConfig, setQuickFiles, type QuickFile } from '$lib/stores/vaultConfig.svelte';
  import { vault } from '$lib/stores/vault.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { emit } from '$lib/utils/eventBus';

  let showConfigModal = $state(false);
  let editingFiles = $state<QuickFile[]>([]);

  function openModal() {
    // Copy current files for editing
    editingFiles = vaultConfig.quickFiles.map((file) => ({ ...file }));
    showConfigModal = true;
  }

  function closeModal() {
    showConfigModal = false;
    editingFiles = [];
  }

  function addFile() {
    if (editingFiles.length >= settings.quickFilesLimit) {
      alert(`Maximum ${settings.quickFilesLimit} quick files allowed`);
      return;
    }
    editingFiles = [...editingFiles, { name: '', path: '' }];
  }

  function removeFile(index: number) {
    editingFiles = editingFiles.filter((_, i) => i !== index);
  }

  function updateFileName(index: number, name: string) {
    editingFiles[index].name = name;
  }

  function updateFilePath(index: number, path: string) {
    editingFiles[index].path = path;
  }

  async function browseFile(index: number) {
    if (!vault.rootDirHandle) {
      alert('Please open a folder first');
      return;
    }

    try {
      // Use showOpenFilePicker to select a file
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'Markdown files',
          accept: { 'text/markdown': ['.md'] }
        }],
        multiple: false
      });

      // Get relative path from root
      const pathParts = await vault.rootDirHandle.resolve(fileHandle);
      if (pathParts) {
        const path = pathParts.join('/');
        updateFilePath(index, path);
        // Auto-fill name if empty
        if (!editingFiles[index].name) {
          const filename = pathParts[pathParts.length - 1];
          editingFiles[index].name = filename.replace(/\.md$/, '');
        }
      } else {
        alert('Selected file must be within the opened folder');
      }
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') {
        console.error('Error picking file:', err);
      }
    }
  }

  async function saveFiles() {
    // Filter out empty files and enforce limit
    let validFiles = editingFiles.filter((file) => file.name.trim() && file.path.trim());

    if (validFiles.length > settings.quickFilesLimit) {
      alert(`Maximum ${settings.quickFilesLimit} quick files allowed. Keeping first ${settings.quickFilesLimit}.`);
      validFiles = validFiles.slice(0, settings.quickFilesLimit);
    }

    await setQuickFiles(validFiles);
    closeModal();
  }

  function handleFileClick(_event: MouseEvent, file: QuickFile) {
    // Emit file:open event with path for left pane
    emit('file:open', { path: file.path, pane: 'left' });
  }
</script>

<section class="quick-files-section" data-testid="quick-files-section">
  <header class="section-header">
    <h3>Quick Files</h3>
    <button
      class="configure-btn"
      onclick={openModal}
      title="Configure Quick Files"
      data-testid="configure-quick-files"
    >
      &#9881;
    </button>
  </header>

  <div class="quick-files" data-testid="quick-files">
    {#each vaultConfig.quickFiles as file, i}
      <button
        type="button"
        class="quick-file-link"
        onclick={(e) => handleFileClick(e, file)}
        data-testid="quick-file-{i}"
        title={file.path}
      >
        {file.name}
      </button>
    {/each}
    {#if vaultConfig.quickFiles.length === 0}
      <p class="empty-message">No quick files configured</p>
    {/if}
  </div>
</section>

<Modal visible={showConfigModal} title="Configure Quick Files" onclose={closeModal}>
  <div class="files-editor" data-testid="files-editor">
    {#each editingFiles as file, i}
      <div class="file-row" data-testid="file-row-{i}">
        <input
          type="text"
          class="file-name"
          placeholder="Display name"
          value={file.name}
          oninput={(e) => updateFileName(i, e.currentTarget.value)}
          data-testid="file-name-{i}"
        />
        <span class="file-path" data-testid="file-path-{i}" title={file.path}>
          {file.path || 'No file selected'}
        </span>
        <button
          class="file-browse"
          onclick={() => browseFile(i)}
          title="Browse"
          data-testid="file-browse-{i}"
        >
          &#128193;
        </button>
        <button
          class="file-delete"
          onclick={() => removeFile(i)}
          title="Delete"
          data-testid="file-delete-{i}"
        >
          &times;
        </button>
      </div>
    {/each}

    <button class="add-file-btn" onclick={addFile} data-testid="add-file">
      + Add File
    </button>
  </div>

  {#snippet footer()}
    <button class="btn btn-secondary" onclick={closeModal} data-testid="cancel-files">
      Cancel
    </button>
    <button class="btn btn-primary" onclick={saveFiles} data-testid="save-files">
      Save
    </button>
  {/snippet}
</Modal>

<style>
  .quick-files-section {
    padding: 0.5rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0.5rem;
  }

  .section-header h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-muted, #888);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .configure-btn {
    background: none;
    border: none;
    color: var(--text-muted, #888);
    cursor: pointer;
    padding: 0.25rem;
    font-size: 1rem;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .quick-files-section:hover .configure-btn {
    opacity: 1;
  }

  .configure-btn:hover {
    color: var(--text-color, #fff);
  }

  .quick-files {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.25rem 0.5rem;
  }

  .quick-file-link {
    color: var(--file-color, #ffd700);
    text-decoration: none;
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    background: var(--file-bg, rgba(255, 215, 0, 0.1));
    border: none;
    cursor: pointer;
  }

  .quick-file-link:hover {
    background: var(--file-bg-hover, rgba(255, 215, 0, 0.2));
    text-decoration: underline;
  }

  .empty-message {
    color: var(--text-muted, #666);
    font-size: 0.875rem;
    font-style: italic;
    margin: 0;
  }

  /* Modal editor styles */
  .files-editor {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 450px;
  }

  .file-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .file-name {
    flex: 1;
    min-width: 100px;
    padding: 0.5rem;
    background: var(--input-bg, #1e1e1e);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    color: var(--text-color, #fff);
    font-size: 0.875rem;
  }

  .file-name:focus {
    outline: none;
    border-color: var(--accent-color, #0078d4);
  }

  .file-path {
    flex: 2;
    min-width: 150px;
    padding: 0.5rem;
    background: var(--input-bg, #1e1e1e);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    color: var(--text-muted, #888);
    font-size: 0.75rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .file-browse {
    background: none;
    border: 1px solid var(--border-color, #444);
    color: var(--text-muted, #888);
    font-size: 1rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .file-browse:hover {
    color: var(--text-color, #fff);
    border-color: var(--accent-color, #0078d4);
  }

  .file-delete {
    background: none;
    border: none;
    color: var(--text-muted, #888);
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .file-delete:hover {
    color: var(--error-color, #f44);
    background: var(--hover-bg, #3a3a3a);
  }

  .add-file-btn {
    background: none;
    border: 1px dashed var(--border-color, #444);
    color: var(--text-muted, #888);
    padding: 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .add-file-btn:hover {
    border-color: var(--accent-color, #0078d4);
    color: var(--text-color, #fff);
  }

  /* Footer buttons */
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
