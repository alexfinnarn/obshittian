// UI functionality: view toggles, resizer, save, keyboard shortcuts
import { savePaneWidth, getPaneWidth } from './persistence.js';
import { updateFileInIndex } from './tags.js';
import { getRelativePath } from './file-tree.js';

// View modes in cycle order
const VIEW_MODES = ['edit', 'split', 'preview'];

// Save pane content
export async function savePane(pane, state, elements) {
    const paneState = state[pane];
    const paneElements = elements[pane];

    if (!paneState.fileHandle) {
        console.log('No file open in', pane, 'pane');
        return;
    }

    try {
        const text = paneState.editorView.state.doc.toString();
        const writable = await paneState.fileHandle.createWritable();
        await writable.write(text);
        await writable.close();

        paneState.isDirty = false;
        paneState.content = text;
        paneElements.unsaved.style.display = 'none';

        // Update tag index for this file
        const relativePath = await getRelativePath(state.rootDirHandle, paneState.fileHandle);
        if (relativePath) {
            updateFileInIndex(relativePath, text);
        }

    } catch (err) {
        console.error('Error saving:', err);
        alert('Error saving file: ' + err.message);
    }
}

// Check if a pane's editor is focused
function isPaneFocused(pane, state) {
    const editorDom = state[pane].editorView.dom;
    return editorDom.contains(document.activeElement);
}

// Setup keyboard shortcuts
export function setupKeyboardShortcuts(state, elements) {
    document.addEventListener('keydown', (e) => {
        // Cmd/Ctrl+S: Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();

            // Determine which pane is focused
            if (isPaneFocused('left', state)) {
                savePane('left', state, elements);
            } else if (isPaneFocused('right', state)) {
                savePane('right', state, elements);
            } else {
                // Save both if neither focused
                if (state.left.isDirty) savePane('left', state, elements);
                if (state.right.isDirty) savePane('right', state, elements);
            }
        }

        // Cmd/Ctrl+E: Cycle view mode (edit → split → preview)
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();

            // Cycle view for focused pane, or both if neither focused
            if (isPaneFocused('left', state)) {
                cycleViewMode('left', elements);
            } else if (isPaneFocused('right', state)) {
                cycleViewMode('right', elements);
            } else {
                cycleViewMode('left', elements);
                cycleViewMode('right', elements);
            }
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
            break;
        case 'split':
            editorContainer.style.display = 'block';
            preview.classList.add('visible');
            editorContainer.style.flex = '1';
            break;
        case 'preview':
            editorContainer.style.display = 'none';
            preview.classList.add('visible');
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

// Setup view toggle buttons (Edit/Split/Preview)
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
