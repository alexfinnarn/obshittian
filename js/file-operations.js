// File operations: create, rename, delete

/**
 * Write content to a file handle
 * @param {FileSystemFileHandle} fileHandle - The file handle to write to
 * @param {string} content - The content to write
 */
export async function writeToFile(fileHandle, content) {
    try {
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
    } catch (err) {
        throw new Error(`Failed to write to file "${fileHandle.name}": ${err.message}`);
    }
}

// Create a new file in the given directory
export async function createFile(parentDirHandle, filename) {
    try {
        const fileHandle = await parentDirHandle.getFileHandle(filename, { create: true });
        await writeToFile(fileHandle, '');
        return fileHandle;
    } catch (err) {
        throw new Error(`Failed to create file "${filename}": ${err.message}`);
    }
}

// Create a new folder in the given directory
export async function createFolder(parentDirHandle, folderName) {
    try {
        return await parentDirHandle.getDirectoryHandle(folderName, { create: true });
    } catch (err) {
        throw new Error(`Failed to create folder "${folderName}": ${err.message}`);
    }
}

// Rename a file (copy to new name, delete old)
export async function renameFile(dirHandle, oldName, newName) {
    try {
        const oldHandle = await dirHandle.getFileHandle(oldName);
        const file = await oldHandle.getFile();
        const content = await file.text();

        const newHandle = await dirHandle.getFileHandle(newName, { create: true });
        await writeToFile(newHandle, content);

        await dirHandle.removeEntry(oldName);
        return newHandle;
    } catch (err) {
        throw new Error(`Failed to rename "${oldName}" to "${newName}": ${err.message}`);
    }
}

// Rename a folder (recursively copy contents, delete old)
export async function renameFolder(parentDirHandle, oldName, newName) {
    try {
        const oldDir = await parentDirHandle.getDirectoryHandle(oldName);
        const newDir = await parentDirHandle.getDirectoryHandle(newName, { create: true });

        await copyDirectoryContents(oldDir, newDir);
        await deleteDirectory(parentDirHandle, oldName);

        return newDir;
    } catch (err) {
        throw new Error(`Failed to rename folder "${oldName}" to "${newName}": ${err.message}`);
    }
}

// Helper: recursively copy directory contents
async function copyDirectoryContents(srcDir, destDir) {
    try {
        for await (const entry of srcDir.values()) {
            if (entry.kind === 'file') {
                const file = await entry.getFile();
                const content = await file.text();
                const newFile = await destDir.getFileHandle(entry.name, { create: true });
                await writeToFile(newFile, content);
            } else if (entry.kind === 'directory') {
                const newSubDir = await destDir.getDirectoryHandle(entry.name, { create: true });
                await copyDirectoryContents(entry, newSubDir);
            }
        }
    } catch (err) {
        throw new Error(`Failed to copy directory contents: ${err.message}`);
    }
}

// Delete a file
export async function deleteFile(dirHandle, filename) {
    try {
        await dirHandle.removeEntry(filename);
    } catch (err) {
        throw new Error(`Failed to delete file "${filename}": ${err.message}`);
    }
}

// Delete a folder (recursively)
async function deleteDirectory(parentDirHandle, folderName) {
    try {
        await parentDirHandle.removeEntry(folderName, { recursive: true });
    } catch (err) {
        throw new Error(`Failed to delete folder "${folderName}": ${err.message}`);
    }
}

// Delete entry (file or folder)
export async function deleteEntry(parentDirHandle, name, isDirectory) {
    try {
        if (isDirectory) {
            await parentDirHandle.removeEntry(name, { recursive: true });
        } else {
            await parentDirHandle.removeEntry(name);
        }
    } catch (err) {
        const type = isDirectory ? 'folder' : 'file';
        throw new Error(`Failed to delete ${type} "${name}": ${err.message}`);
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
