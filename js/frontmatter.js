// Frontmatter utilities - shared parsing for tags and preview

/**
 * Extract raw frontmatter boundaries from markdown content
 * @param {string} content - The markdown file content
 * @returns {{ raw: string, endIndex: number, bomOffset: number } | null} Raw frontmatter text and end position, or null if not found
 */
export function extractFrontmatterRaw(content) {
    if (!content) {
        return null;
    }

    // Handle BOM (Byte Order Mark) at start of file
    let bomOffset = 0;
    if (content.charCodeAt(0) === 0xFEFF) {
        bomOffset = 1;
        content = content.slice(1);
    }

    if (!content.startsWith('---')) {
        return null;
    }

    const endIndex = content.indexOf('---', 3);
    if (endIndex === -1) {
        return null;
    }

    return {
        raw: content.substring(3, endIndex).trim(),
        endIndex: endIndex + 3 + bomOffset,
        bomOffset
    };
}

/**
 * Parse frontmatter YAML into an object
 * Supports: key: value, key: [array], key:\n  - list
 * @param {string} content - The markdown file content
 * @returns {Object} Parsed frontmatter object or empty object
 */
export function parseFrontmatter(content) {
    const extracted = extractFrontmatterRaw(content);
    if (!extracted) {
        return {};
    }

    const result = {};
    const lines = extracted.raw.split('\n');
    let currentKey = null;
    let listItems = [];

    for (const line of lines) {
        const trimmed = line.trim();

        // Check for list item (  - value)
        if (trimmed.startsWith('- ') && currentKey) {
            listItems.push(trimmed.substring(2).trim());
            continue;
        }

        // If we were collecting list items, save them
        if (listItems.length > 0 && currentKey) {
            result[currentKey] = listItems;
            listItems = [];
            currentKey = null;
        }

        // Check for key: value pair
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex > 0) {
            const key = trimmed.substring(0, colonIndex).trim();
            const value = trimmed.substring(colonIndex + 1).trim();

            if (value === '') {
                // Could be start of a list
                currentKey = key;
            } else if (value.startsWith('[') && value.endsWith(']')) {
                // YAML array syntax: [one, two, three]
                const items = value.slice(1, -1).split(',').map(s => s.trim()).filter(s => s);
                result[key] = items;
            } else {
                // Comma-separated or single value
                const items = value.split(',').map(s => s.trim()).filter(s => s);
                result[key] = items.length === 1 ? items[0] : items;
            }
        }
    }

    // Handle any remaining list items
    if (listItems.length > 0 && currentKey) {
        result[currentKey] = listItems;
    }

    return result;
}

/**
 * Split content into frontmatter and body for preview rendering
 * @param {string} content - The markdown content
 * @returns {{ frontmatter: string|null, body: string }}
 */
export function splitFrontmatter(content) {
    const extracted = extractFrontmatterRaw(content);
    if (!extracted) {
        return { frontmatter: null, body: content || '' };
    }

    return {
        frontmatter: extracted.raw,
        body: content.substring(extracted.endIndex).trimStart()
    };
}

/**
 * Get a specific frontmatter value
 * @param {string} content - Full file content
 * @param {string} key - Frontmatter key to get
 * @returns {string|Array|null} Value or null if not found
 */
export function getFrontmatterValue(content, key) {
    const fm = parseFrontmatter(content);
    return fm[key] ?? null;
}

/**
 * Update or insert a key in frontmatter
 * @param {string} content - Full file content
 * @param {string} key - Frontmatter key to update
 * @param {string} value - New value
 * @returns {string} Updated content
 */
export function updateFrontmatterKey(content, key, value) {
    const extracted = extractFrontmatterRaw(content);

    if (!extracted) {
        // No frontmatter exists, create it
        // Preserve BOM if present at start of content
        const bom = content && content.charCodeAt(0) === 0xFEFF ? '\uFEFF' : '';
        const cleanContent = bom ? content.slice(1) : content;
        return `${bom}---\n${key}: ${value}\n---\n\n${cleanContent}`;
    }

    const lines = extracted.raw.split('\n');
    let found = false;

    const updatedLines = lines.map(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const lineKey = line.substring(0, colonIndex).trim();
            if (lineKey === key) {
                found = true;
                return `${key}: ${value}`;
            }
        }
        return line;
    });

    if (!found) {
        updatedLines.push(`${key}: ${value}`);
    }

    const newFrontmatter = updatedLines.join('\n');
    const body = content.substring(extracted.endIndex).trimStart();

    // Preserve BOM if it was present
    const bom = extracted.bomOffset > 0 ? '\uFEFF' : '';
    return `${bom}---\n${newFrontmatter}\n---\n\n${body}`;
}
