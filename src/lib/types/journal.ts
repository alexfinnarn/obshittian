/**
 * Journal types and interfaces for the interstitial journal system.
 * Journal entries are stored as YAML files in {dailyNotesFolder}/YYYY/MM/YYYY-MM-DD.yaml
 */

export interface JournalEntry {
  /** Unique identifier */
  id: string;
  /** Entry content (supports markdown) */
  text: string;
  /** Tags for categorization and search */
  tags: string[];
  /** Order for manual reordering */
  order: number;
  /** ISO timestamp when created */
  createdAt: string;
  /** ISO timestamp when last updated */
  updatedAt: string;
}

/** Storage format for YAML journal files */
export interface JournalData {
  entries: JournalEntry[];
  version: number;
}

/** Current version of the journal data format */
export const JOURNAL_DATA_VERSION = 2;

/**
 * Create a new JournalEntry object.
 * Uses crypto.randomUUID() for unique IDs.
 */
export function createJournalEntry(
  text: string,
  tags: string[],
  order: number
): JournalEntry {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    text,
    tags,
    order,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create an empty JournalData object for new files.
 */
export function createEmptyJournalData(): JournalData {
  return {
    entries: [],
    version: JOURNAL_DATA_VERSION,
  };
}
