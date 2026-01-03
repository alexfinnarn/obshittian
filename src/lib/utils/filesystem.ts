/**
 * Filesystem Utilities
 *
 * localStorage helpers for persisting editor state.
 */

// ============================================================================
// Vault path persistence
// ============================================================================

/**
 * Save the vault path to localStorage
 */
export function saveVaultPath(path: string): void {
  localStorage.setItem('vaultPath', path);
}

/**
 * Get the saved vault path from localStorage
 */
export function getVaultPath(): string | null {
  return localStorage.getItem('vaultPath');
}

/**
 * Clear the saved vault path
 */
export function clearVaultPath(): void {
  localStorage.removeItem('vaultPath');
}

// ============================================================================
// File state persistence
// ============================================================================

/**
 * Save the path of the last opened file
 */
export function saveLastOpenFile(relativePath: string): void {
  localStorage.setItem('editorLastOpenFile', relativePath);
}

/**
 * Get the path of the last opened file
 */
export function getLastOpenFile(): string | null {
  return localStorage.getItem('editorLastOpenFile');
}

/**
 * Save the pane width (as percentage or pixels)
 */
export function savePaneWidth(width: number): void {
  localStorage.setItem('editorPaneWidth', String(width));
}

/**
 * Get the saved pane width
 */
export function getPaneWidth(): number | null {
  const stored = localStorage.getItem('editorPaneWidth');
  return stored ? Number(stored) : null;
}
