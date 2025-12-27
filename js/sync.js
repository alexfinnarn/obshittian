// Sync/Export module - handles docx export and cleanup for Google Drive sync

import { getFrontmatterValue, splitFrontmatter } from './frontmatter.js';
import { getOrCreateDirectory, generateDailyNoteTemplate } from './daily-notes.js';
import { saveTempExports, getTempExports } from './persistence.js';

// Sync mode constants
export const SYNC_MODES = {
    PERMANENT: 'permanent',
    TEMPORARY: 'temporary',
    DELETE: 'delete'
};

/**
 * Get sync mode from file content
 * @param {string} content - File content
 * @returns {string|null} Sync mode or null if not specified
 */
export function getSyncMode(content) {
    const mode = getFrontmatterValue(content, 'sync');
    if (mode && Object.values(SYNC_MODES).includes(mode)) {
        return mode;
    }
    return null;
}

/**
 * Check if a file is a daily note based on its path
 * @param {string} relativePath - Relative path from root
 * @param {string} dailyNotesFolder - Daily notes folder name
 * @returns {boolean}
 */
export function isDailyNote(relativePath, dailyNotesFolder) {
    return relativePath.startsWith(dailyNotesFolder + '/');
}

/**
 * Extract date from daily note path
 * @param {string} relativePath - Path like "zzz_Daily Notes/2024/12/2024-12-14.md"
 * @returns {Date|null} Parsed date or null
 */
export function parseDailyNotePath(relativePath) {
    const match = relativePath.match(/(\d{4})-(\d{2})-(\d{2})\.md$/);
    if (!match) return null;
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
}

/**
 * Check if daily note content differs from template
 * @param {string} content - Current file content
 * @param {Date} date - Date of the daily note
 * @returns {boolean} True if content has been modified beyond template
 */
export function isDailyNoteModified(content, date) {
    const { body: currentBody } = splitFrontmatter(content);
    const templateContent = generateDailyNoteTemplate(date);
    const { body: templateBody } = splitFrontmatter(templateContent);

    // Normalize whitespace for comparison
    const normalizedCurrent = currentBody.trim().replace(/\s+/g, ' ');
    const normalizedTemplate = templateBody.trim().replace(/\s+/g, ' ');

    return normalizedCurrent !== normalizedTemplate;
}

/**
 * Convert relative md path to export path
 * @param {string} relativePath - e.g., "zzz_Daily Notes/2024/12/2024-12-14.md"
 * @param {string} syncDirectory - Export directory name
 * @returns {string} Export path e.g., "zzzz_exports/zzz_Daily Notes/2024/12/2024-12-14.docx"
 */
export function getExportPath(relativePath, syncDirectory) {
    const docxPath = relativePath.replace(/\.md$/, '.docx');
    return `${syncDirectory}/${docxPath}`;
}

/**
 * Convert markdown content to docx Blob
 * @param {string} markdownContent - Markdown content (body only, no frontmatter)
 * @param {string} title - Document title
 * @returns {Promise<Blob>} Docx blob
 */
export async function markdownToDocx(markdownContent, title = 'Document') {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = window.docx;

    const lines = markdownContent.split('\n');
    const children = [];

    for (const line of lines) {
        // Handle headings
        if (line.startsWith('# ')) {
            children.push(new Paragraph({
                text: line.substring(2),
                heading: HeadingLevel.HEADING_1
            }));
        } else if (line.startsWith('## ')) {
            children.push(new Paragraph({
                text: line.substring(3),
                heading: HeadingLevel.HEADING_2
            }));
        } else if (line.startsWith('### ')) {
            children.push(new Paragraph({
                text: line.substring(4),
                heading: HeadingLevel.HEADING_3
            }));
        } else if (line.startsWith('- [ ] ')) {
            // Unchecked checkbox
            children.push(new Paragraph({
                children: [new TextRun({ text: '[ ] ' + line.substring(6) })]
            }));
        } else if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
            // Checked checkbox
            children.push(new Paragraph({
                children: [new TextRun({ text: '[x] ' + line.substring(6) })]
            }));
        } else if (line.startsWith('- ')) {
            // Bullet point
            children.push(new Paragraph({
                text: line.substring(2),
                bullet: { level: 0 }
            }));
        } else if (line.trim()) {
            // Regular paragraph
            children.push(new Paragraph({ text: line }));
        }
    }

    const doc = new Document({
        sections: [{
            properties: {},
            children: children.length > 0 ? children : [new Paragraph({ text: '' })]
        }]
    });

    return await Packer.toBlob(doc);
}

/**
 * Write a docx blob to the filesystem
 * @param {FileSystemDirectoryHandle} rootHandle - Root directory
 * @param {string} exportPath - Full export path
 * @param {Blob} blob - Docx blob
 */
async function writeDocx(rootHandle, exportPath, blob) {
    const parts = exportPath.split('/');
    const filename = parts.pop();

    // Navigate/create directory structure
    let currentDir = rootHandle;
    for (const dir of parts) {
        currentDir = await getOrCreateDirectory(currentDir, dir);
    }

    // Create file and write
    const fileHandle = await currentDir.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
}

/**
 * Delete an export file if it exists
 * @param {FileSystemDirectoryHandle} rootHandle - Root directory
 * @param {string} exportPath - Export path to delete
 */
async function deleteExport(rootHandle, exportPath) {
    try {
        const parts = exportPath.split('/');
        const filename = parts.pop();

        let currentDir = rootHandle;
        for (const dir of parts) {
            currentDir = await currentDir.getDirectoryHandle(dir);
        }

        await currentDir.removeEntry(filename);
    } catch (err) {
        // File or directory doesn't exist, ignore
    }
}

/**
 * Track a temporary export
 * @param {string} relativePath - File path
 */
function addTempExport(relativePath) {
    const exports = getTempExports();
    const now = Date.now();

    // Update or add entry
    exports[relativePath] = now;
    saveTempExports(exports);
}

/**
 * Remove a file from temp export tracking
 * @param {string} relativePath - File path
 */
function removeTempExport(relativePath) {
    const exports = getTempExports();
    delete exports[relativePath];
    saveTempExports(exports);
}

/**
 * Process sync for a file after save
 * @param {string} relativePath - Relative path of saved file
 * @param {string} content - File content
 * @param {FileSystemDirectoryHandle} rootHandle - Root directory
 * @param {Object} config - Editor config
 * @returns {Promise<{action: string, path?: string, mode?: string}>} Action taken
 */
export async function processSync(relativePath, content, rootHandle, config) {
    const syncDir = config.syncDirectory || 'zzzz_exports';
    const syncMode = getSyncMode(content);
    const exportPath = getExportPath(relativePath, syncDir);

    if (syncMode === SYNC_MODES.DELETE) {
        // Delete existing export if present
        await deleteExport(rootHandle, exportPath);

        // Remove from temp exports tracking
        removeTempExport(relativePath);

        return { action: 'deleted', path: exportPath };
    }

    if (syncMode === SYNC_MODES.PERMANENT || syncMode === SYNC_MODES.TEMPORARY) {
        // Export to docx
        const { body } = splitFrontmatter(content);
        const title = relativePath.split('/').pop().replace(/\.md$/, '');
        const blob = await markdownToDocx(body, title);
        await writeDocx(rootHandle, exportPath, blob);

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
 * @param {FileSystemDirectoryHandle} rootHandle - Root directory
 * @param {Object} config - Editor config
 */
export async function cleanupTempExports(rootHandle, config) {
    const syncDir = config.syncDirectory || 'zzzz_exports';
    const limit = config.syncTempLimit || 7;

    const exports = getTempExports();
    const entries = Object.entries(exports);

    if (entries.length <= limit) {
        return; // Nothing to clean
    }

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1] - b[1]);

    // Delete oldest entries beyond limit
    const toDelete = entries.slice(0, entries.length - limit);

    for (const [relativePath] of toDelete) {
        const exportPath = getExportPath(relativePath, syncDir);
        await deleteExport(rootHandle, exportPath);
        delete exports[relativePath];
    }

    saveTempExports(exports);

    if (toDelete.length > 0) {
        console.log(`Sync: Cleaned up ${toDelete.length} old temporary export(s)`);
    }
}
