/**
 * File Operations Utility
 *
 * Handles file/folder creation, renaming, and deletion using fileService.
 */

import { fileService } from '$lib/services/fileService';
import { logActivity } from '$lib/services/activityLogger';
import type { DirectoryEntry } from '$lib/server/fileTypes';

/**
 * Write content to a file
 */
export async function writeToFile(filePath: string, content: string): Promise<void> {
  try {
    await fileService.writeFile(filePath, content);
  } catch (err) {
    const filename = filePath.split('/').pop() ?? filePath;
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to write to file "${filename}": ${message}`);
  }
}

/**
 * Create a new file in the given directory
 */
export async function createFile(parentPath: string, filename: string): Promise<string> {
  const filePath = parentPath ? `${parentPath}/${filename}` : filename;
  try {
    await fileService.createFile(filePath, '');

    // Log activity
    logActivity('file.created', { path: filePath, kind: 'file' });

    return filePath;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to create file "${filename}": ${message}`);
  }
}

/**
 * Create a new folder in the given directory
 */
export async function createFolder(parentPath: string, folderName: string): Promise<string> {
  const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;
  try {
    await fileService.createDirectory(folderPath);

    // Log activity
    logActivity('file.created', { path: folderPath, kind: 'folder' });

    return folderPath;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to create folder "${folderName}": ${message}`);
  }
}

/**
 * Rename a file
 */
export async function renameFile(
  parentPath: string,
  oldName: string,
  newName: string
): Promise<string> {
  const oldPath = parentPath ? `${parentPath}/${oldName}` : oldName;
  const newPath = parentPath ? `${parentPath}/${newName}` : newName;

  try {
    await fileService.rename(oldPath, newPath);

    // Log activity
    logActivity('file.renamed', { oldPath, newPath });

    return newPath;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to rename "${oldName}" to "${newName}": ${message}`);
  }
}

/**
 * Rename a folder
 */
export async function renameFolder(
  parentPath: string,
  oldName: string,
  newName: string
): Promise<string> {
  const oldPath = parentPath ? `${parentPath}/${oldName}` : oldName;
  const newPath = parentPath ? `${parentPath}/${newName}` : newName;

  try {
    await fileService.rename(oldPath, newPath);

    // Log activity
    logActivity('file.renamed', { oldPath, newPath });

    return newPath;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to rename folder "${oldName}" to "${newName}": ${message}`);
  }
}

/**
 * Delete an entry (file or folder)
 */
export async function deleteEntry(
  parentPath: string,
  name: string,
  isDirectory: boolean
): Promise<void> {
  const fullPath = parentPath ? `${parentPath}/${name}` : name;

  try {
    if (isDirectory) {
      await fileService.deleteDirectory(fullPath, true);
    } else {
      await fileService.deleteFile(fullPath);
    }

    // Log activity
    logActivity('file.deleted', {
      path: fullPath,
      kind: isDirectory ? 'folder' : 'file',
    });
  } catch (err) {
    const type = isDirectory ? 'folder' : 'file';
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to delete ${type} "${name}": ${message}`);
  }
}

/**
 * Sort entries: folders first, then alphabetically by name
 */
export function sortEntries(entries: DirectoryEntry[]): DirectoryEntry[] {
  return [...entries].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Check if an entry should be visible in the file tree
 * Filters out hidden files (starting with .) and non-markdown/txt files
 */
export function isVisibleEntry(entry: DirectoryEntry): boolean {
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
export async function getVisibleEntries(dirPath: string): Promise<DirectoryEntry[]> {
  const entries = await fileService.listDirectory(dirPath);
  return sortEntries(entries.filter(isVisibleEntry));
}
