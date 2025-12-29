/**
 * Shortcuts Store - Manages keyboard shortcut blocking contexts
 *
 * Provides a mechanism for UI elements (modals, inputs) to temporarily
 * block global keyboard shortcuts while they have focus.
 */

interface ShortcutsState {
  /** Array of reasons why shortcuts are currently blocked */
  blockedBy: string[];
}

/**
 * Reactive state for shortcut blocking
 */
export const shortcutsStore: ShortcutsState = $state({
  blockedBy: [],
});

/**
 * Block keyboard shortcuts for a given reason.
 * Returns an unblock function that should be called when the blocker is removed.
 *
 * @example
 * // In a modal component:
 * const unblock = blockShortcuts('modal');
 * // ... later when modal closes:
 * unblock();
 */
export function blockShortcuts(reason: string): () => void {
  if (!shortcutsStore.blockedBy.includes(reason)) {
    shortcutsStore.blockedBy.push(reason);
  }

  return () => {
    const index = shortcutsStore.blockedBy.indexOf(reason);
    if (index > -1) {
      shortcutsStore.blockedBy.splice(index, 1);
    }
  };
}

/**
 * Check if keyboard shortcuts are currently blocked
 */
export function areShortcutsBlocked(): boolean {
  return shortcutsStore.blockedBy.length > 0;
}

/**
 * Get the list of current blocking reasons (useful for debugging)
 */
export function getBlockingReasons(): string[] {
  return [...shortcutsStore.blockedBy];
}

/**
 * Clear all blocking reasons (useful for testing)
 */
export function clearAllBlocks(): void {
  shortcutsStore.blockedBy = [];
}
