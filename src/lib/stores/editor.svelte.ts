/**
 * Editor Store
 *
 * Manages focus tracking for the dual-pane editor.
 * Used by keyboard shortcuts to determine which pane should handle the action.
 *
 * Note: Content state is managed by tabs.svelte.ts (left pane) and
 * journal.svelte.ts (right pane), not this store.
 *
 * Uses Svelte 5 runes ($state) for reactivity.
 */

export type PaneId = 'left' | 'right';

/**
 * Editor state - just focus tracking
 */
export const editor = $state<{
  /** Which pane currently has focus (for keyboard shortcuts) */
  focusedPane: PaneId | null;
}>({
  focusedPane: null,
});

/**
 * Set which pane is focused
 */
export function setFocusedPane(pane: PaneId | null): void {
  editor.focusedPane = pane;
}

/**
 * Get the currently focused pane ID
 */
export function getFocusedPane(): PaneId | null {
  return editor.focusedPane;
}

/**
 * Reset editor state (for testing)
 */
export function resetEditorState(): void {
  editor.focusedPane = null;
}
