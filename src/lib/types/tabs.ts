/**
 * Tab types and interfaces for the left editor pane.
 * The left pane supports multiple tabs, while the right pane is single-file mode for daily notes.
 */

export interface Tab {
  /** Unique identifier for the tab */
  id: string;
  /** File handle for the open file */
  fileHandle: FileSystemFileHandle;
  /** Directory handle for the file's parent */
  dirHandle: FileSystemDirectoryHandle;
  /** Saved content (last saved state) */
  savedContent: string;
  /** Current editor content (may differ from savedContent if dirty) */
  editorContent: string;
  /** Whether the tab has unsaved changes */
  isDirty: boolean;
  /** Filename for display */
  filename: string;
  /** Relative path from vault root */
  relativePath: string;
}

/** Storage format for persisted tabs (paths only, content reloaded on restore) */
export interface TabStorageItem {
  relativePath: string;
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
export function createTab(
  fileHandle: FileSystemFileHandle,
  dirHandle: FileSystemDirectoryHandle,
  content: string,
  relativePath: string
): Tab {
  return {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
    fileHandle,
    dirHandle,
    savedContent: content,
    editorContent: content,
    isDirty: false,
    filename: fileHandle.name,
    relativePath,
  };
}
