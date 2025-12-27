// Quick Files management - sidebar links
import { getQuickFiles, setQuickFiles, getRootDirHandle } from './vault-config.js';

const config = window.editorConfig || {};

// State
let openFileInPaneFn = null;
let currentFiles = [];

// Initialize Quick Files
export function initQuickFiles(state, elements, openFileInPane) {
    openFileInPaneFn = openFileInPane;

    const modal = document.getElementById('quick-files-modal');
    const configureBtn = document.getElementById('configure-quick-files');
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = document.getElementById('quick-files-cancel');
    const saveBtn = document.getElementById('quick-files-save');
    const addBtn = document.getElementById('quick-files-add');
    const filesContainer = document.getElementById('quick-files-editor');

    // Load files from vault config
    currentFiles = getQuickFiles();
    renderQuickFiles();

    // Configure button opens modal
    configureBtn.addEventListener('click', () => {
        // Refresh from vault config in case it changed
        currentFiles = getQuickFiles();
        renderFileEditor(filesContainer);
        modal.classList.add('visible');
    });

    // Close modal handlers
    const closeModal = () => modal.classList.remove('visible');
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Add new file
    addBtn.addEventListener('click', () => {
        const quickFiles = getQuickFiles();
        const limit = config.quickFilesLimit || 5;
        if (quickFiles.length >= limit) {
            alert(`Maximum ${limit} quick files allowed`);
            return;
        }
        addFileRow(filesContainer, { name: '', path: '' });
    });

    // Save files
    saveBtn.addEventListener('click', async () => {
        const rows = filesContainer.querySelectorAll('.file-row');
        const newFiles = [];
        const limit = config.quickFilesLimit || 5;

        rows.forEach(row => {
            const name = row.querySelector('.file-name').value.trim();
            const path = row.dataset.path || '';
            if (name && path) {
                newFiles.push({ name, path });
            }
        });

        if (newFiles.length > limit) {
            alert(`Maximum ${limit} quick files allowed. Keeping first ${limit}.`);
            newFiles.length = limit;
        }

        currentFiles = newFiles;
        await setQuickFiles(newFiles);
        renderQuickFiles();
        closeModal();
    });
}

// Re-render quick files (call after vault config is loaded)
export function refreshQuickFiles() {
    currentFiles = getQuickFiles();
    renderQuickFiles();
}

// Render quick files in sidebar
function renderQuickFiles() {
    const container = document.getElementById('quick-files-list');
    if (!container) return;

    container.innerHTML = '';
    currentFiles.forEach((file, index) => {
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = file.name;
        link.dataset.testid = `quick-file-${index}`;
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            // Smart behavior: double-click or Ctrl/Cmd+click opens in new tab
            const openInNewTab = e.detail === 2 || e.ctrlKey || e.metaKey;
            await openQuickFile(file.path, openInNewTab);
        });
        container.appendChild(link);
    });
}

// Open a quick file by path
async function openQuickFile(relativePath, openInNewTab = false) {
    const rootHandle = getRootDirHandle();
    if (!rootHandle || !relativePath || !openFileInPaneFn) return;

    try {
        const parts = relativePath.split('/');
        const filename = parts.pop();
        let currentDir = rootHandle;

        // Navigate to parent directory
        for (const dir of parts) {
            currentDir = await currentDir.getDirectoryHandle(dir);
        }

        const fileHandle = await currentDir.getFileHandle(filename);
        await openFileInPaneFn(fileHandle, currentDir, 'left', null, openInNewTab);
    } catch (err) {
        console.error('Error opening quick file:', relativePath, err.message);
        alert(`Could not open file: ${relativePath}\n\nThe file may have been moved or deleted.`);
    }
}

// Get filename from path
function getFileName(path) {
    return path.split('/').pop();
}

// Render file editor in modal
function renderFileEditor(container) {
    container.innerHTML = '';
    const quickFiles = getQuickFiles();
    quickFiles.forEach(file => addFileRow(container, file));
}

// Add a file row to the editor
function addFileRow(container, file) {
    const row = document.createElement('div');
    row.className = 'file-row';
    row.dataset.path = file.path || '';
    const rowIndex = container.querySelectorAll('.file-row').length;
    row.dataset.testid = `file-row-${rowIndex}`;

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'file-name';
    nameInput.placeholder = 'Display name';
    nameInput.value = file.name || '';
    nameInput.dataset.testid = `file-name-${rowIndex}`;
    row.appendChild(nameInput);

    const pathSpan = document.createElement('span');
    pathSpan.className = 'file-path';
    pathSpan.textContent = file.path || 'No file selected';
    pathSpan.dataset.testid = `file-path-${rowIndex}`;
    row.appendChild(pathSpan);

    const browseBtn = document.createElement('button');
    browseBtn.className = 'file-browse';
    browseBtn.textContent = '📁';
    browseBtn.title = 'Browse';
    browseBtn.dataset.testid = `file-browse-${rowIndex}`;
    browseBtn.addEventListener('click', async () => {
        const path = await pickFile();
        if (path) {
            row.dataset.path = path;
            pathSpan.textContent = path;
            // Auto-fill name if empty
            if (!nameInput.value) {
                nameInput.value = getFileName(path).replace(/\.md$/, '');
            }
        }
    });
    row.appendChild(browseBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'file-delete';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Delete';
    deleteBtn.dataset.testid = `file-delete-${rowIndex}`;
    deleteBtn.addEventListener('click', () => {
        row.remove();
    });
    row.appendChild(deleteBtn);

    container.appendChild(row);
}

// Pick a file using the file picker
async function pickFile() {
    const rootHandle = getRootDirHandle();
    if (!rootHandle) {
        alert('Please open a folder first');
        return null;
    }

    try {
        // Use showOpenFilePicker to select a file
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{
                description: 'Markdown files',
                accept: { 'text/markdown': ['.md'] }
            }],
            multiple: false
        });

        // Get relative path from root
        const path = await rootHandle.resolve(fileHandle);
        if (path) {
            return path.join('/');
        } else {
            alert('Selected file must be within the opened folder');
            return null;
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Error picking file:', err);
        }
        return null;
    }
}
