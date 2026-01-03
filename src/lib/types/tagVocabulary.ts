/**
 * Tag Vocabulary Types
 *
 * Defines the structure for the tag vocabulary stored in .editor-tags.yaml.
 * The vocabulary provides autocomplete suggestions for tags across
 * both markdown files and journal entries.
 */

/**
 * A single tag in the vocabulary with usage count
 */
export interface VocabularyTag {
  /** The tag name (e.g., "project", "meeting") */
  name: string;
  /** Number of times this tag is used across all sources */
  count: number;
}

/**
 * The data structure stored in .editor-tags.yaml
 */
export interface TagVocabularyData {
  /** Schema version for future migrations */
  version: number;
  /** List of all known tags with counts */
  tags: VocabularyTag[];
}

/** Current version of the tag vocabulary format */
export const TAG_VOCABULARY_VERSION = 1;

/**
 * Create an empty vocabulary data object
 */
export function createEmptyVocabularyData(): TagVocabularyData {
  return {
    version: TAG_VOCABULARY_VERSION,
    tags: [],
  };
}
