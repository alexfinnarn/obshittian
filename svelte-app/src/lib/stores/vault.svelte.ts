/**
 * Vault Store - Svelte 5 runes-based store for vault state
 *
 * Tracks the root directory handle, vault configuration, and open state.
 * Uses the pattern of exporting a $state object (not the variable itself)
 * to allow reactive updates across the app.
 */

export interface VaultState {
  rootDirHandle: FileSystemDirectoryHandle | null;
  dailyNotesFolder: string;
  syncDirectory: string;
}

/**
 * The vault state object - reactive via Svelte 5 runes.
 * Mutate properties directly: vault.rootDirHandle = handle;
 */
export const vault = $state<VaultState>({
  rootDirHandle: null,
  dailyNotesFolder: 'zzz_Daily Notes',
  syncDirectory: 'zzzz_exports',
});

/**
 * Check if a vault is currently open
 * (Using a getter function since $derived cannot be exported directly from modules)
 */
export function getIsVaultOpen(): boolean {
  return vault.rootDirHandle !== null;
}

/**
 * Open a vault by setting the root directory handle
 */
export function openVault(handle: FileSystemDirectoryHandle): void {
  vault.rootDirHandle = handle;
}

/**
 * Close the current vault
 */
export function closeVault(): void {
  vault.rootDirHandle = null;
}

/**
 * Update vault configuration
 */
export function updateVaultConfig(config: Partial<Omit<VaultState, 'rootDirHandle'>>): void {
  if (config.dailyNotesFolder !== undefined) {
    vault.dailyNotesFolder = config.dailyNotesFolder;
  }
  if (config.syncDirectory !== undefined) {
    vault.syncDirectory = config.syncDirectory;
  }
}
