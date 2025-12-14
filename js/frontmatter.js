// Frontmatter utilities - shared parsing for tags and preview

/**
 * Extract raw frontmatter boundaries from markdown content
 * @param {string} content - The markdown file content
 * @returns {{ raw: string, endIndex: number } | null} Raw frontmatter text and end position, or null if not found
 */
export function extractFrontmatterRaw(content) {
    if (!content || !content.startsWith('---')) {
        return null;
    }

    const endIndex = content.indexOf('---', 3);
    if (endIndex === -1) {
        return null;
    }

    return {
        raw: content.substring(3, endIndex).trim(),
        endIndex: endIndex + 3
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
