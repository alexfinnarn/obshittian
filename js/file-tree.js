// File tree building and navigation
import { saveLastOpenFile } from './persistence.js';
import { renderPreview } from './marked-config.js';

// Build file tree recursively
export async function buildFileTree(dirHandle, parentElement, openFileInPane, state, depth = 0) {
    const entries = [];
    for await (const entry of dirHandle.values()) {
        entries.push(entry);
    }

    // Sort: folders first, then alphabetically
    entries.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
        if (entry.name.startsWith('.')) continue; // Skip hidden files

        if (entry.kind === 'file') {
            if (!entry.name.endsWith('.md') && !entry.name.endsWith('.txt')) continue;

            const div = document.createElement('div');
            div.className = 'file-item file-label';
            div.textContent = entry.name;
            div.dataset.name = entry.name;
            div.onclick = (e) => {
                e.stopPropagation();
                openFileInPane(entry, dirHandle, 'left', div);
            };
            parentElement.appendChild(div);

        } else if (entry.kind === 'directory') {
            const details = document.createElement('details');
            const summary = document.createElement('summary');
            summary.textContent = entry.name;
            details.appendChild(summary);
            parentElement.appendChild(details);
            await buildFileTree(entry, details, openFileInPane, state, depth + 1);
        }
    }
}

// Get relative path from root to a file
export async function getRelativePath(rootDirHandle, fileHandle) {
    if (!rootDirHandle) return null;
    try {
        const path = await rootDirHandle.resolve(fileHandle);
        return path ? path.join('/') : null;
    } catch {
        return null;
    }
}

// Open a file by its relative path from root
export async function openFileByPath(relativePath, pane, state, openFileInPane) {
    if (!state.rootDirHandle || !relativePath) return false;
    try {
        const parts = relativePath.split('/');
        const filename = parts.pop();
        let currentDir = state.rootDirHandle;

        // Navigate to parent directory
        for (const dir of parts) {
            currentDir = await currentDir.getDirectoryHandle(dir);
        }

        const fileHandle = await currentDir.getFileHandle(filename);
        await openFileInPane(fileHandle, currentDir, pane);
        return true;
    } catch (err) {
        console.log('Could not restore file:', relativePath, err.message);
        return false;
    }
}

// Open file in specified pane
export async function openFileInPane(fileHandle, parentDirHandle, pane, state, elements, uiElement = null) {
    try {
        // Request permission if needed
        if ((await fileHandle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
            if ((await fileHandle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
                console.error('Permission denied');
                return;
            }
        }

        const file = await fileHandle.getFile();
        const text = await file.text();

        // Update state
        state[pane].fileHandle = fileHandle;
        state[pane].dirHandle = parentDirHandle;
        state[pane].content = text;
        state[pane].isDirty = false;

        // Update CodeMirror editor
        state[pane].editorView.dispatch({
            changes: {
                from: 0,
                to: state[pane].editorView.state.doc.length,
                insert: text
            }
        });

        // Update UI
        renderPreview(text, elements[pane].preview);
        elements[pane].filename.textContent = file.name;
        elements[pane].unsaved.style.display = 'none';

        // Update file tree highlighting
        if (uiElement) {
            document.querySelectorAll(`.file-item.active-${pane}`).forEach(el => {
                el.classList.remove(`active-${pane}`);
            });
            uiElement.classList.add(`active-${pane}`);
        }

        // Save last open file path for left pane
        if (pane === 'left') {
            const relativePath = await getRelativePath(state.rootDirHandle, fileHandle);
            if (relativePath) {
                saveLastOpenFile(relativePath);
            }

            // Set left pane to preview mode by default
            const previewBtn = document.querySelector('.view-toggle button[data-pane="left"][data-view="preview"]');
            if (previewBtn) {
                previewBtn.click();
            }
        }

    } catch (err) {
        console.error('Error opening file:', err);
    }
}
