<script lang="ts">
  import { openVault } from '$lib/stores/vault.svelte';
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
    width: 100%;
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
