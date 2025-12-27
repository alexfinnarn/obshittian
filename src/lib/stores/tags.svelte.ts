/**
 * Tags Store - Tag indexing and search state with persistence
 *
 * Stores the tag index in reactive state and persists to localStorage.
 * Only rebuilds when files change or no index exists.
 */

const STORAGE_KEY = 'editorTagIndex';

export interface TagEntry {
  tag: string;
  count: number;
}

export interface TagIndex {
  files: Record<string, string[]>; // path -> [tags]
  tags: Record<string, string[]>; // tag -> [paths]
  allTags: TagEntry[]; // for Fuse.js
}

export interface TagIndexMeta {
  /** Total number of files indexed */
  fileCount: number;
  /** Total number of unique tags */
  tagCount: number;
  /** When the index was last built */
  lastIndexed: number;
}

export interface ReindexEventData {
  /** Type of reindex operation */
  type: 'full' | 'update' | 'remove' | 'rename';
  /** Files that were added or updated */
  filesAdded?: string[];
  /** Files that were removed */
  filesRemoved?: string[];
  /** Tags that were added */
  tagsAdded?: string[];
  /** Tags that were removed */
  tagsRemoved?: string[];
  /** Current index metadata */
  meta: TagIndexMeta;
}

interface TagsState {
  index: TagIndex;
  isIndexing: boolean;
  selectedTag: string | null;
  meta: TagIndexMeta;
}

function createEmptyIndex(): TagIndex {
  return {
    files: {},
    tags: {},
    allTags: [],
  };
}

function createEmptyMeta(): TagIndexMeta {
  return {
    fileCount: 0,
    tagCount: 0,
    lastIndexed: 0,
  };
}

export const tagsStore = $state<TagsState>({
  index: createEmptyIndex(),
  isIndexing: false,
  selectedTag: null,
  meta: createEmptyMeta(),
});

/**
 * Check if index has been built
 */
export function isIndexBuilt(): boolean {
  return tagsStore.index.allTags.length > 0 || Object.keys(tagsStore.index.files).length > 0;
}

/**
 * Get files containing a specific tag
 */
export function getFilesForTag(tag: string): string[] {
  return tagsStore.index.tags[tag] || [];
}

/**
 * Get the current tag index
 */
export function getTagIndex(): TagIndex {
  return tagsStore.index;
}

/**
 * Get current index metadata
 */
export function getTagIndexMeta(): TagIndexMeta {
  return tagsStore.meta;
}

/**
 * Set indexing state
 */
export function setIndexing(isIndexing: boolean): void {
  tagsStore.isIndexing = isIndexing;
}

/**
 * Get indexing state
 */
export function getIsIndexing(): boolean {
  return tagsStore.isIndexing;
}

/**
 * Set selected tag
 */
export function setSelectedTag(tag: string | null): void {
  tagsStore.selectedTag = tag;
}

/**
 * Get selected tag
 */
export function getSelectedTag(): string | null {
  return tagsStore.selectedTag;
}

/**
 * Update the tag index (called from utils/tags.ts)
 */
export function setTagIndex(index: TagIndex): void {
  tagsStore.index = index;
  tagsStore.meta = {
    fileCount: Object.keys(index.files).length,
    tagCount: Object.keys(index.tags).length,
    lastIndexed: Date.now(),
  };
}

/**
 * Reset the tag index
 */
export function resetTagIndex(): void {
  tagsStore.index = createEmptyIndex();
  tagsStore.selectedTag = null;
  tagsStore.meta = createEmptyMeta();
}

/**
 * Persist index to localStorage
 */
export function saveTagIndexToStorage(): void {
  try {
    const data = {
      index: tagsStore.index,
      meta: tagsStore.meta,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save tag index to localStorage:', err);
  }
}

/**
 * Load index from localStorage
 * @returns true if index was loaded, false if not found or invalid
 */
export function loadTagIndexFromStorage(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return false;
    }

    const data = JSON.parse(stored);
    if (!data.index || !data.meta) {
      return false;
    }

    tagsStore.index = data.index;
    tagsStore.meta = data.meta;
    return true;
  } catch (err) {
    console.error('Failed to load tag index from localStorage:', err);
    return false;
  }
}

/**
 * Clear persisted index from localStorage
 */
export function clearTagIndexStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear tag index from localStorage:', err);
  }
}

/**
 * Check if stored index is stale (older than given milliseconds)
 * @param maxAge - Maximum age in milliseconds (default: 24 hours)
 */
export function isTagIndexStale(maxAge: number = 24 * 60 * 60 * 1000): boolean {
  if (!tagsStore.meta.lastIndexed) {
    return true;
  }
  return Date.now() - tagsStore.meta.lastIndexed > maxAge;
}
