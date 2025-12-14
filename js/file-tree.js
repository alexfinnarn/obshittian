// File tree building and navigation
import { saveLastOpenFile } from './persistence.js';
import { renderPreview } from './marked-config.js';
import {
    createFile, createFolder, renameFile, renameFolder, deleteEntry,
    getContextMenuState, setContextMenuState, showContextMenu, hideContextMenu, promptFilename
} from './file-operations.js';
import { removeFileFromIndex, renameFileInIndex } from './tags.js';

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
            div.dataset.testid = `file-item-${entry.name}`;
            div.onclick = (e) => {
                e.stopPropagation();
                openFileInPane(entry, dirHandle, 'left', div);
            };
            div.oncontextmenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenuState({
                    targetElement: div,
                    targetHandle: entry,
                    parentDirHandle: dirHandle,
                    isDirectory: false
                });
                const menu = document.getElementById('context-menu');
                showContextMenu(menu, e.clientX, e.clientY);
            };
            parentElement.appendChild(div);

        } else if (entry.kind === 'directory') {
            const details = document.createElement('details');
            details.dataset.testid = `folder-${entry.name}`;
            const summary = document.createElement('summary');
            summary.textContent = entry.name;
            summary.dataset.name = entry.name;
            summary.dataset.testid = `folder-summary-${entry.name}`;
            summary.oncontextmenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenuState({
                    targetElement: summary,
                    targetHandle: entry,
                    parentDirHandle: dirHandle,
                    isDirectory: true
                });
                const menu = document.getElementById('context-menu');
                showContextMenu(menu, e.clientX, e.clientY);
            };
            details.appendChild(summary);
            parentElement.appendChild(details);
            await buildFileTree(entry, details, openFileInPane, state, depth + 1);
        }
    }
}

// Setup context menu handlers
export function setupContextMenu(state, openFileInPane, refreshFileTree) {
    const menu = document.getElementById('context-menu');
    const fileTree = document.getElementById('file-tree');

    // Right-click on empty area of file tree to create in root
    fileTree.oncontextmenu = (e) => {
        // Only if clicking directly on file-tree, not on a child
        if (e.target === fileTree) {
            e.preventDefault();
            setContextMenuState({
                targetElement: null,
                targetHandle: state.rootDirHandle,
                parentDirHandle: state.rootDirHandle,
                isDirectory: true
            });
            showContextMenu(menu, e.clientX, e.clientY);
        }
    };

    // Hide menu on click outside
    document.addEventListener('click', () => hideContextMenu(menu));
    document.addEventListener('contextmenu', (e) => {
        // Hide if right-clicking outside file tree
        if (!fileTree.contains(e.target)) {
            hideContextMenu(menu);
        }
    });

    // Handle menu item clicks
    menu.addEventListener('click', async (e) => {
        const action = e.target.dataset.action;
        if (!action) return;

        const ctx = getContextMenuState();
        hideContextMenu(menu);

        try {
            switch (action) {
                case 'new-file':
                    await handleNewFile(ctx, state, openFileInPane, refreshFileTree);
                    break;
                case 'new-folder':
                    await handleNewFolder(ctx, refreshFileTree);
                    break;
                case 'rename':
                    await handleRename(ctx, state, refreshFileTree);
                    break;
                case 'delete':
                    await handleDelete(ctx, state, refreshFileTree);
                    break;
            }
        } catch (err) {
            console.error('Context menu action failed:', err);
            alert('Operation failed: ' + err.message);
        }
    });
}

async function handleNewFile(ctx, state, openFileInPane, refreshFileTree) {
    // Determine target directory
    const targetDir = ctx.isDirectory ? ctx.targetHandle : ctx.parentDirHandle;

    const filename = promptFilename('untitled.md');
    if (!filename) return;

    // Ensure .md extension
    const finalName = filename.endsWith('.md') || filename.endsWith('.txt')
        ? filename
        : filename + '.md';

    const fileHandle = await createFile(targetDir, finalName);
    await refreshFileTree();

    // Open the new file
    await openFileInPane(fileHandle, targetDir, 'left');
}

async function handleNewFolder(ctx, refreshFileTree) {
    const targetDir = ctx.isDirectory ? ctx.targetHandle : ctx.parentDirHandle;

    const folderName = promptFilename('New Folder');
    if (!folderName) return;

    await createFolder(targetDir, folderName);
    await refreshFileTree();
}

async function handleRename(ctx, state, refreshFileTree) {
    if (!ctx.targetHandle || ctx.targetHandle === state.rootDirHandle) {
        alert('Cannot rename root directory');
        return;
    }

    const oldName = ctx.targetHandle.name;
    const newName = promptFilename(oldName);
    if (!newName || newName === oldName) return;

    // Get relative path before renaming (for tag index update)
    let oldPath = null;
    if (!ctx.isDirectory && oldName.endsWith('.md')) {
        oldPath = await getRelativePath(state.rootDirHandle, ctx.targetHandle);
    }

    if (ctx.isDirectory) {
        await renameFolder(ctx.parentDirHandle, oldName, newName);
    } else {
        await renameFile(ctx.parentDirHandle, oldName, newName);

        // Update tag index with new path
        if (oldPath) {
            const newPath = oldPath.replace(/[^/]+$/, newName);
            renameFileInIndex(oldPath, newPath);
        }
    }

    await refreshFileTree();
}

async function handleDelete(ctx, state, refreshFileTree) {
    if (!ctx.targetHandle || ctx.targetHandle === state.rootDirHandle) {
        alert('Cannot delete root directory');
        return;
    }

    const name = ctx.targetHandle.name;
    const type = ctx.isDirectory ? 'folder' : 'file';

    if (!confirm(`Delete ${type} "${name}"?`)) return;

    // Get relative path before deleting (for tag index update)
    let filePath = null;
    if (!ctx.isDirectory && name.endsWith('.md')) {
        filePath = await getRelativePath(state.rootDirHandle, ctx.targetHandle);
    }

    await deleteEntry(ctx.parentDirHandle, name, ctx.isDirectory);

    // Remove from tag index
    if (filePath) {
        removeFileFromIndex(filePath);
    }

    // Clear editor if the deleted file was open
    if (!ctx.isDirectory) {
        for (const pane of ['left', 'right']) {
            if (state[pane].fileHandle?.name === name) {
                state[pane].fileHandle = null;
                state[pane].dirHandle = null;
                state[pane].content = '';
                state[pane].isDirty = false;
                state[pane].editorView.dispatch({
                    changes: { from: 0, to: state[pane].editorView.state.doc.length, insert: '' }
                });
            }
        }
    }

    await refreshFileTree();
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
