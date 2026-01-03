/**
 * Daily Notes Utilities
 *
 * Functions for managing daily notes: path formatting, template generation,
 * and file creation/retrieval.
 */

import { fileService } from '$lib/services/fileService';

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
 */
export function generateDailyNoteTemplate(date: Date): string {
  const { year, month, day } = formatDailyNotePath(date);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

  return `# ${dayName} - ${year}-${month}-${day}

## Notes

`;
}

/**
 * Get the relative path for a daily note.
 */
export function getDailyNoteRelativePath(dailyNotesFolder: string, date: Date): string {
  const { year, month, filename } = formatDailyNotePath(date);
  return `${dailyNotesFolder}/${year}/${month}/${filename}`;
}

/**
 * Open or create a daily note for the given date.
 * Returns the relative path, content, and whether it was newly created.
 */
export async function getOrCreateDailyNote(
  dailyNotesFolder: string,
  date: Date
): Promise<{
  relativePath: string;
  content: string;
  isNew: boolean;
}> {
  const relativePath = getDailyNoteRelativePath(dailyNotesFolder, date);

  // Check if file exists
  const existsResult = await fileService.exists(relativePath);

  if (existsResult.exists) {
    // File exists, read it
    const content = await fileService.readFile(relativePath);
    return { relativePath, content, isNew: false };
  } else {
    // File doesn't exist, create it with template
    const content = generateDailyNoteTemplate(date);

    // Create parent directories and file
    const { year, month } = formatDailyNotePath(date);
    const yearPath = `${dailyNotesFolder}/${year}`;
    const monthPath = `${yearPath}/${month}`;

    // Ensure directories exist
    const yearExists = await fileService.exists(yearPath);
    if (!yearExists.exists) {
      await fileService.createDirectory(yearPath);
    }

    const monthExists = await fileService.exists(monthPath);
    if (!monthExists.exists) {
      await fileService.createDirectory(monthPath);
    }

    // Create the file
    await fileService.createFile(relativePath, content);

    return { relativePath, content, isNew: true };
  }
}
