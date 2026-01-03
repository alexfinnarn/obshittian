<script lang="ts">
  import { openVault } from '$lib/stores/vault.svelte';
  import { fileService } from '$lib/services/fileService';

  interface Props {
    onopen?: () => void;
  }

  let { onopen }: Props = $props();

  let vaultPath = $state('');
  let error = $state<string | null>(null);
  let isValidating = $state(false);

  // Load saved path on mount
  $effect(() => {
    const saved = localStorage.getItem('vaultPath');
    if (saved) vaultPath = saved;
  });

  async function handleOpen() {
    const trimmedPath = vaultPath.trim();

    if (!trimmedPath) {
      error = 'Please enter a vault path';
      return;
    }

    isValidating = true;
    error = null;

    try {
      const response = await fetch('/api/vault/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: trimmedPath }),
      });

      if (!response.ok) {
        const data = await response.json();
        error = data.error || 'Invalid path';
        return;
      }

      const data = await response.json();

      // Save to localStorage for persistence
      localStorage.setItem('vaultPath', data.path);

      // Configure fileService with vault path
      fileService.setVaultPath(data.path);

      // Update vault store
      openVault(data.path);

      onopen?.();
    } catch (err) {
      error = 'Failed to validate path';
      console.error('Vault open error:', err);
    } finally {
      isValidating = false;
    }
  }

  async function handleRestore() {
    const saved = localStorage.getItem('vaultPath');
    if (!saved) {
      error = 'No saved vault path found';
      return;
    }

    vaultPath = saved;
    await handleOpen();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleOpen();
    }
  }
</script>

<div class="vault-picker" data-testid="vault-picker">
  <div class="picker-content">
    <h2>Open Vault</h2>
    <p>Enter the full path to your notes folder:</p>

    <input
      type="text"
      bind:value={vaultPath}
      placeholder="/Users/you/Documents/notes"
      class:has-error={!!error}
      onkeydown={handleKeydown}
      data-testid="vault-path-input"
    />

    {#if error}
      <p class="error" data-testid="picker-error">{error}</p>
    {/if}

    <div class="picker-buttons">
      <button
        class="btn primary"
        onclick={handleOpen}
        disabled={isValidating}
        data-testid="open-vault-btn"
      >
        {isValidating ? 'Validating...' : 'Open Vault'}
      </button>

      {#if localStorage.getItem('vaultPath')}
        <button
          class="btn secondary"
          onclick={handleRestore}
          disabled={isValidating}
          data-testid="restore-vault-btn"
        >
          Restore Last Vault
        </button>
      {/if}
    </div>

    <div class="hints">
      <p class="hint-label">Examples:</p>
      <code>macOS: /Users/username/Documents/notes</code>
      <code>Linux: /home/username/notes</code>
      <code>Windows: C:\Users\username\Documents\notes</code>
    </div>
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
    max-width: 500px;
    width: 100%;
  }

  h2 {
    margin: 0 0 0.5rem;
    color: var(--text-color, #d4d4d4);
  }

  p {
    color: var(--text-muted, #888);
    margin: 0 0 1rem;
  }

  input[type='text'] {
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    font-family: monospace;
    border: 1px solid var(--border-color, #3a3a3a);
    border-radius: 4px;
    background: var(--input-bg, #2a2a2a);
    color: var(--text-color, #d4d4d4);
    margin-bottom: 0.5rem;
  }

  input[type='text']:focus {
    outline: none;
    border-color: var(--accent-color, #3794ff);
  }

  input[type='text'].has-error {
    border-color: var(--error-color, #f44747);
  }

  .picker-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 1rem;
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
    margin: 0.5rem 0;
    font-size: 0.9rem;
  }

  .hints {
    margin-top: 2rem;
    text-align: left;
    padding: 1rem;
    background: var(--code-bg, #2a2a2a);
    border-radius: 4px;
  }

  .hint-label {
    color: var(--text-muted, #888);
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
  }

  .hints code {
    display: block;
    font-size: 0.85rem;
    color: var(--text-color, #d4d4d4);
    padding: 0.25rem 0;
  }
</style>
