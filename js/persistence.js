// IndexedDB for persisting directory handle
const DB_NAME = 'mdEditorDB';
const DB_STORE = 'handles';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(DB_STORE)) {
                db.createObjectStore(DB_STORE);
            }
        };
    });
}

export async function saveDirectoryHandle(handle) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, 'readwrite');
        const store = tx.objectStore(DB_STORE);
        const request = store.put(handle, 'rootDir');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function getDirectoryHandle() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, 'readonly');
        const store = tx.objectStore(DB_STORE);
        const request = store.get('rootDir');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// localStorage helpers
export function saveLastOpenFile(relativePath) {
    localStorage.setItem('editorLastOpenFile', relativePath);
}

export function getLastOpenFile() {
    return localStorage.getItem('editorLastOpenFile');
}

export function savePaneWidth(width) {
    localStorage.setItem('editorPaneWidth', width);
}

export function getPaneWidth() {
    return localStorage.getItem('editorPaneWidth');
}

// Temporary exports tracking (for sync cleanup)
const TEMP_EXPORTS_KEY = 'editorTempExports';

export function saveTempExports(exports) {
    localStorage.setItem(TEMP_EXPORTS_KEY, JSON.stringify(exports));
}

export function getTempExports() {
    const stored = localStorage.getItem(TEMP_EXPORTS_KEY);
    return stored ? JSON.parse(stored) : {};
}
