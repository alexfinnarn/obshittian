/**
 * Settings Store - Svelte 5 runes-based store for user preferences
 *
 * These settings correspond to the config.js options in the vanilla JS version.
 * Settings are persisted to localStorage when changed.
 */

export interface Settings {
  autoOpenLastDirectory: boolean;
  autoOpenTodayNote: boolean;
  restoreLastOpenFile: boolean;
  restorePaneWidth: boolean;
  syncTempLimit: number;
  quickFilesLimit: number;
}

/**
 * Default settings values
 */
const DEFAULT_SETTINGS: Settings = {
  autoOpenLastDirectory: true,
  autoOpenTodayNote: true,
  restoreLastOpenFile: true,
  restorePaneWidth: true,
  syncTempLimit: 7,
  quickFilesLimit: 5,
};

/**
 * The settings state object - reactive via Svelte 5 runes.
 * Mutate properties directly: settings.autoOpenTodayNote = false;
 */
export const settings = $state<Settings>({ ...DEFAULT_SETTINGS });

/**
 * Update multiple settings at once
 */
export function updateSettings(newSettings: Partial<Settings>): void {
  Object.assign(settings, newSettings);
}

/**
 * Reset all settings to defaults
 */
export function resetSettings(): void {
  Object.assign(settings, DEFAULT_SETTINGS);
}

/**
 * Load settings from localStorage (call on app init)
 */
export function loadSettings(): void {
  try {
    const stored = localStorage.getItem('editorSettings');
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<Settings>;
      updateSettings(parsed);
    }
  } catch {
    // Ignore errors, use defaults
  }
}

/**
 * Save settings to localStorage
 */
export function saveSettings(): void {
  try {
    localStorage.setItem('editorSettings', JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}
