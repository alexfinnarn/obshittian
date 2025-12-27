/**
 * Sync Utilities - Markdown export and cleanup for Google Drive sync
 *
 * Files with `sync: permanent` or `sync: temporary` in frontmatter
 * are copied to the sync directory. Temporary exports are cleaned up
 * beyond the syncTempLimit.
 */

import { getFrontmatterValue, splitFrontmatter } from './frontmatter';
import { generateDailyNoteTemplate } from './dailyNotes';
import { getOrCreateDirectory, saveTempExports, getTempExports } from './filesystem';

export const SYNC_MODES = {
  PERMANENT: 'permanent',
  TEMPORARY: 'temporary',
  DELETE: 'delete',
} as const;

export type SyncMode = (typeof SYNC_MODES)[keyof typeof SYNC_MODES];

export interface SyncResult {
  action: 'exported' | 'deleted' | 'none';
  path?: string;
  mode?: SyncMode;
}

/**
 * Get sync mode from file content frontmatter
 */
export function getSyncMode(content: string): SyncMode | null {
  const mode = getFrontmatterValue(content, 'sync');
  if (mode && Object.values(SYNC_MODES).includes(mode as SyncMode)) {
    return mode as SyncMode;
  }
  return null;
}

/**
 * Check if a file is a daily note based on its path
 */
export function isDailyNote(relativePath: string, dailyNotesFolder: string): boolean {
  return relativePath.startsWith(dailyNotesFolder + '/');
}

/**
 * Extract date from daily note path
 * @param relativePath - Path like "zzz_Daily Notes/2024/12/2024-12-14.md"
 */
export function parseDailyNotePath(relativePath: string): Date | null {
  const match = relativePath.match(/(\d{4})-(\d{2})-(\d{2})\.md$/);
  if (!match) return null;
  return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
}

/**
 * Check if daily note content differs from default template
 */
export function isDailyNoteModified(content: string, date: Date): boolean {
  const { body: currentBody } = splitFrontmatter(content);
  const templateContent = generateDailyNoteTemplate(date);
  const { body: templateBody } = splitFrontmatter(templateContent);

  // Normalize whitespace for comparison
  const normalizedCurrent = currentBody.trim().replace(/\s+/g, ' ');
  const normalizedTemplate = templateBody.trim().replace(/\s+/g, ' ');

  return normalizedCurrent !== normalizedTemplate;
}

/**
 * Convert relative md path to export path (keeps .md extension)
 */
export function getExportPath(relativePath: string, syncDirectory: string): string {
  return `${syncDirectory}/${relativePath}`;
}

/**
 * Write markdown content to the filesystem
 */
async function writeMarkdownExport(
  rootHandle: FileSystemDirectoryHandle,
  exportPath: string,
  content: string
): Promise<void> {
  const parts = exportPath.split('/');
  const filename = parts.pop()!;

  // Navigate/create directory structure
  let currentDir = rootHandle;
  for (const dir of parts) {
    currentDir = await getOrCreateDirectory(currentDir, dir);
  }

  // Create file and write
  const fileHandle = await currentDir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

/**
 * Delete an export file if it exists
 */
async function deleteExport(
  rootHandle: FileSystemDirectoryHandle,
  exportPath: string
): Promise<void> {
  try {
    const parts = exportPath.split('/');
    const filename = parts.pop()!;

    let currentDir = rootHandle;
    for (const dir of parts) {
      currentDir = await currentDir.getDirectoryHandle(dir);
    }

    await currentDir.removeEntry(filename);
  } catch {
    // File or directory doesn't exist, ignore
  }
}

/**
 * Track a temporary export
 */
function addTempExport(relativePath: string): void {
  const exports = getTempExports();
  exports[relativePath] = Date.now();
  saveTempExports(exports);
}

/**
 * Remove a file from temp export tracking
 */
function removeTempExport(relativePath: string): void {
  const exports = getTempExports();
  delete exports[relativePath];
  saveTempExports(exports);
}

/**
 * Process sync for a file after save
 */
export async function processSync(
  relativePath: string,
  content: string,
  rootHandle: FileSystemDirectoryHandle,
  syncDirectory: string
): Promise<SyncResult> {
  const syncMode = getSyncMode(content);
  const exportPath = getExportPath(relativePath, syncDirectory);

  if (syncMode === SYNC_MODES.DELETE) {
    // Delete existing export if present
    await deleteExport(rootHandle, exportPath);
    removeTempExport(relativePath);
    return { action: 'deleted', path: exportPath };
  }

  if (syncMode === SYNC_MODES.PERMANENT || syncMode === SYNC_MODES.TEMPORARY) {
    // Export markdown file (body only, no frontmatter)
    const { body } = splitFrontmatter(content);
    await writeMarkdownExport(rootHandle, exportPath, body);

    // Track temporary exports
    if (syncMode === SYNC_MODES.TEMPORARY) {
      addTempExport(relativePath);
    } else {
      removeTempExport(relativePath);
    }

    return { action: 'exported', path: exportPath, mode: syncMode };
  }

  // No sync mode specified
  return { action: 'none' };
}

/**
 * Run cleanup of old temporary exports
 */
export async function cleanupTempExports(
  rootHandle: FileSystemDirectoryHandle,
  syncDirectory: string,
  limit: number
): Promise<number> {
  const exports = getTempExports();
  const entries = Object.entries(exports);

  if (entries.length <= limit) {
    return 0; // Nothing to clean
  }

  // Sort by timestamp (oldest first)
  entries.sort((a, b) => a[1] - b[1]);

  // Delete oldest entries beyond limit
  const toDelete = entries.slice(0, entries.length - limit);
  let deletedCount = 0;

  for (const [relativePath] of toDelete) {
    const exportPath = getExportPath(relativePath, syncDirectory);
    await deleteExport(rootHandle, exportPath);
    delete exports[relativePath];
    deletedCount++;
  }

  saveTempExports(exports);
  return deletedCount;
}
