import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatDailyNotePath,
  generateDailyNoteTemplate,
  getDailyNoteRelativePath,
  getOrCreateDailyNote,
} from './dailyNotes';
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

describe('dailyNotes utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    it('includes day name and date in heading', () => {
      const date = new Date(2024, 11, 25); // Wednesday
      const template = generateDailyNoteTemplate(date);

      expect(template).toContain('# Wednesday - 2024-12-25');
    });

    it('includes Notes section', () => {
      const date = new Date(2024, 11, 25);
      const template = generateDailyNoteTemplate(date);

      expect(template).toContain('## Notes');
    });

    it('does not include task checkbox placeholder', () => {
      const date = new Date(2024, 11, 25);
      const template = generateDailyNoteTemplate(date);

      expect(template).not.toContain('- [ ]');
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
    it('opens existing daily note', async () => {
      // File exists
      mockFileService.exists.mockResolvedValue({ exists: true, kind: 'file' });
      mockFileService.readFile.mockResolvedValue('existing content');

      const date = new Date(2024, 11, 25);
      const result = await getOrCreateDailyNote('zzz_Daily Notes', date);

      expect(result.content).toBe('existing content');
      expect(result.isNew).toBe(false);
      expect(result.relativePath).toBe('zzz_Daily Notes/2024/12/2024-12-25.md');
    });

    it('creates new daily note when file does not exist', async () => {
      // File doesn't exist
      mockFileService.exists
        .mockResolvedValueOnce({ exists: false }) // file doesn't exist
        .mockResolvedValueOnce({ exists: true, kind: 'directory' }) // year dir exists
        .mockResolvedValueOnce({ exists: true, kind: 'directory' }); // month dir exists
      mockFileService.createFile.mockResolvedValue(undefined);

      const date = new Date(2024, 11, 25);
      const result = await getOrCreateDailyNote('zzz_Daily Notes', date);

      expect(result.isNew).toBe(true);
      expect(result.content).toContain('# Wednesday - 2024-12-25');
      expect(mockFileService.createFile).toHaveBeenCalled();
    });

    it('creates nested directory structure', async () => {
      // File and directories don't exist
      mockFileService.exists.mockResolvedValue({ exists: false });
      mockFileService.createDirectory.mockResolvedValue(undefined);
      mockFileService.createFile.mockResolvedValue(undefined);

      const date = new Date(2024, 11, 25);
      await getOrCreateDailyNote('zzz_Daily Notes', date);

      // Check that directories were created
      expect(mockFileService.createDirectory).toHaveBeenCalledWith('zzz_Daily Notes/2024');
      expect(mockFileService.createDirectory).toHaveBeenCalledWith('zzz_Daily Notes/2024/12');
    });

    it('returns correct relative path', async () => {
      mockFileService.exists.mockResolvedValue({ exists: true, kind: 'file' });
      mockFileService.readFile.mockResolvedValue('content');

      const date = new Date(2024, 11, 25);
      const result = await getOrCreateDailyNote('zzz_Daily Notes', date);

      expect(result.relativePath).toBe('zzz_Daily Notes/2024/12/2024-12-25.md');
    });
  });
});
