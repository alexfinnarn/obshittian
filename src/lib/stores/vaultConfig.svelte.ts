/**
 * Vault Config Store - Svelte 5 runes-based store for vault-specific configuration
 *
 * Stores quick links and quick files from .editor-config.json.
 * Falls back to defaults when vault config doesn't exist.
 */

import { vault } from './vault.svelte';
import { fileService } from '$lib/services/fileService';

const CONFIG_FILENAME = '.editor-config.json';

export interface QuickLink {
  name: string;
  url: string;
}

export interface QuickFile {
  name: string;
  path: string;
}

export interface VaultConfig {
  quickLinks: QuickLink[];
  quickFiles: QuickFile[];
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: VaultConfig = {
  quickLinks: [],
  quickFiles: [],
};

/**
 * The vault config state - reactive via Svelte 5 runes.
 */
export const vaultConfig = $state<VaultConfig>({
  quickLinks: [],
  quickFiles: [],
});

/**
 * Get current quick links
 */
export function getQuickLinks(): QuickLink[] {
  return vaultConfig.quickLinks;
}

/**
 * Set quick links and save to vault
 */
export async function setQuickLinks(links: QuickLink[]): Promise<boolean> {
  vaultConfig.quickLinks = links;
  return await saveVaultConfig();
}

/**
 * Get current quick files
 */
export function getQuickFiles(): QuickFile[] {
  return vaultConfig.quickFiles;
}

/**
 * Set quick files and save to vault
 */
export async function setQuickFiles(files: QuickFile[]): Promise<boolean> {
  vaultConfig.quickFiles = files;
  return await saveVaultConfig();
}

/**
 * Load vault config from .editor-config.json
 * Falls back to defaults when file doesn't exist.
 */
export async function loadVaultConfig(
  defaults?: Partial<VaultConfig>
): Promise<VaultConfig> {
  if (!vault.path) {
    // No vault open, use defaults
    vaultConfig.quickLinks = defaults?.quickLinks ?? DEFAULT_CONFIG.quickLinks;
    vaultConfig.quickFiles = defaults?.quickFiles ?? DEFAULT_CONFIG.quickFiles;
    return { ...vaultConfig };
  }

  try {
    const existsResult = await fileService.exists(CONFIG_FILENAME);
    if (!existsResult.exists) {
      vaultConfig.quickLinks = defaults?.quickLinks ?? DEFAULT_CONFIG.quickLinks;
      vaultConfig.quickFiles = defaults?.quickFiles ?? DEFAULT_CONFIG.quickFiles;
      return { ...vaultConfig };
    }

    const text = await fileService.readFile(CONFIG_FILENAME);
    const parsed = JSON.parse(text) as Partial<VaultConfig>;

    // Use vault config values, falling back to provided defaults
    vaultConfig.quickLinks = parsed.quickLinks ?? defaults?.quickLinks ?? DEFAULT_CONFIG.quickLinks;
    vaultConfig.quickFiles = parsed.quickFiles ?? defaults?.quickFiles ?? DEFAULT_CONFIG.quickFiles;
  } catch (err) {
    // File doesn't exist or is invalid - use defaults
    console.warn('Error reading vault config:', (err as Error).message);
    vaultConfig.quickLinks = defaults?.quickLinks ?? DEFAULT_CONFIG.quickLinks;
    vaultConfig.quickFiles = defaults?.quickFiles ?? DEFAULT_CONFIG.quickFiles;
  }

  return { ...vaultConfig };
}

/**
 * Save current config to .editor-config.json
 */
export async function saveVaultConfig(): Promise<boolean> {
  if (!vault.path) {
    console.error('Cannot save vault config: no directory open');
    return false;
  }

  try {
    const data: VaultConfig = {
      quickLinks: vaultConfig.quickLinks,
      quickFiles: vaultConfig.quickFiles,
    };
    await fileService.writeFile(CONFIG_FILENAME, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving vault config:', err);
    return false;
  }
}

/**
 * Reset vault config to defaults
 */
export function resetVaultConfig(): void {
  vaultConfig.quickLinks = [];
  vaultConfig.quickFiles = [];
}
