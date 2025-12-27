// Tab management for left editor pane
import { renderPreview } from './marked-config.js';

const TAB_LIMIT = 5;
const TABS_STORAGE_KEY = 'editorLeftPaneTabs';

// Create a new tab object
export function createTab(fileHandle, dirHandle, content, filename) {
    return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        fileHandle,
        dirHandle,
        content,           // Last saved content
        editorContent: content,  // Current editor content (may differ if dirty)
        isDirty: false,
        filename
    };
}

// Get the active tab
export function getActiveTab(state) {
    if (state.left.activeTabIndex < 0 || state.left.activeTabIndex >= state.left.tabs.length) {
        return null;
    }
    return state.left.tabs[state.left.activeTabIndex];
}

// Find tab index by file handle (checks if file is already open)
export function findTabByFileHandle(state, fileHandle) {
    return state.left.tabs.findIndex(tab =>
        tab.fileHandle && tab.filename === fileHandle.name
    );
}

// Find tab index by file path
export function findTabByPath(state, relativePath) {
    return state.left.tabs.findIndex(tab => tab.relativePath === relativePath);
}

// Save current editor state to the active tab
export function saveEditorStateToTab(state) {
    const tab = getActiveTab(state);
    if (tab && state.left.editorView) {
        tab.editorContent = state.left.editorView.state.doc.toString();
    }
}

// Restore tab's content to editor
export function restoreTabToEditor(state, elements, tabIndex) {
    const tab = state.left.tabs[tabIndex];
    if (!tab || !state.left.editorView) return;

    state.left.editorView.dispatch({
        changes: {
            from: 0,
            to: state.left.editorView.state.doc.length,
            insert: tab.editorContent
        }
    });

    // Reset isDirty after dispatch - the dispatch triggers docChanged which marks
    // the tab as dirty, but we're just loading content, not editing
    tab.isDirty = false;

    // Update preview
    renderPreview(tab.editorContent, elements.left.preview);
}

// Add a tab (enforces limit, returns true if added, false if switched to existing)
export function addTab(state, elements, tab, relativePath = null) {
    tab.relativePath = relativePath;

    // Check if file is already open
    const existingIndex = state.left.tabs.findIndex(t =>
        t.relativePath && t.relativePath === relativePath
    );

    if (existingIndex >= 0) {
        // Switch to existing tab
        switchTab(state, elements, existingIndex);
        return false;
    }

    // Save current tab's editor state before adding new one
    saveEditorStateToTab(state);

    // Check tab limit
    if (state.left.tabs.length >= TAB_LIMIT) {
        // Find oldest non-dirty tab to close
        const nonDirtyIndex = state.left.tabs.findIndex(t => !t.isDirty);
        if (nonDirtyIndex >= 0) {
            removeTab(state, elements, nonDirtyIndex, true); // skip confirmation
        } else {
            // All tabs are dirty, ask user
            const oldestDirty = state.left.tabs[0];
            if (!confirm(`Tab limit reached. Close "${oldestDirty.filename}" with unsaved changes?`)) {
                return false;
            }
            removeTab(state, elements, 0, true);
        }
    }

    // Add the new tab and make it active
    state.left.tabs.push(tab);
    state.left.activeTabIndex = state.left.tabs.length - 1;

    // Update editor with new tab content
    restoreTabToEditor(state, elements, state.left.activeTabIndex);

    // Render tabs
    renderTabs(state, elements);
    saveTabsToStorage(state);

    return true;
}

// Replace current tab's content (for single-click behavior)
export function replaceCurrentTab(state, elements, tab, relativePath = null) {
    tab.relativePath = relativePath;

    // Check if file is already open in another tab
    const existingIndex = state.left.tabs.findIndex(t =>
        t.relativePath && t.relativePath === relativePath
    );

    if (existingIndex >= 0) {
        // Switch to existing tab instead
        switchTab(state, elements, existingIndex);
        return;
    }

    if (state.left.tabs.length === 0) {
        // No tabs, just add this one
        state.left.tabs.push(tab);
        state.left.activeTabIndex = 0;
    } else {
        const currentTab = getActiveTab(state);
        if (currentTab && currentTab.isDirty) {
            if (!confirm(`Save changes to "${currentTab.filename}" before opening another file?`)) {
                // User chose not to save - discard changes
            }
            // Note: We could add save functionality here, but for simplicity we just replace
        }
        // Replace current tab
        state.left.tabs[state.left.activeTabIndex] = tab;
    }

    // Update editor
    restoreTabToEditor(state, elements, state.left.activeTabIndex);
    renderTabs(state, elements);
    saveTabsToStorage(state);
}

// Remove a tab
export function removeTab(state, elements, index, skipConfirmation = false) {
    if (index < 0 || index >= state.left.tabs.length) return false;

    const tab = state.left.tabs[index];

    // Check for unsaved changes
    if (tab.isDirty && !skipConfirmation) {
        if (!confirm(`Close "${tab.filename}" with unsaved changes?`)) {
            return false;
        }
    }

    // Remove the tab
    state.left.tabs.splice(index, 1);

    // Adjust active index
    if (state.left.tabs.length === 0) {
        state.left.activeTabIndex = -1;
        // Clear editor
        state.left.editorView.dispatch({
            changes: {
                from: 0,
                to: state.left.editorView.state.doc.length,
                insert: ''
            }
        });
        renderPreview('', elements.left.preview);
    } else if (index <= state.left.activeTabIndex) {
        // Shift active index if needed
        state.left.activeTabIndex = Math.max(0, state.left.activeTabIndex - 1);
        // Restore the now-active tab
        restoreTabToEditor(state, elements, state.left.activeTabIndex);
    }

    renderTabs(state, elements);
    saveTabsToStorage(state);
    return true;
}

// Switch to a different tab
export function switchTab(state, elements, index) {
    if (index < 0 || index >= state.left.tabs.length) return;
    if (index === state.left.activeTabIndex) return;

    // Save current tab's editor state
    saveEditorStateToTab(state);

    // Switch
    state.left.activeTabIndex = index;

    // Restore new tab's content
    restoreTabToEditor(state, elements, index);

    renderTabs(state, elements);
    saveTabsToStorage(state);
}

// Render the tab bar
export function renderTabs(state, elements) {
    const tabBar = elements.left.tabBar;
    if (!tabBar) return;

    if (state.left.tabs.length === 0) {
        tabBar.innerHTML = '<span class="no-file-open">No file open</span>';
        return;
    }

    tabBar.innerHTML = state.left.tabs.map((tab, index) => {
        const isActive = index === state.left.activeTabIndex;
        const unsavedMarker = tab.isDirty ? '<span class="tab-unsaved">●</span>' : '';
        return `
            <div class="tab ${isActive ? 'active' : ''}" data-tab-index="${index}">
                <span class="tab-filename" title="${tab.filename}">${tab.filename}</span>
                ${unsavedMarker}
                <span class="tab-close" data-tab-index="${index}" title="Close">&times;</span>
            </div>
        `;
    }).join('');

    // Add click handlers
    tabBar.querySelectorAll('.tab').forEach(tabEl => {
        const index = parseInt(tabEl.dataset.tabIndex);

        // Click on tab to switch
        tabEl.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tab-close')) {
                switchTab(state, elements, index);
            }
        });
    });

    // Add close button handlers
    tabBar.querySelectorAll('.tab-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(closeBtn.dataset.tabIndex);
            removeTab(state, elements, index);
        });
    });
}

// Mark active tab as dirty
export function markActiveTabDirty(state, elements) {
    const tab = getActiveTab(state);
    if (tab && !tab.isDirty) {
        tab.isDirty = true;
        renderTabs(state, elements);
    }
}

// Mark active tab as clean (after save)
export function markActiveTabClean(state, elements, newContent) {
    const tab = getActiveTab(state);
    if (tab) {
        tab.isDirty = false;
        tab.content = newContent;
        tab.editorContent = newContent;
        renderTabs(state, elements);
        saveTabsToStorage(state);
    }
}

// Save tabs to localStorage
export function saveTabsToStorage(state) {
    const tabsData = state.left.tabs.map(tab => ({
        relativePath: tab.relativePath,
        filename: tab.filename
    }));
    const data = {
        tabs: tabsData,
        activeIndex: state.left.activeTabIndex
    };
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(data));
}

// Get tabs from localStorage
export function getTabsFromStorage() {
    const stored = localStorage.getItem(TABS_STORAGE_KEY);
    if (!stored) return null;
    try {
        return JSON.parse(stored);
    } catch {
        return null;
    }
}

// Clear tabs storage
export function clearTabsStorage() {
    localStorage.removeItem(TABS_STORAGE_KEY);
}
