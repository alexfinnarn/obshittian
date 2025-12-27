/**
 * Daily Notes Utilities
 *
 * Functions for managing daily notes: path formatting, template generation,
 * and file creation/retrieval.
 */

import { getOrCreateDirectory } from './filesystem';

/**
 * Format a date into daily note path components.
 * Returns path structure: dailyNotesFolder/YYYY/MM/YYYY-MM-DD.md
 */
export function formatDailyNotePath(date: Date): {
  year: string;
  month: string;
  day: string;
  filename: string;
} {
  const year = date.getFullYear().toString();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const filename = `${year}-${month}-${day}.md`;
  return { year, month, day, filename };
}

/**
 * Generate default template for a new daily note.
 * Includes sync: delete frontmatter (auto-upgrades to temporary when edited).
 */
export function generateDailyNoteTemplate(date: Date): string {
  const { year, month, day } = formatDailyNotePath(date);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

  return `---
sync: delete
---

# ${year}-${month}-${day}

## ${dayName}

- [ ]

## Notes

`;
}

/**
 * Get the relative path for a daily note.
 */
export function getDailyNoteRelativePath(
  dailyNotesFolder: string,
  date: Date
): string {
  const { year, month, filename } = formatDailyNotePath(date);
  return `${dailyNotesFolder}/${year}/${month}/${filename}`;
}

/**
 * Open or create a daily note for the given date.
 * Returns the file handle, directory handle, relative path, content, and whether it was newly created.
 */
export async function getOrCreateDailyNote(
  rootDirHandle: FileSystemDirectoryHandle,
  dailyNotesFolder: string,
  date: Date
): Promise<{
  fileHandle: FileSystemFileHandle;
  dirHandle: FileSystemDirectoryHandle;
  relativePath: string;
  content: string;
  isNew: boolean;
}> {
  const { year, month, filename } = formatDailyNotePath(date);
  const relativePath = getDailyNoteRelativePath(dailyNotesFolder, date);

  // Navigate to or create: dailyNotesFolder/YYYY/MM/
  const dailyDir = await getOrCreateDirectory(rootDirHandle, dailyNotesFolder);
  const yearDir = await getOrCreateDirectory(dailyDir, year);
  const monthDir = await getOrCreateDirectory(yearDir, month);

  // Get or create the daily note file
  let fileHandle: FileSystemFileHandle;
  let content: string;
  let isNew = false;

  try {
    fileHandle = await monthDir.getFileHandle(filename);
    const file = await fileHandle.getFile();
    content = await file.text();
  } catch {
    // File doesn't exist, create it with template
    fileHandle = await monthDir.getFileHandle(filename, { create: true });
    content = generateDailyNoteTemplate(date);
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    isNew = true;
  }

  return { fileHandle, dirHandle: monthDir, relativePath, content, isNew };
}
