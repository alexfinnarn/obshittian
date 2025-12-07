// Main application entry point
import { saveDirectoryHandle, getDirectoryHandle, getLastOpenFile } from './persistence.js';
import { createEditor } from './editor.js';
import { buildFileTree, openFileByPath, openFileInPane as openFileInPaneBase } from './file-tree.js';
import { openDailyNote as openDailyNoteBase, setupDailyNoteNavigation } from './daily-notes.js';
import { setupKeyboardShortcuts, setupViewToggle, setupPaneResizer, restorePaneWidth } from './ui.js';
import { initQuickLinks } from './quick-links.js';

// Wait for both CodeMirror and Pikaday to load
let cmReady = false;
let pikadayReady = typeof Pikaday !== 'undefined';

function tryInit() {
    if (cmReady && pikadayReady) {
        initApp();
    }
}

window.addEventListener('codemirror-ready', () => {
    cmReady = true;
    tryInit();
});

// Check if Pikaday is already loaded, otherwise poll for it
if (pikadayReady) {
    tryInit();
} else {
    const checkPikaday = setInterval(() => {
        if (typeof Pikaday !== 'undefined') {
            pikadayReady = true;
            clearInterval(checkPikaday);
            tryInit();
        }
    }, 50);
}

function initApp() {
    const CM = window.CM;
    const config = window.editorConfig || {};

    // State Management
    const state = {
        rootDirHandle: null,
        dailyNotesFolder: config.dailyNotesFolder || 'zzz_Daily Notes',
        left: {
            fileHandle: null,
            dirHandle: null,
            content: '',
            isDirty: false,
            editorView: null
        },
        right: {
            fileHandle: null,
            dirHandle: null,
            content: '',
            isDirty: false,
            editorView: null
        }
    };

    // DOM References
    const elements = {
        fileTree: document.getElementById('file-tree'),
        left: {
            editorContainer: document.getElementById('left-editor'),
            preview: document.getElementById('left-preview'),
            filename: document.getElementById('left-filename'),
            unsaved: document.getElementById('left-unsaved'),
            pane: document.getElementById('left-pane')
        },
        right: {
            editorContainer: document.getElementById('right-editor'),
            preview: document.getElementById('right-preview'),
            filename: document.getElementById('right-filename'),
            unsaved: document.getElementById('right-unsaved'),
            pane: document.getElementById('right-pane')
        }
    };

    // Create bound versions of functions that need state/elements
    const openFileInPane = (fileHandle, parentDirHandle, pane, uiElement = null) => {
        return openFileInPaneBase(fileHandle, parentDirHandle, pane, state, elements, uiElement);
    };

    const openDailyNote = (date) => {
        return openDailyNoteBase(date, state, openFileInPane);
    };

    // Initialize editors
    state.left.editorView = createEditor(CM, elements.left.editorContainer, 'left', state, elements);
    state.right.editorView = createEditor(CM, elements.right.editorContainer, 'right', state, elements);

    // Calendar Setup
    const calendarContainer = document.getElementById('calendar-container');
    const picker = new Pikaday({
        bound: false,
        onSelect: async function(date) {
            await openDailyNote(date);
        },
        firstDay: 0, // Sunday
        showDaysInNextAndPreviousMonths: true,
        enableSelectionDaysInNextAndPreviousMonths: true,
        keyboardInput: false
    });
    calendarContainer.appendChild(picker.el);

    // Setup daily note navigation (modifier + arrow keys)
    setupDailyNoteNavigation(config, picker, openDailyNote);

    // Open folder picker
    document.getElementById('btnOpenFolder').addEventListener('click', async () => {
        try {
            const dirHandle = await window.showDirectoryPicker();
            await openDirectory(dirHandle);
            await saveDirectoryHandle(dirHandle);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error opening folder:', err);
            }
        }
    });

    // Common function to open a directory
    async function openDirectory(dirHandle) {
        state.rootDirHandle = dirHandle;
        elements.fileTree.innerHTML = '';
        await buildFileTree(dirHandle, elements.fileTree, openFileInPane, state);

        // Auto-open today's daily note if configured
        if (config.autoOpenTodayNote !== false) {
            picker.setDate(new Date());
            await openDailyNote(new Date());
        }

        // Restore last open file in left pane
        if (config.restoreLastOpenFile !== false) {
            const lastOpenFile = getLastOpenFile();
            if (lastOpenFile) {
                await openFileByPath(lastOpenFile, 'left', state, openFileInPane);
            }
        }
    }

    // Setup UI
    setupKeyboardShortcuts(state, elements);
    setupViewToggle(elements);
    setupPaneResizer();
    restorePaneWidth(config);
    initQuickLinks();

    // Set today's date on the calendar
    picker.setDate(new Date());

    // Try to restore last opened directory
    if (config.autoOpenLastDirectory !== false) {
        (async () => {
            try {
                const savedHandle = await getDirectoryHandle();
                if (savedHandle) {
                    const permission = await savedHandle.requestPermission({ mode: 'readwrite' });
                    if (permission === 'granted') {
                        await openDirectory(savedHandle);
                    }
                }
            } catch (err) {
                console.log('Could not restore last directory:', err.message);
            }
        })();
    }
}
