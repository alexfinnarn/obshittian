/**
 * Editor Configuration
 *
 * This file contains default configuration values for the editor.
 * Users can customize these by editing this file directly.
 *
 * Settings are loaded into the settings store on app init, and user
 * overrides are persisted to localStorage.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type ModifierKey = 'ctrl' | 'meta' | 'alt' | 'shift';

export interface KeyBinding {
  /** The key to press (e.g., 's', 'e', 'Tab', 'ArrowLeft') */
  key: string;
  /** Modifier keys required (ctrl, meta/cmd, alt, shift) */
  modifiers: ModifierKey[];
}

export interface KeyboardShortcuts {
  /** Save the current file/entry */
  save: KeyBinding;
  /** Toggle edit/view mode for focused pane */
  toggleView: KeyBinding;
  /** Close current tab (left pane only) */
  closeTab: KeyBinding;
  /** Switch to next tab */
  nextTab: KeyBinding;
  /** Switch to previous tab */
  prevTab: KeyBinding;
}

export interface EditorConfig {
  // ---- Vault Settings ----
  /** Full path to Obsidian vault (used by Claude Code workflows) */
  obsidianVaultPath: string;
  /** Folder name for daily notes (created under root directory) */
  dailyNotesFolder: string;

  // ---- Behavior Settings ----
  /** Automatically reopen the last used directory on page load */
  autoOpenLastDirectory: boolean;
  /** Auto-open today's daily note when opening a directory */
  autoOpenTodayNote: boolean;
  /** Remember and restore the last opened file in the left pane */
  restoreLastOpenFile: boolean;
  /** Remember and restore pane widths after resizing */
  restorePaneWidth: boolean;

  // ---- Quick Access Settings ----
  /** Maximum number of quick file tabs */
  quickFilesLimit: number;
  /** Default quick links (fallback when no .editor-config.json in vault) */
  defaultQuickLinks: { name: string; url: string }[];
  /** Default quick files (fallback when no .editor-config.json in vault) */
  defaultQuickFiles: { name: string; path: string }[];

  // ---- Journal Settings ----
  /** Default journal entry types (fallback when no .editor-config.json in vault) */
  defaultJournalEntryTypes: string[];

  // ---- Keyboard Shortcuts ----
  shortcuts: KeyboardShortcuts;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const defaultConfig: EditorConfig = {
  // Vault Settings
  obsidianVaultPath: '/Users/alexfinnarn/Documents/Obsidian Vault',
  dailyNotesFolder: 'zzz_Daily Notes',

  // Behavior Settings
  autoOpenLastDirectory: true,
  autoOpenTodayNote: true,
  restoreLastOpenFile: true,
  restorePaneWidth: true,

  // Quick Access Settings
  quickFilesLimit: 5,
  defaultQuickLinks: [
    { name: 'Gmail', url: 'https://mail.google.com/mail/u/0/#inbox' },
  ],
  defaultQuickFiles: [
    { name: 'Todo', path: '01_Todo.md' },
  ],

  // Journal Settings
  defaultJournalEntryTypes: ['note', 'task', 'idea'],

  // Keyboard Shortcuts
  // Note: 'meta' = Cmd on Mac, Ctrl on Windows/Linux
  // Use ['meta'] for Cmd/Ctrl, or ['ctrl'] for Ctrl-only
  shortcuts: {
    save: { key: 's', modifiers: ['meta'] },
    toggleView: { key: 'e', modifiers: ['meta'] },
    closeTab: { key: 'w', modifiers: ['meta'] },
    nextTab: { key: 'Tab', modifiers: ['meta'] },
    prevTab: { key: 'Tab', modifiers: ['meta', 'shift'] },
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a keyboard event matches a key binding.
 * 'meta' modifier matches both metaKey (Cmd) and ctrlKey for cross-platform support.
 */
export function matchesKeyBinding(event: KeyboardEvent, binding: KeyBinding): boolean {
  // Check the key
  if (event.key !== binding.key) {
    return false;
  }

  // Check modifiers
  for (const mod of binding.modifiers) {
    if (mod === 'meta') {
      // 'meta' matches either Cmd (metaKey) or Ctrl (ctrlKey)
      if (!event.metaKey && !event.ctrlKey) {
        return false;
      }
    } else if (mod === 'ctrl') {
      // 'ctrl' matches only Ctrl
      if (!event.ctrlKey) {
        return false;
      }
    } else if (mod === 'alt') {
      if (!event.altKey) {
        return false;
      }
    } else if (mod === 'shift') {
      if (!event.shiftKey) {
        return false;
      }
    }
  }

  // Make sure no extra modifiers are pressed (except when 'meta' allows both)
  const hasMeta = binding.modifiers.includes('meta');
  const hasCtrl = binding.modifiers.includes('ctrl');
  const hasAlt = binding.modifiers.includes('alt');
  const hasShift = binding.modifiers.includes('shift');

  // If 'meta' is in modifiers, either metaKey or ctrlKey can be pressed
  if (!hasMeta && !hasCtrl && (event.metaKey || event.ctrlKey)) {
    return false;
  }
  if (!hasAlt && event.altKey) {
    return false;
  }
  if (!hasShift && event.shiftKey) {
    return false;
  }

  return true;
}

/**
 * Format a key binding for display (e.g., "Cmd+S" or "Ctrl+Shift+Tab")
 */
export function formatKeyBinding(binding: KeyBinding): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

  const modifierNames: Record<ModifierKey, string> = {
    meta: isMac ? 'Cmd' : 'Ctrl',
    ctrl: 'Ctrl',
    alt: isMac ? 'Option' : 'Alt',
    shift: 'Shift',
  };

  const parts = binding.modifiers.map((mod) => modifierNames[mod]);

  // Format special keys nicely
  const keyName =
    binding.key === 'ArrowLeft' ? '←' :
    binding.key === 'ArrowRight' ? '→' :
    binding.key === 'ArrowUp' ? '↑' :
    binding.key === 'ArrowDown' ? '↓' :
    binding.key.length === 1 ? binding.key.toUpperCase() :
    binding.key;

  parts.push(keyName);
  return parts.join('+');
}
