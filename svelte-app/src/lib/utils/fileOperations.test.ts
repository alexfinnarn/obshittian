import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sortEntries,
  isVisibleEntry,
  getVisibleEntries,
  createFile,
  createFolder,
  deleteEntry,
  getRelativePath,
} from './fileOperations';

// Mock FileSystemHandle
function createMockFileHandle(name: string): FileSystemFileHandle {
  return {
    kind: 'file',
    name,
    getFile: vi.fn().mockResolvedValue({
      text: vi.fn().mockResolvedValue(''),
    }),
    createWritable: vi.fn().mockResolvedValue({
      write: vi.fn(),
      close: vi.fn(),
    }),
    isSameEntry: vi.fn(),
    queryPermission: vi.fn(),
    requestPermission: vi.fn(),
  } as unknown as FileSystemFileHandle;
}

function createMockDirHandle(
  name: string,
  entries: FileSystemHandle[] = []
): FileSystemDirectoryHandle {
  const handle: FileSystemDirectoryHandle = {
    kind: 'directory',
    name,
    getFileHandle: vi.fn().mockResolvedValue(createMockFileHandle('new-file.md')),
    getDirectoryHandle: vi.fn().mockImplementation((folderName: string) => {
      // Return a simple mock to avoid infinite recursion
      return Promise.resolve({
        kind: 'directory',
        name: folderName,
        getFileHandle: vi.fn(),
        getDirectoryHandle: vi.fn(),
        removeEntry: vi.fn(),
        resolve: vi.fn(),
        values: vi.fn().mockImplementation(async function* () {}),
        isSameEntry: vi.fn(),
        queryPermission: vi.fn(),
        requestPermission: vi.fn(),
        keys: vi.fn(),
        entries: vi.fn(),
      } as unknown as FileSystemDirectoryHandle);
    }),
    removeEntry: vi.fn(),
    resolve: vi.fn().mockResolvedValue(['path', 'to', 'file.md']),
    values: vi.fn().mockImplementation(async function* () {
      for (const entry of entries) {
        yield entry;
      }
    }),
    isSameEntry: vi.fn(),
    queryPermission: vi.fn(),
    requestPermission: vi.fn(),
    keys: vi.fn(),
    entries: vi.fn(),
  } as unknown as FileSystemDirectoryHandle;
  return handle;
}

describe('fileOperations', () => {
  describe('sortEntries', () => {
    it('sorts folders before files', () => {
      const file1 = createMockFileHandle('zeta.md');
      const file2 = createMockFileHandle('alpha.md');
      const dir1 = createMockDirHandle('beta');

      const sorted = sortEntries([file1, dir1, file2]);

      expect(sorted[0].name).toBe('beta'); // directory first
      expect(sorted[1].name).toBe('alpha.md'); // then files alphabetically
      expect(sorted[2].name).toBe('zeta.md');
    });

    it('sorts entries alphabetically within same type', () => {
      const file1 = createMockFileHandle('c.md');
      const file2 = createMockFileHandle('a.md');
      const file3 = createMockFileHandle('b.md');

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
      const hidden = createMockFileHandle('.hidden');
      expect(isVisibleEntry(hidden)).toBe(false);
    });

    it('hides .editor-config.json', () => {
      const config = createMockFileHandle('.editor-config.json');
      expect(isVisibleEntry(config)).toBe(false);
    });

    it('shows .md files', () => {
      const mdFile = createMockFileHandle('notes.md');
      expect(isVisibleEntry(mdFile)).toBe(true);
    });

    it('shows .txt files', () => {
      const txtFile = createMockFileHandle('readme.txt');
      expect(isVisibleEntry(txtFile)).toBe(true);
    });

    it('hides other file types', () => {
      const jsFile = createMockFileHandle('script.js');
      expect(isVisibleEntry(jsFile)).toBe(false);
    });

    it('shows directories', () => {
      const dir = createMockDirHandle('folder');
      expect(isVisibleEntry(dir)).toBe(true);
    });

    it('hides hidden directories', () => {
      const hiddenDir = createMockDirHandle('.git');
      expect(isVisibleEntry(hiddenDir)).toBe(false);
    });
  });

  describe('getVisibleEntries', () => {
    it('returns only visible entries, sorted', async () => {
      const file1 = createMockFileHandle('zeta.md');
      const file2 = createMockFileHandle('alpha.md');
      const hidden = createMockFileHandle('.hidden');
      const dir = createMockDirHandle('beta');
      const jsFile = createMockFileHandle('script.js');

      const parentDir = createMockDirHandle('root', [file1, hidden, dir, file2, jsFile]);

      const entries = await getVisibleEntries(parentDir);

      expect(entries.length).toBe(3);
      expect(entries[0].name).toBe('beta'); // directory first
      expect(entries[1].name).toBe('alpha.md');
      expect(entries[2].name).toBe('zeta.md');
    });
  });

  describe('createFile', () => {
    it('creates a file with getFileHandle', async () => {
      const parentDir = createMockDirHandle('root');
      const mockFileHandle = createMockFileHandle('new.md');
      vi.mocked(parentDir.getFileHandle).mockResolvedValue(mockFileHandle);

      const result = await createFile(parentDir, 'new.md');

      expect(parentDir.getFileHandle).toHaveBeenCalledWith('new.md', { create: true });
      expect(result).toBe(mockFileHandle);
    });

    it('throws on error', async () => {
      const parentDir = createMockDirHandle('root');
      vi.mocked(parentDir.getFileHandle).mockRejectedValue(new Error('Access denied'));

      await expect(createFile(parentDir, 'new.md')).rejects.toThrow('Failed to create file');
    });
  });

  describe('createFolder', () => {
    it('creates a folder with getDirectoryHandle', async () => {
      const parentDir = createMockDirHandle('root');
      const mockDirHandle = createMockDirHandle('new-folder');
      vi.mocked(parentDir.getDirectoryHandle).mockResolvedValue(mockDirHandle);

      const result = await createFolder(parentDir, 'new-folder');

      expect(parentDir.getDirectoryHandle).toHaveBeenCalledWith('new-folder', { create: true });
      expect(result).toBe(mockDirHandle);
    });
  });

  describe('deleteEntry', () => {
    it('deletes a file', async () => {
      const parentDir = createMockDirHandle('root');

      await deleteEntry(parentDir, 'file.md', false);

      expect(parentDir.removeEntry).toHaveBeenCalledWith('file.md');
    });

    it('deletes a directory recursively', async () => {
      const parentDir = createMockDirHandle('root');

      await deleteEntry(parentDir, 'folder', true);

      expect(parentDir.removeEntry).toHaveBeenCalledWith('folder', { recursive: true });
    });
  });

  describe('getRelativePath', () => {
    it('returns joined path from resolve', async () => {
      const rootDir = createMockDirHandle('root');
      const fileHandle = createMockFileHandle('file.md');
      vi.mocked(rootDir.resolve).mockResolvedValue(['path', 'to', 'file.md']);

      const result = await getRelativePath(rootDir, fileHandle);

      expect(result).toBe('path/to/file.md');
    });

    it('returns null when resolve returns null', async () => {
      const rootDir = createMockDirHandle('root');
      const fileHandle = createMockFileHandle('file.md');
      vi.mocked(rootDir.resolve).mockResolvedValue(null);

      const result = await getRelativePath(rootDir, fileHandle);

      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      const rootDir = createMockDirHandle('root');
      const fileHandle = createMockFileHandle('file.md');
      vi.mocked(rootDir.resolve).mockRejectedValue(new Error('Not found'));

      const result = await getRelativePath(rootDir, fileHandle);

      expect(result).toBeNull();
    });
  });
});
