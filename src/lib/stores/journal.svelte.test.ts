import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  journalStore,
  getEntries,
  getSelectedDate,
  getSelectedDateString,
  hasEntriesForDate,
  getDatesWithEntries,
  addEntry,
  removeEntry,
  updateEntryText,
  updateEntryTags,
  addTagToEntry,
  removeTagFromEntry,
  updateEntryOrder,
  loadEntriesForDate,
  saveEntries,
  resetJournal,
} from './journal.svelte';
import { vault, closeVault, openVault } from './vault.svelte';
import { fileService } from '$lib/services/fileService';

// Mock the fileService
vi.mock('$lib/services/fileService', () => ({
  fileService: {
    setVaultPath: vi.fn(),
    getVaultPath: vi.fn(() => '/mock/vault'),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    exists: vi.fn(),
    createFile: vi.fn(),
    createDirectory: vi.fn(),
    deleteFile: vi.fn(),
    deleteDirectory: vi.fn(),
    listDirectory: vi.fn(),
    rename: vi.fn(),
    stat: vi.fn(),
  },
}));

const mockFileService = vi.mocked(fileService);

describe('journal store', () => {
  beforeEach(() => {
    resetJournal();
    closeVault();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has empty entries array', () => {
      expect(journalStore.entries).toEqual([]);
    });

    it('has null selected date', () => {
      expect(journalStore.selectedDate).toBeNull();
    });

    it('is not loading', () => {
      expect(journalStore.isLoading).toBe(false);
    });

    it('has empty datesWithEntries', () => {
      expect(journalStore.datesWithEntries.size).toBe(0);
    });
  });

  describe('getters', () => {
    it('getEntries returns entries array', () => {
      expect(getEntries()).toEqual([]);
    });

    it('getSelectedDate returns null initially', () => {
      expect(getSelectedDate()).toBeNull();
    });

    it('getSelectedDateString returns null when no date selected', () => {
      expect(getSelectedDateString()).toBeNull();
    });

    it('getDatesWithEntries returns empty array initially', () => {
      expect(getDatesWithEntries()).toEqual([]);
    });

    it('hasEntriesForDate returns false for unknown date', () => {
      expect(hasEntriesForDate('2025-01-15')).toBe(false);
    });
  });

  describe('loadEntriesForDate', () => {
    it('sets selected date', async () => {
      const date = new Date(2025, 0, 15);
      await loadEntriesForDate(date);

      expect(journalStore.selectedDate).toEqual(date);
    });

    it('returns empty array when no vault is open', async () => {
      const date = new Date(2025, 0, 15);
      const entries = await loadEntriesForDate(date);

      expect(entries).toEqual([]);
      expect(journalStore.entries).toEqual([]);
    });

    it('returns empty array for non-existent file', async () => {
      openVault('/mock/vault');
      mockFileService.exists.mockResolvedValue({ exists: false });

      const date = new Date(2025, 0, 15);
      const entries = await loadEntriesForDate(date);

      expect(entries).toEqual([]);
    });

    it('loads entries from existing file', async () => {
      openVault('/mock/vault');
      mockFileService.exists.mockResolvedValue({ exists: true, kind: 'file' });
      mockFileService.readFile.mockResolvedValue(`version: 2
entries:
  - id: test-1
    text: Test entry
    tags:
      - note
      - important
    order: 1
    createdAt: "2025-01-15T10:00:00.000Z"
    updatedAt: "2025-01-15T10:00:00.000Z"
`);

      const date = new Date(2025, 0, 15);
      const entries = await loadEntriesForDate(date);

      expect(entries.length).toBe(1);
      expect(entries[0].id).toBe('test-1');
      expect(entries[0].text).toBe('Test entry');
      expect(entries[0].tags).toEqual(['note', 'important']);
    });
  });

  describe('addEntry', () => {
    beforeEach(() => {
      openVault('/mock/vault');
      mockFileService.exists.mockResolvedValue({ exists: true, kind: 'directory' });
      mockFileService.writeFile.mockResolvedValue(undefined);
      journalStore.selectedDate = new Date(2025, 0, 15);
    });

    it('returns null when no date selected', async () => {
      journalStore.selectedDate = null;
      const result = await addEntry('Test');
      expect(result).toBeNull();
    });

    it('adds entry with correct fields', async () => {
      const entry = await addEntry('Test entry', ['note', 'important']);

      expect(entry).not.toBeNull();
      expect(entry!.text).toBe('Test entry');
      expect(entry!.tags).toEqual(['note', 'important']);
      expect(entry!.order).toBe(1);
      expect(entry!.id).toBeDefined();
      expect(entry!.createdAt).toBeDefined();
      expect(entry!.updatedAt).toBeDefined();
    });

    it('auto-increments order', async () => {
      await addEntry('First');
      const second = await addEntry('Second');

      expect(second!.order).toBe(2);
    });

    it('uses empty tags array when not specified', async () => {
      const entry = await addEntry('Test');

      expect(entry!.tags).toEqual([]);
    });

    it('updates datesWithEntries on first entry', async () => {
      expect(hasEntriesForDate('2025-01-15')).toBe(false);

      await addEntry('Test');

      expect(hasEntriesForDate('2025-01-15')).toBe(true);
    });
  });

  describe('removeEntry', () => {
    beforeEach(async () => {
      openVault('/mock/vault');
      mockFileService.exists.mockResolvedValue({ exists: true, kind: 'directory' });
      mockFileService.writeFile.mockResolvedValue(undefined);
      journalStore.selectedDate = new Date(2025, 0, 15);
      await addEntry('Test entry');
    });

    it('removes entry by id', async () => {
      const entryId = journalStore.entries[0].id;
      const result = await removeEntry(entryId);

      expect(result).toBe(true);
      expect(journalStore.entries.length).toBe(0);
    });

    it('returns false for non-existent id', async () => {
      const result = await removeEntry('non-existent');
      expect(result).toBe(false);
    });

    it('updates datesWithEntries when last entry removed', async () => {
      expect(hasEntriesForDate('2025-01-15')).toBe(true);

      const entryId = journalStore.entries[0].id;
      await removeEntry(entryId);

      expect(hasEntriesForDate('2025-01-15')).toBe(false);
    });
  });

  describe('updateEntryText', () => {
    beforeEach(async () => {
      openVault('/mock/vault');
      mockFileService.exists.mockResolvedValue({ exists: true, kind: 'directory' });
      mockFileService.writeFile.mockResolvedValue(undefined);
      journalStore.selectedDate = new Date(2025, 0, 15);
      await addEntry('Original text');
    });

    it('updates text', async () => {
      const entryId = journalStore.entries[0].id;
      const result = await updateEntryText(entryId, 'Updated text');

      expect(result).toBe(true);
      expect(journalStore.entries[0].text).toBe('Updated text');
    });

    it('updates updatedAt timestamp', async () => {
      const entryId = journalStore.entries[0].id;
      const originalUpdatedAt = journalStore.entries[0].updatedAt;

      // Small delay to ensure timestamp difference
      await new Promise((r) => setTimeout(r, 10));
      await updateEntryText(entryId, 'Updated text');

      expect(journalStore.entries[0].updatedAt).not.toBe(originalUpdatedAt);
    });

    it('does not change createdAt', async () => {
      const entryId = journalStore.entries[0].id;
      const originalCreatedAt = journalStore.entries[0].createdAt;

      await updateEntryText(entryId, 'Updated text');

      expect(journalStore.entries[0].createdAt).toBe(originalCreatedAt);
    });

    it('returns false for non-existent id', async () => {
      const result = await updateEntryText('non-existent', 'Test');
      expect(result).toBe(false);
    });
  });

  describe('updateEntryTags', () => {
    beforeEach(async () => {
      openVault('/mock/vault');
      mockFileService.exists.mockResolvedValue({ exists: true, kind: 'directory' });
      mockFileService.writeFile.mockResolvedValue(undefined);
      journalStore.selectedDate = new Date(2025, 0, 15);
      await addEntry('Test', ['note']);
    });

    it('updates tags', async () => {
      const entryId = journalStore.entries[0].id;
      const result = await updateEntryTags(entryId, ['task', 'urgent']);

      expect(result).toBe(true);
      expect(journalStore.entries[0].tags).toEqual(['task', 'urgent']);
    });

    it('returns false for non-existent id', async () => {
      const result = await updateEntryTags('non-existent', ['task']);
      expect(result).toBe(false);
    });
  });

  describe('addTagToEntry', () => {
    beforeEach(async () => {
      openVault('/mock/vault');
      mockFileService.exists.mockResolvedValue({ exists: true, kind: 'directory' });
      mockFileService.writeFile.mockResolvedValue(undefined);
      journalStore.selectedDate = new Date(2025, 0, 15);
      await addEntry('Test', ['note']);
    });

    it('adds a new tag', async () => {
      const entryId = journalStore.entries[0].id;
      const result = await addTagToEntry(entryId, 'urgent');

      expect(result).toBe(true);
      expect(journalStore.entries[0].tags).toContain('note');
      expect(journalStore.entries[0].tags).toContain('urgent');
    });

    it('does not add duplicate tags', async () => {
      const entryId = journalStore.entries[0].id;
      await addTagToEntry(entryId, 'note');

      expect(journalStore.entries[0].tags).toEqual(['note']);
    });

    it('returns false for non-existent id', async () => {
      const result = await addTagToEntry('non-existent', 'tag');
      expect(result).toBe(false);
    });
  });

  describe('removeTagFromEntry', () => {
    beforeEach(async () => {
      openVault('/mock/vault');
      mockFileService.exists.mockResolvedValue({ exists: true, kind: 'directory' });
      mockFileService.writeFile.mockResolvedValue(undefined);
      journalStore.selectedDate = new Date(2025, 0, 15);
      await addEntry('Test', ['note', 'important']);
    });

    it('removes an existing tag', async () => {
      const entryId = journalStore.entries[0].id;
      const result = await removeTagFromEntry(entryId, 'note');

      expect(result).toBe(true);
      expect(journalStore.entries[0].tags).toEqual(['important']);
    });

    it('returns true when tag does not exist', async () => {
      const entryId = journalStore.entries[0].id;
      const result = await removeTagFromEntry(entryId, 'nonexistent');

      expect(result).toBe(true);
      expect(journalStore.entries[0].tags).toEqual(['note', 'important']);
    });

    it('returns false for non-existent id', async () => {
      const result = await removeTagFromEntry('non-existent', 'tag');
      expect(result).toBe(false);
    });
  });

  describe('updateEntryOrder', () => {
    beforeEach(async () => {
      openVault('/mock/vault');
      mockFileService.exists.mockResolvedValue({ exists: true, kind: 'directory' });
      mockFileService.writeFile.mockResolvedValue(undefined);
      journalStore.selectedDate = new Date(2025, 0, 15);
      await addEntry('Test');
    });

    it('updates order', async () => {
      const entryId = journalStore.entries[0].id;
      const result = await updateEntryOrder(entryId, 5);

      expect(result).toBe(true);
      expect(journalStore.entries[0].order).toBe(5);
    });

    it('returns false for non-existent id', async () => {
      const result = await updateEntryOrder('non-existent', 5);
      expect(result).toBe(false);
    });
  });

  describe('saveEntries', () => {
    it('returns false when no vault is open', async () => {
      journalStore.selectedDate = new Date(2025, 0, 15);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await saveEntries();

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });

    it('returns false when no date selected', async () => {
      openVault('/mock/vault');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await saveEntries();

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });

    it('returns true on successful save', async () => {
      openVault('/mock/vault');
      mockFileService.exists.mockResolvedValue({ exists: true, kind: 'directory' });
      mockFileService.writeFile.mockResolvedValue(undefined);
      journalStore.selectedDate = new Date(2025, 0, 15);
      await addEntry('Test');

      const result = await saveEntries();

      expect(result).toBe(true);
    });
  });

  describe('resetJournal', () => {
    it('clears all state', async () => {
      openVault('/mock/vault');
      mockFileService.exists.mockResolvedValue({ exists: true, kind: 'directory' });
      mockFileService.writeFile.mockResolvedValue(undefined);
      journalStore.selectedDate = new Date(2025, 0, 15);
      await addEntry('Test');

      resetJournal();

      expect(journalStore.selectedDate).toBeNull();
      expect(journalStore.entries).toEqual([]);
      expect(journalStore.isLoading).toBe(false);
      expect(journalStore.datesWithEntries.size).toBe(0);
    });
  });
});
