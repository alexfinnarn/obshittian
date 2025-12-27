// UI functionality: view toggles, resizer, save, keyboard shortcuts
import { savePaneWidth, getPaneWidth } from './persistence.js';
import { updateFileInIndex } from './tags.js';
import { getRelativePath } from './file-tree.js';
import { registerShortcut } from './keyboard.js';
import { writeToFile } from './file-operations.js';
import { updateFrontmatterKey } from './frontmatter.js';
import {
    processSync,
    cleanupTempExports,
    getSyncMode,
    isDailyNote,
    parseDailyNotePath,
    isDailyNoteModified,
    SYNC_MODES
} from './sync.js';
import { getActiveTab, markActiveTabClean, renderTabs } from './tabs.js';

// View modes in cycle order
const VIEW_MODES = ['edit', 'view'];

// Track saves in progress to prevent race conditions
const savesInProgress = { left: false, right: false };

// Save pane content
export async function savePane(pane, state, elements) {
    // Prevent concurrent saves to the same pane
    if (savesInProgress[pane]) {
        console.log('Save already in progress for', pane, 'pane');
        return;
    }

    const paneElements = elements[pane];
    const config = window.editorConfig || {};

    // Get file handle based on pane type
    let fileHandle;
    let relativePath;

    if (pane === 'left') {
        // Left pane uses tabs
        const activeTab = getActiveTab(state);
        if (!activeTab) {
            console.log('No file open in left pane');
            return;
        }
        fileHandle = activeTab.fileHandle;
        relativePath = activeTab.relativePath;
    } else {
        // Right pane uses single file
        if (!state[pane].fileHandle) {
            console.log('No file open in', pane, 'pane');
            return;
        }
        fileHandle = state[pane].fileHandle;
        relativePath = await getRelativePath(state.rootDirHandle, fileHandle);
    }

    savesInProgress[pane] = true;

    try {
        let text = state[pane].editorView.state.doc.toString();

        // Check for daily note auto-upgrade (sync: delete -> sync: temporary)
        // Also handles legacy daily notes without frontmatter (syncMode === null)
        if (relativePath && isDailyNote(relativePath, state.dailyNotesFolder)) {
            const syncMode = getSyncMode(text);

            if (syncMode === SYNC_MODES.DELETE || syncMode === null) {
                const date = parseDailyNotePath(relativePath);
                if (date && isDailyNoteModified(text, date)) {
                    // Auto-upgrade to temporary
                    text = updateFrontmatterKey(text, 'sync', 'temporary');

                    // Update editor with new content
                    state[pane].editorView.dispatch({
                        changes: {
                            from: 0,
                            to: state[pane].editorView.state.doc.length,
                            insert: text
                        }
                    });
                }
            }
        }

        await writeToFile(fileHandle, text);

        if (pane === 'left') {
            // Update tab state
            markActiveTabClean(state, elements, text);
        } else {
            // Update right pane state
            state[pane].isDirty = false;
            state[pane].content = text;
            if (paneElements.unsaved) {
                paneElements.unsaved.style.display = 'none';
            }
        }

        // Update tag index for this file
        if (relativePath) {
            updateFileInIndex(relativePath, text);
        }

        // Process sync/export
        if (relativePath && state.rootDirHandle) {
            try {
                const result = await processSync(relativePath, text, state.rootDirHandle, config);
                if (result.action !== 'none') {
                    console.log(`Sync: ${result.action} - ${result.path}`);
                }

                // Run cleanup after each save
                await cleanupTempExports(state.rootDirHandle, config);
            } catch (syncErr) {
                console.error('Sync error:', syncErr);
                // Don't alert - sync is non-critical
            }
        }

    } catch (err) {
        console.error('Error saving:', err);
        alert('Error saving file: ' + err.message);
    } finally {
        savesInProgress[pane] = false;
    }
}

// Check if a pane (editor or preview) is focused
function isPaneFocused(pane, elements) {
    const paneEl = elements[pane].pane;
    return paneEl.contains(document.activeElement);
}

// Register UI keyboard shortcuts
export function registerUIShortcuts(state, elements) {
    // Cmd/Ctrl+S: Save
    registerShortcut({
        keys: { mod: true, key: 's' },
        description: 'Save file',
        category: 'Editor',
        handler: () => {
            if (isPaneFocused('left', elements)) {
                savePane('left', state, elements);
            } else if (isPaneFocused('right', elements)) {
                savePane('right', state, elements);
            } else {
                // Save both if neither focused
                const activeTab = getActiveTab(state);
                if (activeTab && activeTab.isDirty) savePane('left', state, elements);
                if (state.right.isDirty) savePane('right', state, elements);
            }
        }
    });

    // Cmd/Ctrl+E: Cycle view mode (only when pane is focused)
    registerShortcut({
        keys: { mod: true, key: 'e' },
        description: 'Toggle view mode (edit/view)',
        category: 'Editor',
        handler: () => {
            if (isPaneFocused('left', elements)) {
                cycleViewMode('left', elements);
            } else if (isPaneFocused('right', elements)) {
                cycleViewMode('right', elements);
            }
            // Do nothing if no pane is focused
        }
    });
}

// Get current view mode for a pane
export function getCurrentViewMode(pane) {
    const activeBtn = document.querySelector(`.view-toggle button[data-pane="${pane}"].active`);
    return activeBtn ? activeBtn.dataset.view : 'edit';
}

// Set view mode for a pane
export function setViewMode(pane, view, elements) {
    const paneEl = elements[pane];
    const toggleContainer = document.querySelector(`.view-toggle button[data-pane="${pane}"]`).parentElement;

    // Update button states
    toggleContainer.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Update pane view
    const editorContainer = paneEl.editorContainer;
    const preview = paneEl.preview;

    switch (view) {
        case 'edit':
            editorContainer.style.display = 'block';
            preview.classList.remove('visible');
            editorContainer.style.flex = '1';
            // Focus the editor so keyboard shortcuts continue to work
            editorContainer.querySelector('.cm-content')?.focus();
            break;
        case 'view':
            editorContainer.style.display = 'none';
            preview.classList.add('visible');
            // Focus the preview so keyboard shortcuts continue to work
            preview.focus();
            break;
    }
}

// Cycle to next view mode for a pane
export function cycleViewMode(pane, elements) {
    const currentView = getCurrentViewMode(pane);
    const currentIndex = VIEW_MODES.indexOf(currentView);
    const nextIndex = (currentIndex + 1) % VIEW_MODES.length;
    setViewMode(pane, VIEW_MODES[nextIndex], elements);
}

// Setup view toggle buttons (Edit/View)
export function setupViewToggle(elements) {
    document.querySelectorAll('.view-toggle button').forEach(btn => {
        btn.addEventListener('click', () => {
            const pane = btn.dataset.pane;
            const view = btn.dataset.view;
            setViewMode(pane, view, elements);
        });
    });
}

// Setup pane resizer
export function setupPaneResizer() {
    const resizer = document.getElementById('pane-resizer');
    const leftPane = document.getElementById('left-pane');
    const rightPane = document.getElementById('right-pane');

    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const containerRect = document.getElementById('main').getBoundingClientRect();
        const newLeftWidth = e.clientX - containerRect.left;
        const minWidth = 300;

        if (newLeftWidth > minWidth && (containerRect.width - newLeftWidth) > minWidth) {
            leftPane.style.flex = 'none';
            leftPane.style.width = newLeftWidth + 'px';
            rightPane.style.flex = '1';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            // Save pane width to localStorage
            const width = leftPane.style.width;
            if (width) {
                savePaneWidth(width);
            }
        }
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    });
}

// Restore pane width from localStorage
export function restorePaneWidth(config) {
    if (config.restorePaneWidth === false) return;

    const savedPaneWidth = getPaneWidth();
    if (savedPaneWidth) {
        const leftPane = document.getElementById('left-pane');
        const rightPane = document.getElementById('right-pane');
        leftPane.style.flex = 'none';
        leftPane.style.width = savedPaneWidth;
        rightPane.style.flex = '1';
    }
}
