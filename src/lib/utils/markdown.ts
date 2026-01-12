/**
 * Markdown Utilities
 *
 * Custom marked.js configuration for rendering markdown with:
 * - Links opening in new tabs
 * - Collapsible nested lists using native <details>/<summary>
 * - Frontmatter rendered as formatted code block
 *
 * Ported from js/marked-config.js with TypeScript types.
 */

import { marked, type Token, type Tokens, type RendererObject } from 'marked';
import { splitFrontmatter } from './frontmatter';

export interface RenderResult {
  /** HTML for frontmatter section (empty string if no frontmatter) */
  frontmatterHtml: string;
  /** HTML for body content */
  bodyHtml: string;
}

let isConfigured = false;

/**
 * Configure marked with custom renderer for:
 * - Links opening in new tabs (target="_blank")
 * - Collapsible nested lists via <details>/<summary>
 *
 * Call once on app initialization.
 */
export function configureMarked(): void {
  if (isConfigured) {
    return;
  }

  const renderer: RendererObject = {
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const titleAttr = title ? ` title="${title}"` : '';
      return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
    },

    listitem(token: Tokens.ListItem) {
      // Check if this list item contains a nested list
      const hasNestedList = token.tokens?.some((t) => t.type === 'list');

      if (!hasNestedList) {
        // Regular list item - use default rendering
        // Return false to fall back to default renderer
        return false;
      }

      // Separate content before nested list from the nested list itself
      const beforeNested: Token[] = [];
      const nestedLists: string[] = [];

      for (const t of token.tokens) {
        if (t.type === 'list') {
          nestedLists.push(this.parser.parse([t]));
        } else {
          beforeNested.push(t);
        }
      }

      // Parse the content before nested lists - could be paragraph, text, etc.
      // Use parse() for block tokens, extract text for inline rendering
      let summaryContent = '';
      for (const t of beforeNested) {
        if (t.type === 'paragraph' && 'tokens' in t) {
          // Extract inline content from paragraph
          summaryContent += this.parser.parseInline(t.tokens);
        } else if (t.type === 'text' && 'tokens' in t && t.tokens) {
          summaryContent += this.parser.parseInline(t.tokens);
        } else if ('text' in t) {
          summaryContent += t.text;
        }
      }

      const nestedContent = nestedLists.join('');

      // Wrap in <details> for native collapsible behavior
      return `<li><details><summary>${summaryContent}</summary>${nestedContent}</details></li>\n`;
    },
  };

  marked.use({ renderer });
  isConfigured = true;
}

/**
 * Render YAML frontmatter as formatted HTML
 * @param yaml - The YAML content (without delimiters)
 * @returns HTML string with escaped content
 */
export function renderFrontmatterHtml(yaml: string): string {
  // Escape HTML entities
  const escaped = yaml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<pre class="frontmatter-yaml"><code>${escaped}</code></pre>`;
}

/**
 * Render markdown content to HTML with frontmatter handling
 * @param text - Markdown content (may include frontmatter)
 * @returns Object with frontmatterHtml and bodyHtml
 */
export function renderMarkdown(text: string): RenderResult {
  // Ensure marked is configured
  if (!isConfigured) {
    configureMarked();
  }

  const { frontmatter, body } = splitFrontmatter(text);

  const frontmatterHtml = frontmatter ? renderFrontmatterHtml(frontmatter) : '';
  const bodyHtml = marked.parse(body) as string;

  return {
    frontmatterHtml,
    bodyHtml,
  };
}

/**
 * Reset configuration state (for testing)
 */
export function resetMarkedConfig(): void {
  isConfigured = false;
}
