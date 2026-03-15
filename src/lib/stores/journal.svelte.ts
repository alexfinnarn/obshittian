/**
 * Journal Store - Svelte 5 runes-based store for interstitial journaling
 *
 * Stores journal entries as YAML files in {dailyNotesFolder}/YYYY/MM/YYYY-MM-DD.yaml
 * with auto-save on mutations and rollback on failure.
 */

import yaml from 'js-yaml';
import { vault } from './vault.svelte';
import { formatDailyNotePath } from '../utils/dailyNotes';
import type { JournalEntry, JournalData, DailyTaskItem } from '../types/journal';
import { createJournalEntry, JOURNAL_DATA_VERSION } from '../types/journal';
import {
  updateJournalEntryInIndex,
  removeJournalEntryFromIndex,
  updateTaskItemInIndex,
  removeTaskItemFromIndex,
} from '../utils/tags';
import { fileService } from '$lib/services/fileService';
import { collectJournalDates } from '../utils/directoryScanner';

// ============================================================================
// State
// ============================================================================

interface JournalState {
  selectedDate: Date | null;
  entries: JournalEntry[];
  taskItems: DailyTaskItem[];
  isLoading: boolean;
  datesWithEntries: Set<string>; // Format: "YYYY-MM-DD"
}

/**
 * The journal state - reactive via Svelte 5 runes.
 */
export const journalStore = $state<JournalState>({
  selectedDate: null,
  entries: [],
  taskItems: [],
  isLoading: false,
  datesWithEntries: new Set(),
});

// ============================================================================
// Getters
// ============================================================================

/**
 * Get all entries for the selected date
 */
export function getEntries(): JournalEntry[] {
  return journalStore.entries;
}

/**
 * Get the currently selected date
 */
export function getSelectedDate(): Date | null {
  return journalStore.selectedDate;
}

/**
 * Get the selected date as a string (YYYY-MM-DD)
 */
export function getSelectedDateString(): string | null {
  if (!journalStore.selectedDate) return null;
  return formatDateString(journalStore.selectedDate);
}

/**
 * Check if a date has persisted journal state.
 */
export function hasEntriesForDate(dateStr: string): boolean {
  return journalStore.datesWithEntries.has(dateStr);
}

/**
 * Get all dates with persisted journal state as an array.
 */
export function getDatesWithEntries(): string[] {
  return Array.from(journalStore.datesWithEntries);
}

/**
 * Keep the selected date's persisted-state marker in sync with current store data.
 */
function syncSelectedDatePresence(): void {
  const dateStr = getSelectedDateString();
  if (!dateStr) return;

  const hasPersistedState =
    journalStore.entries.length > 0 || journalStore.taskItems.length > 0;
  const nextDates = new Set(journalStore.datesWithEntries);

  if (hasPersistedState) {
    nextDates.add(dateStr);
  } else {
    nextDates.delete(dateStr);
  }

  journalStore.datesWithEntries = nextDates;
}

/**
 * Get all task items for the selected date
 */
export function getTaskItems(): DailyTaskItem[] {
  return journalStore.taskItems;
}

/**
 * Get task items for a specific task
 */
export function getTaskItemsByTaskId(taskId: string): DailyTaskItem[] {
  return journalStore.taskItems.filter((item) => item.taskId === taskId);
}

/**
 * Get the next order number for a new entry
 */
function getNextOrder(): number {
  if (journalStore.entries.length === 0) return 1;
  return Math.max(...journalStore.entries.map((e) => e.order)) + 1;
}

/**
 * Get the next order number for a new task item
 */
function getNextTaskItemOrder(taskId: string): number {
  const taskItems = journalStore.taskItems.filter((item) => item.taskId === taskId);
  if (taskItems.length === 0) return 1;
  return Math.max(...taskItems.map((item) => item.order)) + 1;
}

// ============================================================================
// CRUD Operations (auto-save with rollback)
// ============================================================================

/**
 * Add a new entry and save
 */
export async function addEntry(text: string, tags?: string[]): Promise<JournalEntry | null> {
  if (!journalStore.selectedDate) return null;

  const entryTags = tags ?? [];
  const order = getNextOrder();
  const entry = createJournalEntry(text, entryTags, order);

  const oldEntries = [...journalStore.entries];
  journalStore.entries = [...journalStore.entries, entry];

  const saved = await saveEntries();
  if (!saved) {
    // Rollback on save failure
    journalStore.entries = oldEntries;
    return null;
  }

  const dateStr = getSelectedDateString();

  // Update tag index if entry has tags
  if (dateStr && entry.tags.length > 0) {
    updateJournalEntryInIndex(dateStr, entry.id, entry.tags);
  }

  return entry;
}

/**
 * Remove an entry by ID and save
 */
export async function removeEntry(id: string): Promise<boolean> {
  const index = journalStore.entries.findIndex((e) => e.id === id);
  if (index === -1) return false;

  const removed = journalStore.entries[index];
  const oldEntries = [...journalStore.entries];
  journalStore.entries = journalStore.entries.filter((e) => e.id !== id);

  const saved = await saveEntries();
  if (!saved) {
    // Rollback on save failure
    journalStore.entries = oldEntries;
    return false;
  }

  const dateStr = getSelectedDateString();

  // Remove from tag index if entry had tags
  if (dateStr && removed.tags.length > 0) {
    removeJournalEntryFromIndex(dateStr, id);
  }

  return true;
}

/**
 * Update an entry's text and save
 */
export async function updateEntryText(id: string, text: string): Promise<boolean> {
  const entry = journalStore.entries.find((e) => e.id === id);
  if (!entry) return false;

  const oldText = entry.text;
  const oldUpdatedAt = entry.updatedAt;

  entry.text = text;
  entry.updatedAt = new Date().toISOString();

  const saved = await saveEntries();
  if (!saved) {
    // Rollback on save failure
    entry.text = oldText;
    entry.updatedAt = oldUpdatedAt;
    return false;
  }

  return true;
}

/**
 * Update an entry's tags and save
 */
export async function updateEntryTags(id: string, tags: string[]): Promise<boolean> {
  const entry = journalStore.entries.find((e) => e.id === id);
  if (!entry) return false;

  const oldTags = [...entry.tags];
  const oldUpdatedAt = entry.updatedAt;

  entry.tags = tags;
  entry.updatedAt = new Date().toISOString();

  const saved = await saveEntries();
  if (!saved) {
    // Rollback on save failure
    entry.tags = oldTags;
    entry.updatedAt = oldUpdatedAt;
    return false;
  }

  // Update tag index with new tags
  const dateStr = getSelectedDateString();
  if (dateStr) {
    updateJournalEntryInIndex(dateStr, id, tags);
  }

  return true;
}

/**
 * Add a tag to an entry and save
 */
export async function addTagToEntry(id: string, tag: string): Promise<boolean> {
  const entry = journalStore.entries.find((e) => e.id === id);
  if (!entry) return false;

  // Don't add duplicate tags
  if (entry.tags.includes(tag)) return true;

  const oldTags = [...entry.tags];
  const oldUpdatedAt = entry.updatedAt;

  entry.tags = [...entry.tags, tag];
  entry.updatedAt = new Date().toISOString();

  const saved = await saveEntries();
  if (!saved) {
    // Rollback on save failure
    entry.tags = oldTags;
    entry.updatedAt = oldUpdatedAt;
    return false;
  }

  // Update tag index with new tags
  const dateStr = getSelectedDateString();
  if (dateStr) {
    updateJournalEntryInIndex(dateStr, id, entry.tags);
  }

  return true;
}

/**
 * Remove a tag from an entry and save
 */
export async function removeTagFromEntry(id: string, tag: string): Promise<boolean> {
  const entry = journalStore.entries.find((e) => e.id === id);
  if (!entry) return false;

  // Check if tag exists
  if (!entry.tags.includes(tag)) return true;

  const oldTags = [...entry.tags];
  const oldUpdatedAt = entry.updatedAt;

  entry.tags = entry.tags.filter((t) => t !== tag);
  entry.updatedAt = new Date().toISOString();

  const saved = await saveEntries();
  if (!saved) {
    // Rollback on save failure
    entry.tags = oldTags;
    entry.updatedAt = oldUpdatedAt;
    return false;
  }

  // Update tag index with new tags
  const dateStr = getSelectedDateString();
  if (dateStr) {
    updateJournalEntryInIndex(dateStr, id, entry.tags);
  }

  return true;
}

/**
 * Update an entry's order and save
 */
export async function updateEntryOrder(id: string, order: number): Promise<boolean> {
  const entry = journalStore.entries.find((e) => e.id === id);
  if (!entry) return false;

  const oldOrder = entry.order;
  const oldUpdatedAt = entry.updatedAt;

  entry.order = order;
  entry.updatedAt = new Date().toISOString();

  const saved = await saveEntries();
  if (!saved) {
    // Rollback on save failure
    entry.order = oldOrder;
    entry.updatedAt = oldUpdatedAt;
    return false;
  }

  return true;
}

// ============================================================================
// Task Item CRUD Operations
// ============================================================================

/**
 * Add a new task item and save
 */
export async function addTaskItem(
  taskId: string,
  text: string,
  tags?: string[]
): Promise<DailyTaskItem | null> {
  if (!journalStore.selectedDate) return null;

  const itemTags = tags ?? [];
  const order = getNextTaskItemOrder(taskId);
  const { createDailyTaskItem } = await import('../types/journal');
  const item = createDailyTaskItem(taskId, text, itemTags, order);

  const oldTaskItems = [...journalStore.taskItems];
  journalStore.taskItems = [...journalStore.taskItems, item];

  const saved = await saveEntries();
  if (!saved) {
    journalStore.taskItems = oldTaskItems;
    return null;
  }

  const dateStr = getSelectedDateString();
  if (dateStr && item.tags.length > 0) {
    updateTaskItemInIndex(dateStr, item.id, item.tags);
  }

  return item;
}

/**
 * Remove a task item by ID and save
 */
export async function removeTaskItem(id: string): Promise<boolean> {
  const index = journalStore.taskItems.findIndex((item) => item.id === id);
  if (index === -1) return false;

  const removed = journalStore.taskItems[index];
  const oldTaskItems = [...journalStore.taskItems];
  journalStore.taskItems = journalStore.taskItems.filter((item) => item.id !== id);

  const saved = await saveEntries();
  if (!saved) {
    journalStore.taskItems = oldTaskItems;
    return false;
  }

  const dateStr = getSelectedDateString();
  if (dateStr && removed.tags.length > 0) {
    removeTaskItemFromIndex(dateStr, id);
  }

  return true;
}

/**
 * Update a task item's text and save
 */
export async function updateTaskItemText(id: string, text: string): Promise<boolean> {
  const item = journalStore.taskItems.find((item) => item.id === id);
  if (!item) return false;

  const oldText = item.text;
  const oldUpdatedAt = item.updatedAt;

  item.text = text;
  item.updatedAt = new Date().toISOString();

  const saved = await saveEntries();
  if (!saved) {
    item.text = oldText;
    item.updatedAt = oldUpdatedAt;
    return false;
  }

  return true;
}

/**
 * Update a task item's status and save
 */
export async function updateTaskItemStatus(
  id: string,
  status: 'pending' | 'in-progress' | 'completed'
): Promise<boolean> {
  const item = journalStore.taskItems.find((item) => item.id === id);
  if (!item) return false;

  const oldStatus = item.status;
  const oldUpdatedAt = item.updatedAt;

  item.status = status;
  item.updatedAt = new Date().toISOString();

  const saved = await saveEntries();
  if (!saved) {
    item.status = oldStatus;
    item.updatedAt = oldUpdatedAt;
    return false;
  }

  return true;
}

// ============================================================================
// File I/O
// ============================================================================

/**
 * Format a date as YYYY-MM-DD string
 */
function formatDateString(date: Date): string {
  const { year, month, day } = formatDailyNotePath(date);
  return `${year}-${month}-${day}`;
}

/**
 * Get the directory path for a journal date, creating directories as needed
 */
async function ensureJournalDirectory(date: Date): Promise<string> {
  const { year, month } = formatDailyNotePath(date);
  const dailyNotesFolder = vault.dailyNotesFolder || 'zzz_Daily Notes';

  const dailyPath = dailyNotesFolder;
  const yearPath = `${dailyPath}/${year}`;
  const monthPath = `${yearPath}/${month}`;

  // Ensure directories exist
  const dailyExists = await fileService.exists(dailyPath);
  if (!dailyExists.exists) {
    await fileService.createDirectory(dailyPath);
  }

  const yearExists = await fileService.exists(yearPath);
  if (!yearExists.exists) {
    await fileService.createDirectory(yearPath);
  }

  const monthExists = await fileService.exists(monthPath);
  if (!monthExists.exists) {
    await fileService.createDirectory(monthPath);
  }

  return monthPath;
}

/**
 * Get the full path for a journal file
 */
function getJournalFilePath(date: Date): string {
  const { year, month, day } = formatDailyNotePath(date);
  const dailyNotesFolder = vault.dailyNotesFolder || 'zzz_Daily Notes';
  return `${dailyNotesFolder}/${year}/${month}/${year}-${month}-${day}.yaml`;
}

/**
 * Load entries and task items for a specific date
 */
export async function loadEntriesForDate(date: Date): Promise<JournalEntry[]> {
  if (!vault.path) {
    journalStore.selectedDate = date;
    journalStore.entries = [];
    journalStore.taskItems = [];
    journalStore.isLoading = false;
    return [];
  }

  journalStore.isLoading = true;
  journalStore.selectedDate = date;

  try {
    const filePath = getJournalFilePath(date);
    const existsResult = await fileService.exists(filePath);

    if (existsResult.exists) {
      const text = await fileService.readFile(filePath);
      const data = yaml.load(text) as JournalData;

      // Version 2 data has no taskItems - normalize to empty array
      const taskItems = (data?.taskItems ?? []).map((item) => ({
        ...item,
        tags: item.tags ?? [],
        status: item.status ?? 'pending',
      }));

      journalStore.taskItems = taskItems;

      // Normalize entries to ensure tags array exists (for backward compatibility)
      const entries = (data?.entries ?? []).map((entry) => ({
        ...entry,
        tags: entry.tags ?? [],
      }));
      journalStore.entries = entries;
    } else {
      // File doesn't exist - that's okay, just no entries or task items for this date
      journalStore.entries = [];
      journalStore.taskItems = [];
    }
  } catch (err) {
    console.error('Error reading journal file:', err);
    journalStore.entries = [];
    journalStore.taskItems = [];
  }

  journalStore.isLoading = false;
  return journalStore.entries;
}

/**
 * Save current entries and task items to YAML file
 * Only creates file if there are entries or task items (no empty files)
 */
export async function saveEntries(): Promise<boolean> {
  if (!vault.path) {
    console.error('Cannot save journal: no vault open');
    return false;
  }

  if (!journalStore.selectedDate) {
    console.error('Cannot save journal: no date selected');
    return false;
  }

  try {
    const filePath = getJournalFilePath(journalStore.selectedDate);

    const hasEntries = journalStore.entries.length > 0;
    const hasTaskItems = journalStore.taskItems.length > 0;

    // If no entries AND no task items, delete the file if it exists
    if (!hasEntries && !hasTaskItems) {
      try {
        const existsResult = await fileService.exists(filePath);
        if (existsResult.exists) {
          await fileService.deleteFile(filePath);
        }
      } catch {
        // File doesn't exist, that's fine
      }
      syncSelectedDatePresence();
      return true;
    }

    // Ensure directory exists
    await ensureJournalDirectory(journalStore.selectedDate);

    // Create/update the file
    const data: JournalData = {
      version: JOURNAL_DATA_VERSION,
      entries: journalStore.entries,
      taskItems: journalStore.taskItems,
    };

    const yamlStr = yaml.dump(data, {
      lineWidth: -1, // No line wrapping
      quotingType: '"',
      forceQuotes: false,
    });

    await fileService.writeFile(filePath, yamlStr);
    syncSelectedDatePresence();
    return true;
  } catch (err) {
    console.error('Error saving journal:', err);
    return false;
  }
}

/**
 * Scan the daily notes folder to find all dates with persisted journal state.
 */
export async function scanDatesWithEntries(): Promise<void> {
  if (!vault.path) {
    journalStore.datesWithEntries = new Set();
    return;
  }

  const dailyNotesFolder = vault.dailyNotesFolder || 'zzz_Daily Notes';
  journalStore.datesWithEntries = await collectJournalDates(dailyNotesFolder, 'yaml');
}

/**
 * Reset journal state (for testing)
 */
export function resetJournal(): void {
  journalStore.selectedDate = null;
  journalStore.entries = [];
  journalStore.taskItems = [];
  journalStore.isLoading = false;
  journalStore.datesWithEntries = new Set();
}
