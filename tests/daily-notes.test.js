import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatDailyNotePath,
  generateDailyNoteTemplate,
  getOrCreateDirectory,
  openDailyNote
} from '../js/daily-notes.js';
import { createMockDirectoryHandle, createMockFileHandle } from './mocks/file-system.js';

describe('daily-notes', () => {
  describe('formatDailyNotePath', () => {
    it('formats a regular date correctly', () => {
      const date = new Date(2024, 5, 15); // June 15, 2024
      const result = formatDailyNotePath(date);

      expect(result.year).toBe('2024');
      expect(result.month).toBe('06');
      expect(result.day).toBe('15');
      expect(result.filename).toBe('2024-06-15.md');
    });

    it('pads single-digit months and days', () => {
      const date = new Date(2024, 0, 5); // January 5, 2024
      const result = formatDailyNotePath(date);

      expect(result.month).toBe('01');
      expect(result.day).toBe('05');
      expect(result.filename).toBe('2024-01-05.md');
    });

    it('handles December correctly (month 12)', () => {
      const date = new Date(2024, 11, 25); // December 25, 2024
      const result = formatDailyNotePath(date);

      expect(result.month).toBe('12');
      expect(result.filename).toBe('2024-12-25.md');
    });

    it('handles end of month dates', () => {
      const date = new Date(2024, 0, 31); // January 31, 2024
      const result = formatDailyNotePath(date);

      expect(result.day).toBe('31');
    });
  });

  describe('generateDailyNoteTemplate', () => {
    it('generates template with correct date header', () => {
      const date = new Date(2024, 5, 15); // June 15, 2024 (Saturday)
      const template = generateDailyNoteTemplate(date);

      expect(template).toContain('# 2024-06-15');
    });

    it('includes the day name', () => {
      const date = new Date(2024, 5, 15); // June 15, 2024 (Saturday)
      const template = generateDailyNoteTemplate(date);

      expect(template).toContain('Saturday');
    });

    it('includes a todo checkbox', () => {
      const date = new Date(2024, 5, 15);
      const template = generateDailyNoteTemplate(date);

      expect(template).toContain('- [ ]');
    });

    it('includes Notes section', () => {
      const date = new Date(2024, 5, 15);
      const template = generateDailyNoteTemplate(date);

      expect(template).toContain('## Notes');
    });
  });

  describe('getOrCreateDirectory', () => {
    it('returns existing directory when it exists', async () => {
      const existingDir = createMockDirectoryHandle('existing');
      const parentDir = createMockDirectoryHandle('parent', {
        existing: existingDir
      });

      const result = await getOrCreateDirectory(parentDir, 'existing');
      expect(result).toBe(existingDir);
    });

    it('creates new directory when it does not exist', async () => {
      const parentDir = createMockDirectoryHandle('parent');

      const result = await getOrCreateDirectory(parentDir, 'newDir');
      expect(result.kind).toBe('directory');
      expect(result.name).toBe('newDir');
    });
  });

  describe('openDailyNote', () => {
    let mockState;
    let mockOpenFileInPane;

    beforeEach(() => {
      mockState = {
        rootDirHandle: createMockDirectoryHandle('root'),
        dailyNotesFolder: 'zzz_Daily Notes'
      };
      mockOpenFileInPane = vi.fn();
    });

    it('does nothing when no root directory is open', async () => {
      mockState.rootDirHandle = null;
      const consoleSpy = vi.spyOn(console, 'log');

      await openDailyNote(new Date(), mockState, mockOpenFileInPane);

      expect(consoleSpy).toHaveBeenCalledWith('No folder open');
      expect(mockOpenFileInPane).not.toHaveBeenCalled();
    });

    it('creates directory structure for new daily note', async () => {
      const date = new Date(2024, 5, 15);

      await openDailyNote(date, mockState, mockOpenFileInPane);

      // Verify the directory structure was created
      const dailyDir = await mockState.rootDirHandle.getDirectoryHandle('zzz_Daily Notes');
      expect(dailyDir).toBeDefined();

      const yearDir = await dailyDir.getDirectoryHandle('2024');
      expect(yearDir).toBeDefined();

      const monthDir = await yearDir.getDirectoryHandle('06');
      expect(monthDir).toBeDefined();
    });

    it('opens file in right pane', async () => {
      const date = new Date(2024, 5, 15);

      await openDailyNote(date, mockState, mockOpenFileInPane);

      expect(mockOpenFileInPane).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'file', name: '2024-06-15.md' }),
        expect.any(Object),
        'right'
      );
    });

    it('creates file with template when it does not exist', async () => {
      const date = new Date(2024, 5, 15);

      await openDailyNote(date, mockState, mockOpenFileInPane);

      // Get the file that was created
      const dailyDir = await mockState.rootDirHandle.getDirectoryHandle('zzz_Daily Notes');
      const yearDir = await dailyDir.getDirectoryHandle('2024');
      const monthDir = await yearDir.getDirectoryHandle('06');
      const fileHandle = await monthDir.getFileHandle('2024-06-15.md');

      const file = await fileHandle.getFile();
      const content = await file.text();

      expect(content).toContain('# 2024-06-15');
      expect(content).toContain('Saturday');
    });

    it('uses custom daily notes folder from state', async () => {
      mockState.dailyNotesFolder = 'My Notes';
      const date = new Date(2024, 5, 15);

      await openDailyNote(date, mockState, mockOpenFileInPane);

      const dailyDir = await mockState.rootDirHandle.getDirectoryHandle('My Notes');
      expect(dailyDir).toBeDefined();
    });
  });
});
