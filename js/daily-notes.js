// Daily notes functionality
import { registerShortcut } from './keyboard.js';
import { writeToFile } from './file-operations.js';

/**
 * Format a date into daily note path components
 */
export function formatDailyNotePath(date) {
    const year = date.getFullYear().toString();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const filename = `${year}-${month}-${day}.md`;
    return { year, month, day, filename };
}

export async function openDailyNote(date, state, openFileInPane) {
    if (!state.rootDirHandle) {
        console.log('No folder open');
        return;
    }

    const { year, month, day, filename } = formatDailyNotePath(date);

    try {
        // Navigate to or create: zzz_Daily Notes/YYYY/MM/
        let dailyDir = await getOrCreateDirectory(state.rootDirHandle, state.dailyNotesFolder);
        let yearDir = await getOrCreateDirectory(dailyDir, year);
        let monthDir = await getOrCreateDirectory(yearDir, month);

        // Get or create the daily note file
        let fileHandle;
        try {
            fileHandle = await monthDir.getFileHandle(filename);
        } catch {
            // File doesn't exist, create it with template
            fileHandle = await monthDir.getFileHandle(filename, { create: true });
            await writeToFile(fileHandle, generateDailyNoteTemplate(date));
        }

        // Open in right pane
        await openFileInPane(fileHandle, monthDir, 'right');

    } catch (err) {
        console.error('Error opening daily note:', err);
    }
}

export async function getOrCreateDirectory(parentHandle, name) {
    try {
        return await parentHandle.getDirectoryHandle(name, { create: true });
    } catch (err) {
        console.error(`Error creating directory ${name}:`, err);
        throw err;
    }
}

export function generateDailyNoteTemplate(date) {
    const { year, month, day } = formatDailyNotePath(date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

    return `# ${year}-${month}-${day}

## ${dayName}

- [ ]

## Notes

`;
}

// Register daily note keyboard navigation shortcuts
export function registerDailyNoteShortcuts(config, picker, openDailyNote) {
    const navConfig = config.dailyNoteNavigation || { enabled: true, modifier: 'meta' };
    if (navConfig.enabled === false) return;

    // Build the modifier key config based on user preference
    const modifierKey = navConfig.modifier || 'meta';
    const buildKeys = (key) => ({ [modifierKey]: true, key });

    // Helper to navigate daily notes
    const navigateDays = (days) => {
        const currentDate = picker.getDate() || new Date();
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + days);
        picker.setDate(newDate);
    };

    registerShortcut({
        keys: buildKeys('ArrowLeft'),
        description: 'Previous day',
        category: 'Daily Notes',
        handler: () => navigateDays(-1)
    });

    registerShortcut({
        keys: buildKeys('ArrowRight'),
        description: 'Next day',
        category: 'Daily Notes',
        handler: () => navigateDays(1)
    });

    registerShortcut({
        keys: buildKeys('ArrowUp'),
        description: 'Previous week',
        category: 'Daily Notes',
        handler: () => navigateDays(-7)
    });

    registerShortcut({
        keys: buildKeys('ArrowDown'),
        description: 'Next week',
        category: 'Daily Notes',
        handler: () => navigateDays(7)
    });
}
