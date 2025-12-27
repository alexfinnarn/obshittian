// Sidebar tabs and tag search functionality
import { searchTags, getFilesForTag } from './tags.js';
import { openFileByPath } from './file-tree.js';

/**
 * Setup sidebar tab switching and tag search functionality
 * @param {Object} elements - DOM element references
 * @param {Object} state - Application state
 * @param {Function} openFileInPane - Function to open files in a pane
 */
export function setupSidebarTabs(elements, state, openFileInPane) {
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

/**
 * Render tag search results
 * @param {string} query - Search query
 * @param {Object} tabs - Tab DOM elements
 * @param {Object} state - Application state
 * @param {Function} openFileInPane - Function to open files in a pane
 */
export function renderTagResults(query, tabs, state, openFileInPane) {
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

/**
 * Render files for a selected tag
 * @param {string} tag - Selected tag
 * @param {Object} tabs - Tab DOM elements
 * @param {Object} state - Application state
 * @param {Function} openFileInPane - Function to open files in a pane
 */
export function renderFileResults(tag, tabs, state, openFileInPane) {
    const files = getFilesForTag(tag);

    if (files.length === 0) {
        tabs.fileResults.innerHTML = '<div class="search-empty">No files with this tag</div>';
        return;
    }

    tabs.fileResults.innerHTML = `
        <div class="file-results-header">Files with #${tag}</div>
        ${files.map(path => {
            const filename = path.split('/').pop();
            return `<div class="file-result-item" data-path="${path}" title="${path}">${filename}</div>`;
        }).join('')}
    `;

    // Add click handlers to file items
    tabs.fileResults.querySelectorAll('.file-result-item').forEach(item => {
        item.addEventListener('click', async () => {
            const path = item.dataset.path;
            await openFileByPath(path, 'left', state, openFileInPane);
        });
    });
}

/**
 * Show indexing status in the tag results area
 * @param {Object} tabs - Tab DOM elements
 */
export function showIndexingStatus(tabs) {
    tabs.tagResults.innerHTML = '<div class="search-indexing">Indexing tags...</div>';
}

/**
 * Clear indexing status from the tag results area
 * @param {Object} tabs - Tab DOM elements
 */
export function clearIndexingStatus(tabs) {
    tabs.tagResults.innerHTML = '';
}
