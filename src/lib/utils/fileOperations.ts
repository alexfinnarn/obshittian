/**
 * File Operations Utility
 *
 * Port of js/file-operations.js for the Svelte 5 migration.
 * Handles file/folder creation, renaming, and deletion using File System Access API.
 */

/**
 * Write content to a file handle
 */
export async function writeToFile(
  fileHandle: FileSystemFileHandle,
  content: string
): Promise<void> {
  try {
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to write to file "${fileHandle.name}": ${message}`);
  }
}

/**
 * Create a new file in the given directory
 */
export async function createFile(
  parentDirHandle: FileSystemDirectoryHandle,
  filename: string
): Promise<FileSystemFileHandle> {
  try {
    const fileHandle = await parentDirHandle.getFileHandle(filename, { create: true });
    await writeToFile(fileHandle, '');
    return fileHandle;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to create file "${filename}": ${message}`);
  }
}

/**
 * Create a new folder in the given directory
 */
export async function createFolder(
  parentDirHandle: FileSystemDirectoryHandle,
  folderName: string
): Promise<FileSystemDirectoryHandle> {
  try {
    return await parentDirHandle.getDirectoryHandle(folderName, { create: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to create folder "${folderName}": ${message}`);
  }
}

/**
 * Rename a file (copy to new name, delete old)
 * File System Access API doesn't have native rename, so we copy and delete.
 */
export async function renameFile(
  dirHandle: FileSystemDirectoryHandle,
  oldName: string,
  newName: string
): Promise<FileSystemFileHandle> {
  try {
    const oldHandle = await dirHandle.getFileHandle(oldName);
    const file = await oldHandle.getFile();
    const content = await file.text();

    const newHandle = await dirHandle.getFileHandle(newName, { create: true });
    await writeToFile(newHandle, content);

    await dirHandle.removeEntry(oldName);
    return newHandle;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to rename "${oldName}" to "${newName}": ${message}`);
  }
}

/**
 * Helper: recursively copy directory contents
 */
async function copyDirectoryContents(
  srcDir: FileSystemDirectoryHandle,
  destDir: FileSystemDirectoryHandle
): Promise<void> {
  try {
    for await (const entry of srcDir.values()) {
      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        const content = await file.text();
        const newFile = await destDir.getFileHandle(entry.name, { create: true });
        await writeToFile(newFile, content);
      } else if (entry.kind === 'directory') {
        const dirHandle = entry as FileSystemDirectoryHandle;
        const newSubDir = await destDir.getDirectoryHandle(entry.name, { create: true });
        await copyDirectoryContents(dirHandle, newSubDir);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to copy directory contents: ${message}`);
  }
}

/**
 * Rename a folder (recursively copy contents, delete old)
 */
export async function renameFolder(
  parentDirHandle: FileSystemDirectoryHandle,
  oldName: string,
  newName: string
): Promise<FileSystemDirectoryHandle> {
  try {
    const oldDir = await parentDirHandle.getDirectoryHandle(oldName);
    const newDir = await parentDirHandle.getDirectoryHandle(newName, { create: true });

    await copyDirectoryContents(oldDir, newDir);
    await parentDirHandle.removeEntry(oldName, { recursive: true });

    return newDir;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to rename folder "${oldName}" to "${newName}": ${message}`);
  }
}

/**
 * Delete an entry (file or folder)
 */
export async function deleteEntry(
  parentDirHandle: FileSystemDirectoryHandle,
  name: string,
  isDirectory: boolean
): Promise<void> {
  try {
    if (isDirectory) {
      await parentDirHandle.removeEntry(name, { recursive: true });
    } else {
      await parentDirHandle.removeEntry(name);
    }
  } catch (err) {
    const type = isDirectory ? 'folder' : 'file';
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to delete ${type} "${name}": ${message}`);
  }
}

/**
 * Get relative path from root directory to a file
 */
export async function getRelativePath(
  rootDirHandle: FileSystemDirectoryHandle,
  fileHandle: FileSystemFileHandle
): Promise<string | null> {
  if (!rootDirHandle) return null;
  try {
    const path = await rootDirHandle.resolve(fileHandle);
    return path ? path.join('/') : null;
  } catch {
    return null;
  }
}

/**
 * Sort entries: folders first, then alphabetically by name
 */
export function sortEntries(entries: FileSystemHandle[]): FileSystemHandle[] {
  return [...entries].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Check if an entry should be visible in the file tree
 * Filters out hidden files (starting with .) and non-markdown/txt files
 */
export function isVisibleEntry(entry: FileSystemHandle): boolean {
  // Hide dotfiles
  if (entry.name.startsWith('.')) return false;

  // For directories, always show
  if (entry.kind === 'directory') return true;

  // For files, only show .md and .txt
  return entry.name.endsWith('.md') || entry.name.endsWith('.txt');
}

/**
 * Get all visible entries from a directory, sorted
 */
export async function getVisibleEntries(
  dirHandle: FileSystemDirectoryHandle
): Promise<FileSystemHandle[]> {
  const entries: FileSystemHandle[] = [];

  for await (const entry of dirHandle.values()) {
    if (isVisibleEntry(entry)) {
      entries.push(entry);
    }
  }

  return sortEntries(entries);
}
