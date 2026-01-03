import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sortEntries,
  isVisibleEntry,
  getVisibleEntries,
  createFile,
  createFolder,
  deleteEntry,
} from './fileOperations';
import { fileService } from '$lib/services/fileService';
import type { DirectoryEntry } from '$lib/server/fileTypes';

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

// Helper to create mock DirectoryEntry
function createMockFileEntry(name: string): DirectoryEntry {
  return { kind: 'file', name };
}

function createMockDirEntry(name: string): DirectoryEntry {
  return { kind: 'directory', name };
}

describe('fileOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sortEntries', () => {
    it('sorts folders before files', () => {
      const file1 = createMockFileEntry('zeta.md');
      const file2 = createMockFileEntry('alpha.md');
      const dir1 = createMockDirEntry('beta');

      const sorted = sortEntries([file1, dir1, file2]);

      expect(sorted[0].name).toBe('beta'); // directory first
      expect(sorted[1].name).toBe('alpha.md'); // then files alphabetically
      expect(sorted[2].name).toBe('zeta.md');
    });

    it('sorts entries alphabetically within same type', () => {
      const file1 = createMockFileEntry('c.md');
      const file2 = createMockFileEntry('a.md');
      const file3 = createMockFileEntry('b.md');

      const sorted = sortEntries([file1, file2, file3]);

      expect(sorted.map((e) => e.name)).toEqual(['a.md', 'b.md', 'c.md']);
    });

    it('handles empty array', () => {
      const sorted = sortEntries([]);
      expect(sorted).toEqual([]);
    });
  });

  describe('isVisibleEntry', () => {
    it('hides dotfiles', () => {
      const hidden = createMockFileEntry('.hidden');
      expect(isVisibleEntry(hidden)).toBe(false);
    });

    it('hides .editor-config.json', () => {
      const config = createMockFileEntry('.editor-config.json');
      expect(isVisibleEntry(config)).toBe(false);
    });

    it('shows .md files', () => {
      const mdFile = createMockFileEntry('notes.md');
      expect(isVisibleEntry(mdFile)).toBe(true);
    });

    it('shows .txt files', () => {
      const txtFile = createMockFileEntry('readme.txt');
      expect(isVisibleEntry(txtFile)).toBe(true);
    });

    it('hides other file types', () => {
      const jsFile = createMockFileEntry('script.js');
      expect(isVisibleEntry(jsFile)).toBe(false);
    });

    it('shows directories', () => {
      const dir = createMockDirEntry('folder');
      expect(isVisibleEntry(dir)).toBe(true);
    });

    it('hides hidden directories', () => {
      const hiddenDir = createMockDirEntry('.git');
      expect(isVisibleEntry(hiddenDir)).toBe(false);
    });
  });

  describe('getVisibleEntries', () => {
    it('returns only visible entries, sorted', async () => {
      mockFileService.listDirectory.mockResolvedValue([
        createMockFileEntry('zeta.md'),
        createMockFileEntry('.hidden'),
        createMockDirEntry('beta'),
        createMockFileEntry('alpha.md'),
        createMockFileEntry('script.js'),
      ]);

      const entries = await getVisibleEntries('root');

      expect(entries.length).toBe(3);
      expect(entries[0].name).toBe('beta'); // directory first
      expect(entries[1].name).toBe('alpha.md');
      expect(entries[2].name).toBe('zeta.md');
    });
  });

  describe('createFile', () => {
    it('creates a file using fileService', async () => {
      mockFileService.createFile.mockResolvedValue(undefined);

      const result = await createFile('folder', 'new.md');

      expect(mockFileService.createFile).toHaveBeenCalledWith('folder/new.md', '');
      expect(result).toBe('folder/new.md');
    });

    it('throws on error', async () => {
      mockFileService.createFile.mockRejectedValue(new Error('Access denied'));

      await expect(createFile('folder', 'new.md')).rejects.toThrow('Failed to create file');
    });
  });

  describe('createFolder', () => {
    it('creates a folder using fileService', async () => {
      mockFileService.createDirectory.mockResolvedValue(undefined);

      const result = await createFolder('folder', 'new-folder');

      expect(mockFileService.createDirectory).toHaveBeenCalledWith('folder/new-folder');
      expect(result).toBe('folder/new-folder');
    });
  });

  describe('deleteEntry', () => {
    it('deletes a file', async () => {
      mockFileService.deleteFile.mockResolvedValue(undefined);

      await deleteEntry('folder', 'file.md', false);

      expect(mockFileService.deleteFile).toHaveBeenCalledWith('folder/file.md');
    });

    it('deletes a directory recursively', async () => {
      mockFileService.deleteDirectory.mockResolvedValue(undefined);

      await deleteEntry('folder', 'subfolder', true);

      expect(mockFileService.deleteDirectory).toHaveBeenCalledWith('folder/subfolder', true);
    });
  });
});
