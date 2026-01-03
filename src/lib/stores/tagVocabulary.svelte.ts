/**
 * Tag Vocabulary Store - Svelte 5 runes-based store for tag autocomplete
 *
 * Stores known tags with counts in .editor-tags.yaml.
 * Used for autocomplete suggestions in TagInput component.
 * Can be auto-populated from the existing tag index.
 */

import yaml from 'js-yaml';
import { vault } from './vault.svelte';
import { tagsStore, type TagIndex } from './tags.svelte';
import {
  type VocabularyTag,
  type TagVocabularyData,
  TAG_VOCABULARY_VERSION,
} from '$lib/types/tagVocabulary';
import { fileService } from '$lib/services/fileService';

const VOCABULARY_FILENAME = '.editor-tags.yaml';

interface TagVocabularyState {
  /** All known tags sorted by count descending */
  tags: VocabularyTag[];
  /** Whether vocabulary is currently loading */
  isLoading: boolean;
}

/**
 * The tag vocabulary state - reactive via Svelte 5 runes.
 */
export const tagVocabulary = $state<TagVocabularyState>({
  tags: [],
  isLoading: false,
});

/**
 * Get all tags sorted by count descending (for autocomplete)
 */
export function getTags(): VocabularyTag[] {
  return tagVocabulary.tags;
}

/**
 * Get a specific tag by name
 */
export function getTag(name: string): VocabularyTag | undefined {
  return tagVocabulary.tags.find((t) => t.name === name);
}

/**
 * Check if a tag exists in the vocabulary
 */
export function hasTag(name: string): boolean {
  return tagVocabulary.tags.some((t) => t.name === name);
}

/**
 * Add a new tag to vocabulary (or increment if exists)
 * Does NOT auto-save - call saveTagVocabulary after batch operations
 */
export function addTag(name: string): void {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return;

  const existing = tagVocabulary.tags.find((t) => t.name === normalized);
  if (existing) {
    existing.count++;
  } else {
    tagVocabulary.tags.push({ name: normalized, count: 1 });
  }
  sortTags();
}

/**
 * Increment the count for an existing tag
 */
export function incrementTagCount(name: string): void {
  const tag = tagVocabulary.tags.find((t) => t.name === name);
  if (tag) {
    tag.count++;
    sortTags();
  }
}

/**
 * Decrement the count for a tag (removes if count reaches 0)
 */
export function decrementTagCount(name: string): void {
  const index = tagVocabulary.tags.findIndex((t) => t.name === name);
  if (index === -1) return;

  const tag = tagVocabulary.tags[index];
  tag.count--;

  if (tag.count <= 0) {
    tagVocabulary.tags.splice(index, 1);
  } else {
    sortTags();
  }
}

/**
 * Sort tags by count descending, then alphabetically
 */
function sortTags(): void {
  tagVocabulary.tags.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Build vocabulary from the existing tag index.
 * Used to auto-populate on first run or when vocabulary file is missing.
 */
export function buildVocabularyFromIndex(tagIndex?: TagIndex): void {
  const index = tagIndex ?? tagsStore.index;

  // Clear existing and rebuild
  tagVocabulary.tags = [];

  // The index.tags is Record<tag, paths[]> - count is paths.length
  for (const [tagName, paths] of Object.entries(index.tags)) {
    tagVocabulary.tags.push({
      name: tagName,
      count: paths.length,
    });
  }

  sortTags();
}

/**
 * Merge tags from index into existing vocabulary (additive)
 * Useful for updating vocabulary after index rebuild
 */
export function mergeFromIndex(tagIndex?: TagIndex): void {
  const index = tagIndex ?? tagsStore.index;

  for (const [tagName, paths] of Object.entries(index.tags)) {
    const existing = tagVocabulary.tags.find((t) => t.name === tagName);
    if (existing) {
      // Update count to match index
      existing.count = paths.length;
    } else {
      tagVocabulary.tags.push({
        name: tagName,
        count: paths.length,
      });
    }
  }

  sortTags();
}

/**
 * Load tag vocabulary from .editor-tags.yaml
 * Falls back to building from index if file doesn't exist.
 */
export async function loadTagVocabulary(): Promise<void> {
  if (!vault.path) {
    // No vault open, start empty
    tagVocabulary.tags = [];
    return;
  }

  tagVocabulary.isLoading = true;

  try {
    const existsResult = await fileService.exists(VOCABULARY_FILENAME);

    if (existsResult.exists) {
      const text = await fileService.readFile(VOCABULARY_FILENAME);
      const parsed = yaml.load(text) as TagVocabularyData;

      if (parsed?.tags && Array.isArray(parsed.tags)) {
        tagVocabulary.tags = parsed.tags;
        sortTags();
      } else {
        // Invalid format, rebuild from index
        buildVocabularyFromIndex();
      }
    } else {
      // File doesn't exist - auto-populate from tag index
      buildVocabularyFromIndex();
      // Save the generated vocabulary
      await saveTagVocabulary();
    }
  } catch (err) {
    console.warn('Error reading tag vocabulary:', (err as Error).message);
    // Fall back to building from index
    buildVocabularyFromIndex();
  } finally {
    tagVocabulary.isLoading = false;
  }
}

/**
 * Save current vocabulary to .editor-tags.yaml
 */
export async function saveTagVocabulary(): Promise<boolean> {
  if (!vault.path) {
    console.error('Cannot save tag vocabulary: no directory open');
    return false;
  }

  try {
    const data: TagVocabularyData = {
      version: TAG_VOCABULARY_VERSION,
      tags: tagVocabulary.tags,
    };

    const yamlStr = yaml.dump(data, {
      lineWidth: -1,
      quotingType: '"',
      forceQuotes: false,
    });

    await fileService.writeFile(VOCABULARY_FILENAME, yamlStr);
    return true;
  } catch (err) {
    console.error('Error saving tag vocabulary:', err);
    return false;
  }
}

/**
 * Reset vocabulary to empty state
 */
export function resetTagVocabulary(): void {
  tagVocabulary.tags = [];
  tagVocabulary.isLoading = false;
}

/**
 * Get loading state
 */
export function isVocabularyLoading(): boolean {
  return tagVocabulary.isLoading;
}
