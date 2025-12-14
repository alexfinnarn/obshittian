// Main application entry point
import { saveDirectoryHandle, getDirectoryHandle, getLastOpenFile } from './persistence.js';
import { createEditor } from './editor.js';
import { buildFileTree, openFileByPath, openFileInPane as openFileInPaneBase, setupContextMenu, getRelativePath } from './file-tree.js';
import { openDailyNote as openDailyNoteBase, setupDailyNoteNavigation } from './daily-notes.js';
import { setupKeyboardShortcuts, setupViewToggle, setupPaneResizer, restorePaneWidth } from './ui.js';
import { initQuickLinks } from './quick-links.js';
import { configureMarked } from './marked-config.js';
import { buildTagIndex, searchTags, getFilesForTag, updateFileInIndex } from './tags.js';

// Wait for both CodeMirror and Pikaday to load
let cmReady = typeof window.CM !== 'undefined';
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

// Check if CM already loaded before this script ran
if (cmReady) {
    tryInit();
}

// Check if Pikaday is already loaded, otherwise poll for it
if (!pikadayReady) {
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

    // Setup daily note navigation (modifier + arrow keys)
    setupDailyNoteNavigation(config, picker, openDailyNote);

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
        elements.tabs.tagResults.innerHTML = '<div class="search-indexing">Indexing tags...</div>';
        try {
            await buildTagIndex(dirHandle);
            elements.tabs.tagResults.innerHTML = '';
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

    // Setup sidebar tabs and tag search
    function setupSidebarTabs(elements, state, openFileInPane) {
        const { tabs } = elements;
        let searchDebounceTimer = null;

        // Tab switching
        tabs.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;

                // Update button states
                tabs.tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Show/hide tab content
                if (tabName === 'files') {
                    tabs.filesTab.style.display = '';
                    tabs.searchTab.style.display = 'none';
                } else {
                    tabs.filesTab.style.display = 'none';
                    tabs.searchTab.style.display = '';
                    tabs.tagSearch.focus();
                }
            });
        });

        // Tag search with debounce
        tabs.tagSearch.addEventListener('input', (e) => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                const query = e.target.value.trim();
                renderTagResults(query, tabs, state, openFileInPane);
            }, 150);
        });

        // Clear file results when search changes
        tabs.tagSearch.addEventListener('input', () => {
            state.tags.selectedTag = null;
            tabs.fileResults.innerHTML = '';
        });
    }

    // Render tag search results
    function renderTagResults(query, tabs, state, openFileInPane) {
        if (!query) {
            tabs.tagResults.innerHTML = '';
            tabs.fileResults.innerHTML = '';
            return;
        }

        if (state.tags.isIndexing) {
            tabs.tagResults.innerHTML = '<div class="search-indexing">Indexing tags...</div>';
            return;
        }

        const results = searchTags(query);

        if (results.length === 0) {
            tabs.tagResults.innerHTML = '<div class="search-empty">No matching tags</div>';
            tabs.fileResults.innerHTML = '';
            return;
        }

        tabs.tagResults.innerHTML = results.map(r =>
            `<span class="tag-item" data-tag="${r.tag}">${r.tag}<span class="tag-count">${r.count}</span></span>`
        ).join('');

        // Add click handlers to tag items
        tabs.tagResults.querySelectorAll('.tag-item').forEach(item => {
            item.addEventListener('click', () => {
                const tag = item.dataset.tag;

                // Update active state
                tabs.tagResults.querySelectorAll('.tag-item').forEach(t => t.classList.remove('active'));
                item.classList.add('active');

                state.tags.selectedTag = tag;
                renderFileResults(tag, tabs, state, openFileInPane);
            });
        });
    }

    // Render files for a selected tag
    function renderFileResults(tag, tabs, state, openFileInPane) {
        const files = getFilesForTag(tag);

        if (files.length === 0) {
            tabs.fileResults.innerHTML = '<div class="search-empty">No files with this tag</div>';
            return;
        }

        tabs.fileResults.innerHTML = `
            <div class="file-results-header">Files with #${tag}</div>
            ${files.map(path => `<div class="file-result-item" data-path="${path}">${path}</div>`).join('')}
        `;

        // Add click handlers to file items
        tabs.fileResults.querySelectorAll('.file-result-item').forEach(item => {
            item.addEventListener('click', async () => {
                const path = item.dataset.path;
                await openFileByPath(path, 'left', state, openFileInPane);
            });
        });
    }

    // Setup context menu for file operations
    setupContextMenu(state, openFileInPane, refreshFileTree);

    // Setup UI
    setupKeyboardShortcuts(state, elements);
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
