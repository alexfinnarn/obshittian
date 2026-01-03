/**
 * Vault Store - Svelte 5 runes-based store for vault state
 *
 * Tracks the vault path, configuration, and open state.
 * Uses the pattern of exporting a $state object (not the variable itself)
 * to allow reactive updates across the app.
 */

import { defaultConfig } from '$lib/config';

export interface VaultState {
  path: string | null;
  dailyNotesFolder: string;
}

/**
 * The vault state object - reactive via Svelte 5 runes.
 * Mutate properties directly: vault.path = '/path/to/vault';
 */
export const vault = $state<VaultState>({
  path: null,
  dailyNotesFolder: defaultConfig.dailyNotesFolder,
});

/**
 * Check if a vault is currently open
 * (Using a getter function since $derived cannot be exported directly from modules)
 */
export function getIsVaultOpen(): boolean {
  return vault.path !== null;
}

/**
 * Open a vault by setting the path
 */
export function openVault(path: string): void {
  vault.path = path;
}

/**
 * Close the current vault
 */
export function closeVault(): void {
  vault.path = null;
}

/**
 * Update vault configuration
 */
export function updateVaultConfig(config: Partial<Omit<VaultState, 'path'>>): void {
  if (config.dailyNotesFolder !== undefined) {
    vault.dailyNotesFolder = config.dailyNotesFolder;
  }
}
