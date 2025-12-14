// Main application entry point
import { saveDirectoryHandle, getDirectoryHandle, getLastOpenFile } from './persistence.js';
import { createEditor } from './editor.js';
import { buildFileTree, openFileByPath, openFileInPane as openFileInPaneBase, setupContextMenu, getRelativePath } from './file-tree.js';
import { openDailyNote as openDailyNoteBase, registerDailyNoteShortcuts } from './daily-notes.js';
import { registerUIShortcuts, setupViewToggle, setupPaneResizer, restorePaneWidth } from './ui.js';
import { initQuickLinks } from './quick-links.js';
import { configureMarked } from './marked-config.js';
import { buildTagIndex } from './tags.js';
import { initKeyboardShortcuts } from './keyboard.js';
import { setupSidebarTabs, showIndexingStatus, clearIndexingStatus } from './sidebar.js';
import { whenAllReady } from './dependencies.js';

// Wait for all external libraries to load before initializing
whenAllReady()
    .then(initApp)
    .catch(err => {
        console.error('Failed to load dependencies:', err);
        document.body.innerHTML = `
            <div style="padding: 2rem; color: #ff6b6b; font-family: system-ui;">
                <h1>Failed to load application</h1>
                <p>${err.message}</p>
                <p>Please check your internet connection and refresh the page.</p>
            </div>
        `;
    });

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
        },
        tags: {
            isIndexing: false,
            selectedTag: null
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
        },
        tabs: {
            filesTab: document.getElementById('files-tab'),
            searchTab: document.getElementById('search-tab'),
            tabButtons: document.querySelectorAll('.sidebar-tab'),
            tagSearch: document.getElementById('tag-search'),
            tagResults: document.getElementById('tag-results'),
            fileResults: document.getElementById('file-results')
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
    state.left.editorView = createEditor(CM, elements.left.editorContainer, 'left', state, elements, config);
    state.right.editorView = createEditor(CM, elements.right.editorContainer, 'right', state, elements, config);

    // Configure marked.js with custom renderer for collapsible lists
    configureMarked();

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

    // Register daily note shortcuts (modifier + arrow keys)
    registerDailyNoteShortcuts(config, picker, openDailyNote);

    // Open folder picker
    document.getElementById('btnOpenFolder').addEventListener('click', async () => {
        try {
            const dirHandle = await window.showDirectoryPicker();
            await openDirectory(dirHandle);
            await saveDirectoryHandle(dirHandle);
            // Hide restore button once a folder is open
            document.getElementById('btnRestoreFolder').style.display = 'none';
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error opening folder:', err);
            }
        }
    });

    // Restore folder button - requests permission with user gesture
    document.getElementById('btnRestoreFolder').addEventListener('click', async () => {
        try {
            const savedHandle = await getDirectoryHandle();
            if (savedHandle) {
                const permission = await savedHandle.requestPermission({ mode: 'readwrite' });
                if (permission === 'granted') {
                    await openDirectory(savedHandle);
                    document.getElementById('btnRestoreFolder').style.display = 'none';
                }
            }
        } catch (err) {
            console.error('Error restoring folder:', err);
        }
    });

    // Function to refresh the file tree
    async function refreshFileTree() {
        if (!state.rootDirHandle) return;
        elements.fileTree.innerHTML = '';
        await buildFileTree(state.rootDirHandle, elements.fileTree, openFileInPane, state);
    }

    // Common function to open a directory
    async function openDirectory(dirHandle) {
        state.rootDirHandle = dirHandle;
        elements.fileTree.innerHTML = '';
        await buildFileTree(dirHandle, elements.fileTree, openFileInPane, state);

        // Build tag index in background
        state.tags.isIndexing = true;
        showIndexingStatus(elements.tabs);
        try {
            await buildTagIndex(dirHandle);
            clearIndexingStatus(elements.tabs);
        } catch (err) {
            console.error('Error building tag index:', err);
        }
        state.tags.isIndexing = false;

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

    // Setup context menu for file operations
    setupContextMenu(state, openFileInPane, refreshFileTree);

    // Register keyboard shortcuts and initialize the listener
    registerUIShortcuts(state, elements);
    initKeyboardShortcuts();

    // Setup UI
    setupViewToggle(elements);
    setupPaneResizer();
    restorePaneWidth(config);
    initQuickLinks();

    // Setup sidebar tabs
    setupSidebarTabs(elements, state, openFileInPane);

    // Set today's date on the calendar
    picker.setDate(new Date());

    // Check if there's a saved directory handle and show restore button
    (async () => {
        try {
            const savedHandle = await getDirectoryHandle();
            if (savedHandle) {
                // Show the restore button so user can restore with one click
                document.getElementById('btnRestoreFolder').style.display = '';
            }
        } catch (err) {
            console.log('Could not check for saved directory:', err.message);
        }
    })();
}
