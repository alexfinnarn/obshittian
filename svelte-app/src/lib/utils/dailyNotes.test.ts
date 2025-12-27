import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatDailyNotePath,
  generateDailyNoteTemplate,
  getDailyNoteRelativePath,
  getOrCreateDailyNote,
} from './dailyNotes';

describe('dailyNotes utilities', () => {
  describe('formatDailyNotePath', () => {
    it('returns correct components for a date', () => {
      const date = new Date(2024, 11, 25); // December 25, 2024
      const result = formatDailyNotePath(date);

      expect(result.year).toBe('2024');
      expect(result.month).toBe('12');
      expect(result.day).toBe('25');
      expect(result.filename).toBe('2024-12-25.md');
    });

    it('pads single-digit month with zero', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      const result = formatDailyNotePath(date);

      expect(result.month).toBe('01');
      expect(result.filename).toBe('2024-01-15.md');
    });

    it('pads single-digit day with zero', () => {
      const date = new Date(2024, 5, 5); // June 5, 2024
      const result = formatDailyNotePath(date);

      expect(result.day).toBe('05');
      expect(result.filename).toBe('2024-06-05.md');
    });

    it('handles year correctly', () => {
      const date = new Date(2025, 0, 1);
      const result = formatDailyNotePath(date);

      expect(result.year).toBe('2025');
    });
  });

  describe('generateDailyNoteTemplate', () => {
    it('includes the formatted date in heading', () => {
      const date = new Date(2024, 11, 25);
      const template = generateDailyNoteTemplate(date);

      expect(template).toContain('# 2024-12-25');
    });

    it('includes the day name', () => {
      const date = new Date(2024, 11, 25); // Wednesday
      const template = generateDailyNoteTemplate(date);

      expect(template).toContain('## Wednesday');
    });

    it('includes sync: delete frontmatter', () => {
      const date = new Date(2024, 11, 25);
      const template = generateDailyNoteTemplate(date);

      expect(template).toContain('---');
      expect(template).toContain('sync: delete');
    });

    it('includes empty task checkbox', () => {
      const date = new Date(2024, 11, 25);
      const template = generateDailyNoteTemplate(date);

      expect(template).toContain('- [ ]');
    });

    it('includes Notes section', () => {
      const date = new Date(2024, 11, 25);
      const template = generateDailyNoteTemplate(date);

      expect(template).toContain('## Notes');
    });
  });

  describe('getDailyNoteRelativePath', () => {
    it('constructs correct path with dailyNotesFolder', () => {
      const date = new Date(2024, 11, 25);
      const result = getDailyNoteRelativePath('zzz_Daily Notes', date);

      expect(result).toBe('zzz_Daily Notes/2024/12/2024-12-25.md');
    });

    it('works with custom folder name', () => {
      const date = new Date(2024, 0, 1);
      const result = getDailyNoteRelativePath('Daily', date);

      expect(result).toBe('Daily/2024/01/2024-01-01.md');
    });
  });

  describe('getOrCreateDailyNote', () => {
    let mockRootHandle: FileSystemDirectoryHandle;
    let mockDailyDir: FileSystemDirectoryHandle;
    let mockYearDir: FileSystemDirectoryHandle;
    let mockMonthDir: FileSystemDirectoryHandle;
    let mockFileHandle: FileSystemFileHandle;
    let mockWritable: FileSystemWritableFileStream;

    beforeEach(() => {
      // Create mock writable stream
      mockWritable = {
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      } as unknown as FileSystemWritableFileStream;

      // Create mock file handle
      mockFileHandle = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue('existing content'),
        }),
        createWritable: vi.fn().mockResolvedValue(mockWritable),
        name: '2024-12-25.md',
      } as unknown as FileSystemFileHandle;

      // Create mock directory handles
      mockMonthDir = {
        getFileHandle: vi.fn(),
        getDirectoryHandle: vi.fn(),
      } as unknown as FileSystemDirectoryHandle;

      mockYearDir = {
        getDirectoryHandle: vi.fn().mockResolvedValue(mockMonthDir),
      } as unknown as FileSystemDirectoryHandle;

      mockDailyDir = {
        getDirectoryHandle: vi.fn().mockResolvedValue(mockYearDir),
      } as unknown as FileSystemDirectoryHandle;

      mockRootHandle = {
        getDirectoryHandle: vi.fn().mockResolvedValue(mockDailyDir),
      } as unknown as FileSystemDirectoryHandle;
    });

    it('opens existing daily note', async () => {
      // File exists
      (mockMonthDir.getFileHandle as ReturnType<typeof vi.fn>).mockResolvedValue(mockFileHandle);

      const date = new Date(2024, 11, 25);
      const result = await getOrCreateDailyNote(mockRootHandle, 'zzz_Daily Notes', date);

      expect(result.fileHandle).toBe(mockFileHandle);
      expect(result.content).toBe('existing content');
      expect(result.isNew).toBe(false);
      expect(result.relativePath).toBe('zzz_Daily Notes/2024/12/2024-12-25.md');
    });

    it('creates new daily note when file does not exist', async () => {
      // File doesn't exist on first call, then we create it
      (mockMonthDir.getFileHandle as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('File not found'))
        .mockResolvedValueOnce(mockFileHandle);

      const date = new Date(2024, 11, 25);
      const result = await getOrCreateDailyNote(mockRootHandle, 'zzz_Daily Notes', date);

      expect(result.isNew).toBe(true);
      expect(result.content).toContain('sync: delete');
      expect(result.content).toContain('# 2024-12-25');
      expect(mockWritable.write).toHaveBeenCalled();
      expect(mockWritable.close).toHaveBeenCalled();
    });

    it('creates nested directory structure', async () => {
      (mockMonthDir.getFileHandle as ReturnType<typeof vi.fn>).mockResolvedValue(mockFileHandle);

      const date = new Date(2024, 11, 25);
      await getOrCreateDailyNote(mockRootHandle, 'zzz_Daily Notes', date);

      // Check that directories were accessed/created with { create: true }
      expect(mockRootHandle.getDirectoryHandle).toHaveBeenCalledWith('zzz_Daily Notes', { create: true });
      expect(mockDailyDir.getDirectoryHandle).toHaveBeenCalledWith('2024', { create: true });
      expect(mockYearDir.getDirectoryHandle).toHaveBeenCalledWith('12', { create: true });
    });

    it('returns correct directory handle', async () => {
      (mockMonthDir.getFileHandle as ReturnType<typeof vi.fn>).mockResolvedValue(mockFileHandle);

      const date = new Date(2024, 11, 25);
      const result = await getOrCreateDailyNote(mockRootHandle, 'zzz_Daily Notes', date);

      expect(result.dirHandle).toBe(mockMonthDir);
    });
  });
});
