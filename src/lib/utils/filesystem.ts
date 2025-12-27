/**
 * Filesystem Utilities
 *
 * IndexedDB and localStorage helpers for persisting editor state.
 * Ported from js/persistence.js with TypeScript types.
 */

// IndexedDB configuration
const DB_NAME = 'mdEditorDB';
const DB_STORE = 'handles';

/**
 * Open the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
  });
}

// ============================================================================
// IndexedDB helpers for directory handle persistence
// ============================================================================

/**
 * Save the root directory handle to IndexedDB
 */
export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    const request = store.put(handle, 'rootDir');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get the saved root directory handle from IndexedDB
 */
export async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const store = tx.objectStore(DB_STORE);
    const request = store.get('rootDir');
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// localStorage helpers
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

// ============================================================================
// Temporary exports tracking (for sync cleanup)
// ============================================================================

const TEMP_EXPORTS_KEY = 'editorTempExports';

export interface TempExports {
  [filePath: string]: number; // timestamp
}

/**
 * Save temporary exports tracking data
 */
export function saveTempExports(exports: TempExports): void {
  localStorage.setItem(TEMP_EXPORTS_KEY, JSON.stringify(exports));
}

/**
 * Get temporary exports tracking data
 */
export function getTempExports(): TempExports {
  const stored = localStorage.getItem(TEMP_EXPORTS_KEY);
  return stored ? JSON.parse(stored) : {};
}

// ============================================================================
// File operations
// ============================================================================

/**
 * Get or create a directory within a parent directory
 */
export async function getOrCreateDirectory(
  parent: FileSystemDirectoryHandle,
  name: string
): Promise<FileSystemDirectoryHandle> {
  return parent.getDirectoryHandle(name, { create: true });
}

/**
 * Read the text content of a file
 */
export async function readFileContent(fileHandle: FileSystemFileHandle): Promise<string> {
  const file = await fileHandle.getFile();
  return file.text();
}

/**
 * Write text content to a file
 */
export async function writeFileContent(
  fileHandle: FileSystemFileHandle,
  content: string
): Promise<void> {
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

/**
 * Check if a file or directory exists
 */
export async function exists(
  parent: FileSystemDirectoryHandle,
  name: string,
  kind: 'file' | 'directory' = 'file'
): Promise<boolean> {
  try {
    if (kind === 'file') {
      await parent.getFileHandle(name);
    } else {
      await parent.getDirectoryHandle(name);
    }
    return true;
  } catch {
    return false;
  }
}
