# Phase 04: Vault Picker and Configuration

**Status:** Pending
**Output:** Path-based vault picker and configuration persistence

## Objective

Replace the OS file picker with a text input for vault path and persist the configuration.

## Tasks

- [ ] Create new `VaultPicker.svelte` with path text input
- [ ] Add vault path validation (check directory exists via API)
- [ ] Store vault path in localStorage for persistence
- [ ] Update `vault.svelte.ts` store to use path string instead of handle
- [ ] Add vault path to server-side session/config
- [ ] Create `/api/vault/validate/+server.ts` to check path validity
- [ ] Add helpful error messages for invalid paths
- [ ] Add example path hints based on OS detection
- [ ] Remove `global.d.ts` File System Access API types (no longer needed)
- [ ] Remove IndexedDB directory handle storage

## New VaultPicker Component

```svelte
<!-- src/lib/components/VaultPicker.svelte -->
<script lang="ts">
  import { fileService } from '$lib/services/fileService';

  interface Props {
    onopen: () => void;
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
    if (!vaultPath.trim()) {
      error = 'Please enter a vault path';
      return;
    }

    isValidating = true;
    error = null;

    try {
      const response = await fetch('/api/vault/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: vaultPath.trim() })
      });

      if (!response.ok) {
        const data = await response.json();
        error = data.error || 'Invalid path';
        return;
      }

      // Save and configure
      localStorage.setItem('vaultPath', vaultPath.trim());
      fileService.setVaultPath(vaultPath.trim());
      onopen();
    } catch (err) {
      error = 'Failed to validate path';
    } finally {
      isValidating = false;
    }
  }
</script>

<div class="vault-picker">
  <h1>Open Vault</h1>
  <p>Enter the full path to your notes folder:</p>

  <input
    type="text"
    bind:value={vaultPath}
    placeholder="/Users/you/Documents/notes"
    class:error={!!error}
  />

  {#if error}
    <p class="error-message">{error}</p>
  {/if}

  <button onclick={handleOpen} disabled={isValidating}>
    {isValidating ? 'Validating...' : 'Open Vault'}
  </button>

  <div class="hints">
    <p>Examples:</p>
    <code>macOS: /Users/username/Documents/notes</code>
    <code>Linux: /home/username/notes</code>
    <code>Windows: C:\Users\username\Documents\notes</code>
  </div>
</div>
```

## Vault Validation API

```typescript
// src/routes/api/vault/validate/+server.ts
import { json, error } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

export async function POST({ request }) {
  const { path: vaultPath } = await request.json();

  if (!vaultPath || typeof vaultPath !== 'string') {
    throw error(400, 'Path is required');
  }

  // Resolve and validate path
  const resolved = path.resolve(vaultPath);

  try {
    const stat = await fs.stat(resolved);

    if (!stat.isDirectory()) {
      throw error(400, 'Path is not a directory');
    }

    // Check read/write permissions
    await fs.access(resolved, fs.constants.R_OK | fs.constants.W_OK);

    return json({ valid: true, path: resolved });
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw error(404, 'Directory does not exist');
    }
    if (err.code === 'EACCES') {
      throw error(403, 'No read/write permission');
    }
    throw error(400, err.message);
  }
}
```

## Store Updates

```typescript
// src/lib/stores/vault.svelte.ts (updated)
interface VaultState {
  path: string | null;           // Changed from rootDirHandle
  dailyNotesFolder: string;
}

export const vault = $state<VaultState>({
  path: null,
  dailyNotesFolder: 'zzz_Daily Notes',
});

export function openVault(path: string): void {
  vault.path = path;
}

export function closeVault(): void {
  vault.path = null;
}

export function getIsVaultOpen(): boolean {
  return vault.path !== null;
}
```

## Dependencies

- Phase 03 complete (fileService exists)

## Acceptance Criteria

- [ ] User can enter vault path in text input
- [ ] Invalid paths show clear error message
- [ ] Valid paths open the vault and persist to localStorage
- [ ] App restores vault path on reload
- [ ] Path hints shown for different operating systems
- [ ] No File System Access API code remains
