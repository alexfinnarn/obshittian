// Tags module - indexing and fuzzy search

import { parseFrontmatter } from './frontmatter.js';

// Tag index structure
let tagIndex = {
    files: {},      // path -> [tags]
    tags: {},       // tag -> [paths]
    allTags: []     // [{tag: 'name', count: N}, ...] for Fuse.js
};

let fuseInstance = null;

/**
 * Extract tags from frontmatter
 * @param {string} content - The markdown file content
 * @returns {string[]} Array of tags
 */
export function extractTags(content) {
    const frontmatter = parseFrontmatter(content);
    const tags = frontmatter.tags;

    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') return [tags];
    return [];
}

/**
 * Recursively scan directory and build tag index
 * @param {FileSystemDirectoryHandle} dirHandle - Root directory handle
 * @param {string} basePath - Current path prefix
 * @returns {Promise<void>}
 */
async function scanDirectory(dirHandle, basePath = '') {
    for await (const entry of dirHandle.values()) {
        const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name;

        if (entry.kind === 'directory') {
            // Skip hidden directories
            if (entry.name.startsWith('.')) continue;

            const subDirHandle = await dirHandle.getDirectoryHandle(entry.name);
            await scanDirectory(subDirHandle, entryPath);
        } else if (entry.kind === 'file' && entry.name.endsWith('.md')) {
            try {
                const fileHandle = await dirHandle.getFileHandle(entry.name);
                const file = await fileHandle.getFile();

                // Only read first 2KB for frontmatter (performance optimization)
                const slice = file.slice(0, 2048);
                const text = await slice.text();

                const tags = extractTags(text);
                if (tags.length > 0) {
                    tagIndex.files[entryPath] = tags;

                    // Update reverse index
                    for (const tag of tags) {
                        if (!tagIndex.tags[tag]) {
                            tagIndex.tags[tag] = [];
                        }
                        tagIndex.tags[tag].push(entryPath);
                    }
                }
            } catch (err) {
                console.error(`Error reading file ${entryPath}:`, err);
            }
        }
    }
}

/**
 * Build the tag index from a root directory
 * @param {FileSystemDirectoryHandle} rootDirHandle - Root directory handle
 * @returns {Promise<Object>} The tag index
 */
export async function buildTagIndex(rootDirHandle) {
    // Reset index
    tagIndex = {
        files: {},
        tags: {},
        allTags: []
    };

    await scanDirectory(rootDirHandle);

    // Build allTags array for Fuse.js
    tagIndex.allTags = Object.entries(tagIndex.tags).map(([tag, paths]) => ({
        tag,
        count: paths.length
    }));

    // Initialize Fuse.js
    fuseInstance = new Fuse(tagIndex.allTags, {
        keys: ['tag'],
        threshold: 0.4,
        includeScore: true
    });

    return tagIndex;
}

/**
 * Search tags using fuzzy matching
 * @param {string} query - Search query
 * @returns {Array} Search results with tag name and file count
 */
export function searchTags(query) {
    if (!query || !fuseInstance) {
        return [];
    }

    const results = fuseInstance.search(query);
    return results.map(result => ({
        tag: result.item.tag,
        count: result.item.count,
        score: result.score
    }));
}

/**
 * Get all files containing a specific tag
 * @param {string} tag - Tag name
 * @returns {string[]} Array of file paths
 */
export function getFilesForTag(tag) {
    return tagIndex.tags[tag] || [];
}

/**
 * Update tags for a single file (called on file save)
 * @param {string} filePath - Relative file path
 * @param {string} content - File content
 */
export function updateFileInIndex(filePath, content) {
    // Remove old tags for this file
    const oldTags = tagIndex.files[filePath] || [];
    for (const tag of oldTags) {
        if (tagIndex.tags[tag]) {
            tagIndex.tags[tag] = tagIndex.tags[tag].filter(p => p !== filePath);
            if (tagIndex.tags[tag].length === 0) {
                delete tagIndex.tags[tag];
            }
        }
    }

    // Extract new tags
    const newTags = extractTags(content);

    if (newTags.length > 0) {
        tagIndex.files[filePath] = newTags;
        for (const tag of newTags) {
            if (!tagIndex.tags[tag]) {
                tagIndex.tags[tag] = [];
            }
            tagIndex.tags[tag].push(filePath);
        }
    } else {
        delete tagIndex.files[filePath];
    }

    // Rebuild allTags and Fuse instance
    tagIndex.allTags = Object.entries(tagIndex.tags).map(([tag, paths]) => ({
        tag,
        count: paths.length
    }));

    if (typeof Fuse !== 'undefined') {
        fuseInstance = new Fuse(tagIndex.allTags, {
            keys: ['tag'],
            threshold: 0.4,
            includeScore: true
        });
    }
}

/**
 * Remove a file from the index (called on file delete)
 * @param {string} filePath - Relative file path
 */
export function removeFileFromIndex(filePath) {
    const tags = tagIndex.files[filePath] || [];

    for (const tag of tags) {
        if (tagIndex.tags[tag]) {
            tagIndex.tags[tag] = tagIndex.tags[tag].filter(p => p !== filePath);
            if (tagIndex.tags[tag].length === 0) {
                delete tagIndex.tags[tag];
            }
        }
    }

    delete tagIndex.files[filePath];

    // Rebuild allTags
    tagIndex.allTags = Object.entries(tagIndex.tags).map(([tag, paths]) => ({
        tag,
        count: paths.length
    }));

    if (fuseInstance) {
        fuseInstance = new Fuse(tagIndex.allTags, {
            keys: ['tag'],
            threshold: 0.4,
            includeScore: true
        });
    }
}

/**
 * Rename a file in the index (called on file rename)
 * @param {string} oldPath - Old file path
 * @param {string} newPath - New file path
 */
export function renameFileInIndex(oldPath, newPath) {
    const tags = tagIndex.files[oldPath];
    if (!tags) return;

    // Update files index
    tagIndex.files[newPath] = tags;
    delete tagIndex.files[oldPath];

    // Update reverse index
    for (const tag of tags) {
        if (tagIndex.tags[tag]) {
            const idx = tagIndex.tags[tag].indexOf(oldPath);
            if (idx !== -1) {
                tagIndex.tags[tag][idx] = newPath;
            }
        }
    }
}

/**
 * Get the current tag index
 * @returns {Object} The tag index
 */
export function getTagIndex() {
    return tagIndex;
}

/**
 * Check if index is built
 * @returns {boolean}
 */
export function isIndexBuilt() {
    return tagIndex.allTags.length > 0 || Object.keys(tagIndex.files).length > 0;
}
