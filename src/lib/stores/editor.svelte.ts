/**
 * Editor Store
 *
 * Manages state for the dual-pane editor including:
 * - File paths for each pane
 * - Content and dirty state
 * - Focus tracking for keyboard shortcuts
 *
 * Uses Svelte 5 runes ($state) for reactivity.
 */

export type PaneId = 'left' | 'right';

export interface PaneState {
  /** Relative path from vault root to file (null if no file open) */
  filePath: string | null;
  /** Current content of the editor */
  content: string;
  /** Whether the content has unsaved changes */
  isDirty: boolean;
}

export interface EditorState {
  left: PaneState;
  right: PaneState;
  /** Which pane currently has focus (for keyboard shortcuts) */
  focusedPane: PaneId | null;
}

function createInitialPaneState(): PaneState {
  return {
    filePath: null,
    content: '',
    isDirty: false,
  };
}

/**
 * Global editor state
 */
export const editor = $state<EditorState>({
  left: createInitialPaneState(),
  right: createInitialPaneState(),
  focusedPane: null,
});

/**
 * Open a file in the specified pane
 */
export function openFileInPane(pane: PaneId, filePath: string, content: string): void {
  editor[pane] = {
    filePath,
    content,
    isDirty: false,
  };
}

/**
 * Update the content of a pane (marks as dirty)
 */
export function updatePaneContent(pane: PaneId, content: string): void {
  editor[pane].content = content;
  editor[pane].isDirty = true;
}

/**
 * Mark a pane as dirty (has unsaved changes)
 */
export function markPaneDirty(pane: PaneId): void {
  editor[pane].isDirty = true;
}

/**
 * Mark a pane as clean (saved)
 */
export function markPaneClean(pane: PaneId, content?: string): void {
  if (content !== undefined) {
    editor[pane].content = content;
  }
  editor[pane].isDirty = false;
}

/**
 * Close the file in a pane
 */
export function closePaneFile(pane: PaneId): void {
  editor[pane] = createInitialPaneState();
}

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
 * Check if a pane has a file open
 */
export function isPaneFileOpen(pane: PaneId): boolean {
  return editor[pane].filePath !== null;
}

/**
 * Get pane state (readonly snapshot)
 */
export function getPaneState(pane: PaneId): PaneState {
  return editor[pane];
}

/**
 * Get the filename for a pane (or empty string if no file)
 */
export function getPaneFilename(pane: PaneId): string {
  const filePath = editor[pane].filePath;
  if (!filePath) return '';
  return filePath.split('/').pop() ?? '';
}

/**
 * Reset editor state (for testing)
 */
export function resetEditorState(): void {
  editor.left = createInitialPaneState();
  editor.right = createInitialPaneState();
  editor.focusedPane = null;
}
