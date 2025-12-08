// File operations: create, rename, delete

// Create a new file in the given directory
export async function createFile(parentDirHandle, filename) {
    const fileHandle = await parentDirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write('');
    await writable.close();
    return fileHandle;
}

// Create a new folder in the given directory
export async function createFolder(parentDirHandle, folderName) {
    return await parentDirHandle.getDirectoryHandle(folderName, { create: true });
}

// Rename a file (copy to new name, delete old)
export async function renameFile(dirHandle, oldName, newName) {
    const oldHandle = await dirHandle.getFileHandle(oldName);
    const file = await oldHandle.getFile();
    const content = await file.text();

    const newHandle = await dirHandle.getFileHandle(newName, { create: true });
    const writable = await newHandle.createWritable();
    await writable.write(content);
    await writable.close();

    await dirHandle.removeEntry(oldName);
    return newHandle;
}

// Rename a folder (recursively copy contents, delete old)
export async function renameFolder(parentDirHandle, oldName, newName) {
    const oldDir = await parentDirHandle.getDirectoryHandle(oldName);
    const newDir = await parentDirHandle.getDirectoryHandle(newName, { create: true });

    await copyDirectoryContents(oldDir, newDir);
    await deleteDirectory(parentDirHandle, oldName);

    return newDir;
}

// Helper: recursively copy directory contents
async function copyDirectoryContents(srcDir, destDir) {
    for await (const entry of srcDir.values()) {
        if (entry.kind === 'file') {
            const file = await entry.getFile();
            const content = await file.text();
            const newFile = await destDir.getFileHandle(entry.name, { create: true });
            const writable = await newFile.createWritable();
            await writable.write(content);
            await writable.close();
        } else if (entry.kind === 'directory') {
            const newSubDir = await destDir.getDirectoryHandle(entry.name, { create: true });
            await copyDirectoryContents(entry, newSubDir);
        }
    }
}

// Delete a file
export async function deleteFile(dirHandle, filename) {
    await dirHandle.removeEntry(filename);
}

// Delete a folder (recursively)
async function deleteDirectory(parentDirHandle, folderName) {
    await parentDirHandle.removeEntry(folderName, { recursive: true });
}

// Delete entry (file or folder)
export async function deleteEntry(parentDirHandle, name, isDirectory) {
    if (isDirectory) {
        await parentDirHandle.removeEntry(name, { recursive: true });
    } else {
        await parentDirHandle.removeEntry(name);
    }
}

// Context menu state
let contextMenuState = {
    targetElement: null,
    targetHandle: null,
    parentDirHandle: null,
    isDirectory: false
};

export function getContextMenuState() {
    return contextMenuState;
}

export function setContextMenuState(state) {
    contextMenuState = { ...contextMenuState, ...state };
}

// Show context menu at position
export function showContextMenu(menu, x, y) {
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.add('visible');

    // Adjust if menu goes off screen
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        menu.style.left = `${window.innerWidth - rect.width - 5}px`;
    }
    if (rect.bottom > window.innerHeight) {
        menu.style.top = `${window.innerHeight - rect.height - 5}px`;
    }
}

export function hideContextMenu(menu) {
    menu.classList.remove('visible');
    contextMenuState = {
        targetElement: null,
        targetHandle: null,
        parentDirHandle: null,
        isDirectory: false
    };
}

// Prompt for filename with inline input
export function promptFilename(defaultName = '') {
    return prompt('Enter name:', defaultName);
}
