/**
 * Frontmatter Utilities
 *
 * YAML frontmatter parsing and manipulation for markdown files.
 * Ported from js/frontmatter.js with TypeScript types.
 */

export interface FrontmatterResult {
  /** Raw frontmatter text (without delimiters) */
  raw: string;
  /** Position after the closing --- delimiter */
  endIndex: number;
  /** Number of bytes for BOM if present (0 or 1) */
  bomOffset: number;
}

export type FrontmatterValue = string | string[] | undefined;

export interface ParsedFrontmatter {
  [key: string]: FrontmatterValue;
}

export interface SplitResult {
  /** Raw frontmatter text or null if none */
  frontmatter: string | null;
  /** Body content after frontmatter */
  body: string;
}

/**
 * Extract raw frontmatter boundaries from markdown content
 * @param content - The markdown file content
 * @returns Raw frontmatter text and end position, or null if not found
 */
export function extractFrontmatterRaw(content: string | null | undefined): FrontmatterResult | null {
  if (!content) {
    return null;
  }

  // Handle BOM (Byte Order Mark) at start of file
  let bomOffset = 0;
  let processedContent = content;
  if (content.charCodeAt(0) === 0xfeff) {
    bomOffset = 1;
    processedContent = content.slice(1);
  }

  if (!processedContent.startsWith('---')) {
    return null;
  }

  const endIndex = processedContent.indexOf('---', 3);
  if (endIndex === -1) {
    return null;
  }

  return {
    raw: processedContent.substring(3, endIndex).trim(),
    endIndex: endIndex + 3 + bomOffset,
    bomOffset,
  };
}

/**
 * Parse frontmatter YAML into an object
 * Supports: key: value, key: [array], key:\n  - list
 * @param content - The markdown file content
 * @returns Parsed frontmatter object or empty object
 */
export function parseFrontmatter(content: string | null | undefined): ParsedFrontmatter {
  const extracted = extractFrontmatterRaw(content);
  if (!extracted) {
    return {};
  }

  const result: ParsedFrontmatter = {};
  const lines = extracted.raw.split('\n');
  let currentKey: string | null = null;
  let listItems: string[] = [];

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
        const items = value
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s);
        result[key] = items;
      } else {
        // Comma-separated or single value
        const items = value
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s);
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
 * @param content - The markdown content
 * @returns Object with frontmatter and body
 */
export function splitFrontmatter(content: string | null | undefined): SplitResult {
  if (!content) {
    return { frontmatter: null, body: '' };
  }

  const extracted = extractFrontmatterRaw(content);
  if (!extracted) {
    return { frontmatter: null, body: content };
  }

  return {
    frontmatter: extracted.raw,
    body: content.substring(extracted.endIndex).trimStart(),
  };
}

/**
 * Get a specific frontmatter value
 * @param content - Full file content
 * @param key - Frontmatter key to get
 * @returns Value or null if not found
 */
export function getFrontmatterValue(content: string | null | undefined, key: string): FrontmatterValue | null {
  const fm = parseFrontmatter(content);
  return fm[key] ?? null;
}

/**
 * Update or insert a key in frontmatter
 * @param content - Full file content
 * @param key - Frontmatter key to update
 * @param value - New value
 * @returns Updated content
 */
export function updateFrontmatterKey(content: string | null | undefined, key: string, value: string): string {
  const safeContent = content ?? '';
  const extracted = extractFrontmatterRaw(safeContent);

  if (!extracted) {
    // No frontmatter exists, create it
    // Preserve BOM if present at start of content
    const bom = safeContent && safeContent.charCodeAt(0) === 0xfeff ? '\uFEFF' : '';
    const cleanContent = bom ? safeContent.slice(1) : safeContent;
    return `${bom}---\n${key}: ${value}\n---\n\n${cleanContent}`;
  }

  const lines = extracted.raw.split('\n');
  let found = false;

  const updatedLines = lines.map((line) => {
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
  const body = safeContent.substring(extracted.endIndex).trimStart();

  // Preserve BOM if it was present
  const bom = extracted.bomOffset > 0 ? '\uFEFF' : '';
  return `${bom}---\n${newFrontmatter}\n---\n\n${body}`;
}
