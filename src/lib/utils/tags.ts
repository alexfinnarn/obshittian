/**
 * Tags Utilities - Tag indexing and fuzzy search
 *
 * Provides tag extraction from frontmatter, directory scanning,
 * and fuzzy search via Fuse.js.
 */

import Fuse, { type IFuseOptions } from 'fuse.js';
import yaml from 'js-yaml';
import { parseFrontmatter } from './frontmatter';
import {
  tagsStore,
  setTagIndex,
  resetTagIndex,
  saveTagIndexToStorage,
  type TagIndex,
  type TagEntry,
  type ReindexEventData,
  getTagIndexMeta,
} from '$lib/stores/tags.svelte';
import { emit } from './eventBus';
import type { JournalData } from '$lib/types/journal';
import { fileService } from '$lib/services/fileService';

// Journal source key prefix
const JOURNAL_PREFIX = 'journal:';

// Fuse.js configuration for fuzzy matching
const FUSE_OPTIONS: IFuseOptions<TagEntry> = {
  keys: ['tag'],
  threshold: 0.4,
  includeScore: true,
};

let fuseInstance: Fuse<TagEntry> | null = null;

/**
 * Rebuild allTags array and Fuse.js instance from current tag index
 */
function rebuildSearchIndex(): void {
  tagsStore.index.allTags = Object.entries(tagsStore.index.tags).map(([tag, paths]) => ({
    tag,
    count: paths.length,
  }));

  fuseInstance = new Fuse(tagsStore.index.allTags, FUSE_OPTIONS);
}

/**
 * Initialize Fuse.js instance from existing index (e.g., after loading from storage)
 */
export function initializeFuseFromIndex(): void {
  if (tagsStore.index.allTags.length > 0) {
    fuseInstance = new Fuse(tagsStore.index.allTags, FUSE_OPTIONS);
  }
}

/**
 * Remove a file's tags from the reverse index
 */
function removeFileTagReferences(filePath: string): string[] {
  const tags = tagsStore.index.files[filePath] || [];
  const removedTags: string[] = [];

  for (const tag of tags) {
    if (tagsStore.index.tags[tag]) {
      tagsStore.index.tags[tag] = tagsStore.index.tags[tag].filter((p) => p !== filePath);
      if (tagsStore.index.tags[tag].length === 0) {
        delete tagsStore.index.tags[tag];
        removedTags.push(tag);
      }
    }
  }

  return removedTags;
}

/**
 * Add tags for a file to the reverse index
 */
function addFileTagReferences(filePath: string, tags: string[]): string[] {
  const addedTags: string[] = [];

  for (const tag of tags) {
    if (!tagsStore.index.tags[tag]) {
      tagsStore.index.tags[tag] = [];
      addedTags.push(tag);
    }
    tagsStore.index.tags[tag].push(filePath);
  }

  return addedTags;
}

/**
 * Extract tags from frontmatter
 * Supports: comma-separated string, YAML array [a, b], YAML list
 */
export function extractTags(content: string): string[] {
  const frontmatter = parseFrontmatter(content);
  const tags = frontmatter.tags;

  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') return [tags];
  return [];
}

/**
 * Recursively scan directory and build tag index
 */
async function scanDirectory(basePath: string = ''): Promise<void> {
  const entries = await fileService.listDirectory(basePath);

  for (const entry of entries) {
    const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (entry.kind === 'directory') {
      // Skip hidden directories
      if (entry.name.startsWith('.')) continue;

      await scanDirectory(entryPath);
    } else if (entry.kind === 'file' && entry.name.endsWith('.md')) {
      try {
        // Read file content (fileService handles reading)
        const text = await fileService.readFile(entryPath);

        // Only use first 2KB for frontmatter extraction (performance optimization)
        const frontmatterText = text.slice(0, 2048);

        const tags = extractTags(frontmatterText);
        if (tags.length > 0) {
          tagsStore.index.files[entryPath] = tags;
          addFileTagReferences(entryPath, tags);
        }
      } catch (err) {
        console.error(`Error reading file ${entryPath}:`, err);
      }
    }
  }
}

/**
 * Build the tag index from the vault
 * Scans both markdown files and journal entries
 */
export async function buildTagIndex(
  dailyNotesFolder: string = 'zzz_Daily Notes'
): Promise<TagIndex> {
  resetTagIndex();

  // Scan markdown files for frontmatter tags
  await scanDirectory('');

  // Scan journal files for entry tags
  await scanJournalForTags(dailyNotesFolder);

  rebuildSearchIndex();

  // Update store metadata
  setTagIndex(tagsStore.index);

  // Persist to localStorage
  saveTagIndexToStorage();

  // Emit reindex event
  const eventData: ReindexEventData = {
    type: 'full',
    filesAdded: Object.keys(tagsStore.index.files),
    tagsAdded: Object.keys(tagsStore.index.tags),
    meta: getTagIndexMeta(),
  };
  emit('tags:reindex', eventData);

  return tagsStore.index;
}

/**
 * Search tags using fuzzy matching
 */
export function searchTags(query: string): Array<{ tag: string; count: number; score?: number }> {
  if (!query || !fuseInstance) {
    return [];
  }

  const results = fuseInstance.search(query);
  return results.map((result) => ({
    tag: result.item.tag,
    count: result.item.count,
    score: result.score,
  }));
}

/**
 * Get all tags (sorted by count descending)
 */
export function getAllTags(): TagEntry[] {
  return [...tagsStore.index.allTags].sort((a, b) => b.count - a.count);
}

/**
 * Update tags for a single file (called on file save)
 */
export function updateFileInIndex(filePath: string, content: string): void {
  const oldTags = tagsStore.index.files[filePath] || [];
  const removedTags = removeFileTagReferences(filePath);

  const newTags = extractTags(content);
  let addedTags: string[] = [];

  if (newTags.length > 0) {
    tagsStore.index.files[filePath] = newTags;
    addedTags = addFileTagReferences(filePath, newTags);
  } else {
    delete tagsStore.index.files[filePath];
  }

  rebuildSearchIndex();
  setTagIndex(tagsStore.index);
  saveTagIndexToStorage();

  // Emit reindex event
  const eventData: ReindexEventData = {
    type: 'update',
    filesAdded: newTags.length > 0 ? [filePath] : undefined,
    filesRemoved: oldTags.length > 0 && newTags.length === 0 ? [filePath] : undefined,
    tagsAdded: addedTags.length > 0 ? addedTags : undefined,
    tagsRemoved: removedTags.length > 0 ? removedTags : undefined,
    meta: getTagIndexMeta(),
  };
  emit('tags:reindex', eventData);
}

/**
 * Remove a file from the index (called on file delete)
 */
export function removeFileFromIndex(filePath: string): void {
  if (!tagsStore.index.files[filePath]) {
    return;
  }

  const removedTags = removeFileTagReferences(filePath);
  delete tagsStore.index.files[filePath];

  rebuildSearchIndex();
  setTagIndex(tagsStore.index);
  saveTagIndexToStorage();

  // Emit reindex event
  const eventData: ReindexEventData = {
    type: 'remove',
    filesRemoved: [filePath],
    tagsRemoved: removedTags.length > 0 ? removedTags : undefined,
    meta: getTagIndexMeta(),
  };
  emit('tags:reindex', eventData);
}

/**
 * Rename a file in the index (called on file rename)
 */
export function renameFileInIndex(oldPath: string, newPath: string): void {
  const tags = tagsStore.index.files[oldPath];
  if (!tags) return;

  // Update files index
  tagsStore.index.files[newPath] = tags;
  delete tagsStore.index.files[oldPath];

  // Update reverse index
  for (const tag of tags) {
    if (tagsStore.index.tags[tag]) {
      const idx = tagsStore.index.tags[tag].indexOf(oldPath);
      if (idx !== -1) {
        tagsStore.index.tags[tag][idx] = newPath;
      }
    }
  }

  setTagIndex(tagsStore.index);
  saveTagIndexToStorage();

  // Emit reindex event
  const eventData: ReindexEventData = {
    type: 'rename',
    filesAdded: [newPath],
    filesRemoved: [oldPath],
    meta: getTagIndexMeta(),
  };
  emit('tags:reindex', eventData);
}

// ============================================================================
// Journal Tag Integration
// ============================================================================

/**
 * Check if a source key is a journal entry
 */
export function isJournalSource(key: string): boolean {
  return key.startsWith(JOURNAL_PREFIX);
}

/**
 * Parse a journal source key into date and entry ID
 */
export function parseJournalSource(key: string): { date: string; entryId: string } | null {
  if (!isJournalSource(key)) return null;

  const match = key.match(/^journal:(\d{4}-\d{2}-\d{2})#(.+)$/);
  if (!match) return null;

  return { date: match[1], entryId: match[2] };
}

/**
 * Create a journal source key from date and entry ID
 */
export function createJournalSourceKey(date: string, entryId: string): string {
  return `${JOURNAL_PREFIX}${date}#${entryId}`;
}

/**
 * Scan journal files and add their tags to the index
 */
export async function scanJournalForTags(
  dailyNotesFolder: string = 'zzz_Daily Notes'
): Promise<void> {
  try {
    // Check if daily notes folder exists
    const dailyExists = await fileService.exists(dailyNotesFolder);
    if (!dailyExists.exists) return;

    // List year folders
    const yearEntries = await fileService.listDirectory(dailyNotesFolder);

    for (const yearEntry of yearEntries) {
      if (yearEntry.kind !== 'directory') continue;
      if (!/^\d{4}$/.test(yearEntry.name)) continue;

      const yearPath = `${dailyNotesFolder}/${yearEntry.name}`;
      const monthEntries = await fileService.listDirectory(yearPath);

      for (const monthEntry of monthEntries) {
        if (monthEntry.kind !== 'directory') continue;
        if (!/^\d{2}$/.test(monthEntry.name)) continue;

        const monthPath = `${yearPath}/${monthEntry.name}`;
        const fileEntries = await fileService.listDirectory(monthPath);

        // Look for .yaml journal files
        for (const fileEntry of fileEntries) {
          if (fileEntry.kind !== 'file') continue;
          if (!fileEntry.name.endsWith('.yaml')) continue;

          // Extract date from filename (YYYY-MM-DD.yaml)
          const dateMatch = fileEntry.name.match(/^(\d{4}-\d{2}-\d{2})\.yaml$/);
          if (!dateMatch) continue;

          const dateStr = dateMatch[1];

          try {
            const filePath = `${monthPath}/${fileEntry.name}`;
            const text = await fileService.readFile(filePath);
            const data = yaml.load(text) as JournalData;

            if (data?.entries) {
              for (const entry of data.entries) {
                if (entry.tags && entry.tags.length > 0) {
                  const sourceKey = createJournalSourceKey(dateStr, entry.id);
                  tagsStore.index.files[sourceKey] = entry.tags;
                  addFileTagReferences(sourceKey, entry.tags);
                }
              }
            }
          } catch (err) {
            console.warn(`Error reading journal file ${fileEntry.name}:`, err);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error scanning journal for tags:', (err as Error).message);
  }
}

/**
 * Update a journal entry in the tag index
 */
export function updateJournalEntryInIndex(date: string, entryId: string, tags: string[]): void {
  const sourceKey = createJournalSourceKey(date, entryId);

  const oldTags = tagsStore.index.files[sourceKey] || [];
  const removedTags = removeFileTagReferences(sourceKey);

  let addedTags: string[] = [];

  if (tags.length > 0) {
    tagsStore.index.files[sourceKey] = tags;
    addedTags = addFileTagReferences(sourceKey, tags);
  } else {
    delete tagsStore.index.files[sourceKey];
  }

  rebuildSearchIndex();
  setTagIndex(tagsStore.index);
  saveTagIndexToStorage();

  // Emit reindex event
  const eventData: ReindexEventData = {
    type: 'update',
    filesAdded: tags.length > 0 ? [sourceKey] : undefined,
    filesRemoved: oldTags.length > 0 && tags.length === 0 ? [sourceKey] : undefined,
    tagsAdded: addedTags.length > 0 ? addedTags : undefined,
    tagsRemoved: removedTags.length > 0 ? removedTags : undefined,
    meta: getTagIndexMeta(),
  };
  emit('tags:reindex', eventData);
}

/**
 * Remove a journal entry from the tag index
 */
export function removeJournalEntryFromIndex(date: string, entryId: string): void {
  const sourceKey = createJournalSourceKey(date, entryId);
  removeFileFromIndex(sourceKey);
}
