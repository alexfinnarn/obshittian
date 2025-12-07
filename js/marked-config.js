// Custom marked.js renderer configuration

/**
 * Configure marked with custom renderer for collapsible nested lists
 * Uses native <details>/<summary> elements for collapse/expand behavior
 */
export function configureMarked() {
    const renderer = {
        link({ href, title, tokens }) {
            const text = this.parser.parseInline(tokens);
            const titleAttr = title ? ` title="${title}"` : '';
            return `<a href="${href}"${titleAttr} target="_blank">${text}</a>`;
        },

        listitem(token) {
            // Check if this list item contains a nested list
            const hasNestedList = token.tokens?.some(t => t.type === 'list');

            if (!hasNestedList) {
                // Regular list item - use default rendering
                return false;
            }

            // Separate content before nested list from the nested list itself
            const beforeNested = [];
            const nestedLists = [];

            for (const t of token.tokens) {
                if (t.type === 'list') {
                    nestedLists.push(this.parser.parse([t]));
                } else {
                    beforeNested.push(t);
                }
            }

            const summaryContent = this.parser.parseInline(beforeNested);
            const nestedContent = nestedLists.join('');

            // Wrap in <details> for native collapsible behavior
            return `<li><details><summary>${summaryContent}</summary>${nestedContent}</details></li>\n`;
        }
    };

    marked.use({ renderer });
}

/**
 * Render markdown to HTML with collapsible lists
 */
export function renderPreview(text, previewElement) {
    previewElement.innerHTML = marked.parse(text);
}
