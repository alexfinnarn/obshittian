// Daily notes functionality

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

    const year = date.getFullYear().toString();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const filename = `${year}-${month}-${day}.md`;

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
            const writable = await fileHandle.createWritable();
            const template = generateDailyNoteTemplate(date);
            await writable.write(template);
            await writable.close();
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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

    return `# ${year}-${month}-${day}

## ${dayName}

- [ ]

## Notes

`;
}

// Setup daily note keyboard navigation
export function setupDailyNoteNavigation(config, picker, openDailyNote) {
    const navConfig = config.dailyNoteNavigation || { enabled: true, modifier: 'meta' };
    if (navConfig.enabled === false) return;

    document.addEventListener('keydown', (e) => {
        // Check if the configured modifier is pressed
        const modifierPressed =
            (navConfig.modifier === 'meta' && e.metaKey) ||
            (navConfig.modifier === 'ctrl' && e.ctrlKey) ||
            (navConfig.modifier === 'alt' && e.altKey) ||
            (navConfig.modifier === 'shift' && e.shiftKey);

        if (!modifierPressed) return;

        const currentDate = picker.getDate() || new Date();
        let newDate = new Date(currentDate);

        switch (e.key) {
            case 'ArrowLeft':
                newDate.setDate(newDate.getDate() - 1);
                break;
            case 'ArrowRight':
                newDate.setDate(newDate.getDate() + 1);
                break;
            case 'ArrowUp':
                newDate.setDate(newDate.getDate() - 7);
                break;
            case 'ArrowDown':
                newDate.setDate(newDate.getDate() + 7);
                break;
            default:
                return; // Not an arrow key, don't prevent default
        }

        e.preventDefault();
        picker.setDate(newDate); // This triggers onSelect which opens the daily note
    });
}
