/**
 * Filesystem Utilities
 *
 * localStorage helpers for persisting editor state.
 * Uses the persistence utility for consistent storage operations.
 */

import {
	createStorage,
	createStringStorage,
	createNumberStorage,
	silentErrorHandler,
	STORAGE_KEYS
} from './persistence';

export type CollapsedPane = 'left' | 'right';

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

const collapsedPaneStorage = createStorage<CollapsedPane>(STORAGE_KEYS.COLLAPSED_PANE, {
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

/**
 * Save which pane is collapsed.
 */
export function saveCollapsedPane(pane: CollapsedPane): void {
	collapsedPaneStorage.save(pane);
}

/**
 * Get the saved collapsed pane.
 */
export function getCollapsedPane(): CollapsedPane | null {
	const pane = collapsedPaneStorage.load();
	return pane === 'left' || pane === 'right' ? pane : null;
}

/**
 * Clear the saved collapsed pane.
 */
export function clearCollapsedPane(): void {
	collapsedPaneStorage.clear();
}
