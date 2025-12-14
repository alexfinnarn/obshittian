// Centralized keyboard shortcut management
// Modules register their shortcuts here, and a single listener handles all of them

const shortcuts = [];

/**
 * Register a keyboard shortcut
 * @param {Object} config
 * @param {Object} config.keys - Key combination: { key, ctrl, meta, alt, shift, mod }
 *                               'mod' is a convenience for ctrl (Windows) or meta (Mac)
 * @param {Function} config.handler - Function to call when shortcut is triggered
 * @param {string} config.description - Human-readable description for help UI
 * @param {string} [config.category] - Optional category for grouping in help UI
 */
export function registerShortcut(config) {
    const { keys, handler, description, category = 'General' } = config;

    if (!keys || !handler || !description) {
        console.warn('registerShortcut: missing required fields', config);
        return;
    }

    shortcuts.push({ keys, handler, description, category });
}

/**
 * Check if a keyboard event matches a key configuration
 */
function matchesKeys(event, keys) {
    // Handle 'mod' as meta on Mac, ctrl on Windows
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? 'metaKey' : 'ctrlKey';

    // Check modifier keys
    if (keys.mod !== undefined) {
        if (keys.mod !== event[modKey]) return false;
    }
    if (keys.ctrl !== undefined && keys.ctrl !== event.ctrlKey) return false;
    if (keys.meta !== undefined && keys.meta !== event.metaKey) return false;
    if (keys.alt !== undefined && keys.alt !== event.altKey) return false;
    if (keys.shift !== undefined && keys.shift !== event.shiftKey) return false;

    // Check the actual key
    if (keys.key && keys.key.toLowerCase() !== event.key.toLowerCase()) return false;

    return true;
}

/**
 * Initialize the keyboard listener
 * Call this once after all modules have registered their shortcuts
 */
export function initKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        for (const shortcut of shortcuts) {
            if (matchesKeys(event, shortcut.keys)) {
                event.preventDefault();
                shortcut.handler(event);
                return;
            }
        }
    });
}

/**
 * Get all registered shortcuts (for help UI)
 * @returns {Array} Array of { keys, description, category }
 */
export function getShortcuts() {
    return shortcuts.map(({ keys, description, category }) => ({
        keys: formatKeys(keys),
        description,
        category
    }));
}

/**
 * Format keys object into human-readable string
 */
function formatKeys(keys) {
    const parts = [];
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    if (keys.mod) parts.push(isMac ? '⌘' : 'Ctrl');
    if (keys.ctrl) parts.push('Ctrl');
    if (keys.meta) parts.push('⌘');
    if (keys.alt) parts.push(isMac ? '⌥' : 'Alt');
    if (keys.shift) parts.push(isMac ? '⇧' : 'Shift');
    if (keys.key) parts.push(formatKeyName(keys.key));

    return parts.join('+');
}

/**
 * Format individual key names for display
 */
function formatKeyName(key) {
    const keyMap = {
        'ArrowLeft': '←',
        'ArrowRight': '→',
        'ArrowUp': '↑',
        'ArrowDown': '↓',
        ' ': 'Space'
    };
    return keyMap[key] || key.toUpperCase();
}
