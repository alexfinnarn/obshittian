/**
 * Tab types and interfaces for the left editor pane.
 * The left pane supports multiple tabs, while the right pane is single-file mode for daily notes.
 */

export interface Tab {
  /** Unique identifier for the tab */
  id: string;
  /** Relative path from vault root to file */
  filePath: string;
  /** Saved content (last saved state) */
  savedContent: string;
  /** Current editor content (may differ from savedContent if dirty) */
  editorContent: string;
  /** Whether the tab has unsaved changes */
  isDirty: boolean;
  /** Filename for display (derived from filePath) */
  filename: string;
}

/** Storage format for persisted tabs (paths only, content reloaded on restore) */
export interface TabStorageItem {
  filePath: string;
  filename: string;
}

/** Full storage format including active index */
export interface TabsStorageData {
  tabs: TabStorageItem[];
  activeIndex: number;
}

/**
 * Create a new Tab object.
 * Generates a unique ID using timestamp + random string.
 */
export function createTab(filePath: string, content: string): Tab {
  // Extract filename from path
  const filename = filePath.split('/').pop() ?? filePath;

  return {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
    filePath,
    savedContent: content,
    editorContent: content,
    isDirty: false,
    filename,
  };
}
