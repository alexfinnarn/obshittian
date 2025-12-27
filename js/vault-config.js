// Vault-specific configuration stored in .editor-config.json
// Falls back to config.js defaults when file doesn't exist

const CONFIG_FILENAME = '.editor-config.json';
const config = window.editorConfig || {};

// In-memory state
let currentConfig = {
    quickLinks: [],
    quickFiles: []
};
let rootDirHandle = null;

// Load vault config from .editor-config.json, merge with defaults
export async function loadVaultConfig(dirHandle) {
    rootDirHandle = dirHandle;

    try {
        const fileHandle = await dirHandle.getFileHandle(CONFIG_FILENAME);
        const file = await fileHandle.getFile();
        const text = await file.text();
        const vaultConfig = JSON.parse(text);

        // Use vault config values, falling back to defaults
        currentConfig.quickLinks = vaultConfig.quickLinks || config.defaultQuickLinks || [];
        currentConfig.quickFiles = vaultConfig.quickFiles || config.defaultQuickFiles || [];
    } catch (err) {
        // File doesn't exist or is invalid - use defaults
        if (err.name !== 'NotFoundError') {
            console.warn('Error reading vault config:', err.message);
        }
        currentConfig.quickLinks = config.defaultQuickLinks || [];
        currentConfig.quickFiles = config.defaultQuickFiles || [];
    }

    return currentConfig;
}

// Save current config to .editor-config.json
export async function saveVaultConfig() {
    if (!rootDirHandle) {
        console.error('Cannot save vault config: no directory open');
        return false;
    }

    try {
        const fileHandle = await rootDirHandle.getFileHandle(CONFIG_FILENAME, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(currentConfig, null, 2));
        await writable.close();
        return true;
    } catch (err) {
        console.error('Error saving vault config:', err);
        return false;
    }
}

// Get current quick links
export function getQuickLinks() {
    return currentConfig.quickLinks;
}

// Get current quick files
export function getQuickFiles() {
    return currentConfig.quickFiles;
}

// Set quick links and save to vault
export async function setQuickLinks(links) {
    currentConfig.quickLinks = links;
    return await saveVaultConfig();
}

// Set quick files and save to vault
export async function setQuickFiles(files) {
    currentConfig.quickFiles = files;
    return await saveVaultConfig();
}

// Get the root directory handle (for file picker operations)
export function getRootDirHandle() {
    return rootDirHandle;
}
