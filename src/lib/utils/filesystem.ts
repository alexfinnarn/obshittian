/**
 * Filesystem Utilities
 *
 * localStorage helpers for persisting editor state.
 * Uses the persistence utility for consistent storage operations.
 */

import {
	createStringStorage,
	createNumberStorage,
	silentErrorHandler,
	STORAGE_KEYS
} from './persistence';

// ============================================================================
// Storage instances
// ============================================================================

const vaultPathStorage = createStringStorage(STORAGE_KEYS.VAULT_PATH, {
	onError: silentErrorHandler
});

const lastOpenFileStorage = createStringStorage(STORAGE_KEYS.LAST_OPEN_FILE, {
	onError: silentErrorHandler
});

const paneWidthStorage = createNumberStorage(STORAGE_KEYS.PANE_WIDTH, {
	onError: silentErrorHandler
});

// ============================================================================
// Vault path persistence
// ============================================================================

/**
 * Save the vault path to localStorage
 */
export function saveVaultPath(path: string): void {
	vaultPathStorage.save(path);
}

/**
 * Get the saved vault path from localStorage
 */
export function getVaultPath(): string | null {
	return vaultPathStorage.load();
}

/**
 * Clear the saved vault path
 */
export function clearVaultPath(): void {
	vaultPathStorage.clear();
}

// ============================================================================
// File state persistence
// ============================================================================

/**
 * Save the path of the last opened file
 */
export function saveLastOpenFile(relativePath: string): void {
	lastOpenFileStorage.save(relativePath);
}

/**
 * Get the path of the last opened file
 */
export function getLastOpenFile(): string | null {
	return lastOpenFileStorage.load();
}

/**
 * Save the pane width (as percentage or pixels)
 */
export function savePaneWidth(width: number): void {
	paneWidthStorage.save(width);
}

/**
 * Get the saved pane width
 */
export function getPaneWidth(): number | null {
	return paneWidthStorage.load();
}
