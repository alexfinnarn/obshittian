/**
 * Settings Store - Svelte 5 runes-based store for user preferences
 *
 * Default values come from src/lib/config.ts.
 * User overrides are persisted to localStorage.
 */

import {
  defaultConfig,
  type KeyboardShortcuts,
  type EditorConfig,
} from '$lib/config';

export interface Settings {
  autoOpenLastDirectory: boolean;
  autoOpenTodayNote: boolean;
  restoreLastOpenFile: boolean;
  restorePaneWidth: boolean;
  quickFilesLimit: number;
  shortcuts: KeyboardShortcuts;
  // Vault-related settings from config
  dailyNotesFolder: string;
  defaultQuickLinks: EditorConfig['defaultQuickLinks'];
  defaultQuickFiles: EditorConfig['defaultQuickFiles'];
}

/**
 * Default settings values (from config.ts)
 */
const DEFAULT_SETTINGS: Settings = {
  autoOpenLastDirectory: defaultConfig.autoOpenLastDirectory,
  autoOpenTodayNote: defaultConfig.autoOpenTodayNote,
  restoreLastOpenFile: defaultConfig.restoreLastOpenFile,
  restorePaneWidth: defaultConfig.restorePaneWidth,
  quickFilesLimit: defaultConfig.quickFilesLimit,
  shortcuts: { ...defaultConfig.shortcuts },
  dailyNotesFolder: defaultConfig.dailyNotesFolder,
  defaultQuickLinks: defaultConfig.defaultQuickLinks,
  defaultQuickFiles: defaultConfig.defaultQuickFiles,
};

/**
 * The settings state object - reactive via Svelte 5 runes.
 * Mutate properties directly: settings.autoOpenTodayNote = false;
 */
export const settings = $state<Settings>({ ...DEFAULT_SETTINGS });

/**
 * Update multiple settings at once.
 * Does a shallow merge for top-level and deep merge for shortcuts.
 */
export function updateSettings(newSettings: Partial<Settings>): void {
  // Deep merge shortcuts if provided
  if (newSettings.shortcuts) {
    settings.shortcuts = {
      ...settings.shortcuts,
      ...newSettings.shortcuts,
    };
    // Remove shortcuts from newSettings to avoid overwriting
    const { shortcuts: _, ...rest } = newSettings;
    Object.assign(settings, rest);
  } else {
    Object.assign(settings, newSettings);
  }
}

/**
 * Reset all settings to defaults
 */
export function resetSettings(): void {
  Object.assign(settings, {
    ...DEFAULT_SETTINGS,
    shortcuts: { ...DEFAULT_SETTINGS.shortcuts },
  });
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
 * Get a specific shortcut binding
 */
export function getShortcut(name: keyof KeyboardShortcuts) {
  return settings.shortcuts[name];
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
