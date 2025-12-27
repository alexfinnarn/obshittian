/**
 * Tags Utilities - Tag indexing and fuzzy search
 *
 * Provides tag extraction from frontmatter, directory scanning,
 * and fuzzy search via Fuse.js.
 */

import Fuse, { type IFuseOptions } from 'fuse.js';
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
async function scanDirectory(
  dirHandle: FileSystemDirectoryHandle,
  basePath: string = ''
): Promise<void> {
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
 * Build the tag index from a root directory
 */
export async function buildTagIndex(rootDirHandle: FileSystemDirectoryHandle): Promise<TagIndex> {
  resetTagIndex();

  await scanDirectory(rootDirHandle);
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
