import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getRelativePath,
  openFileByPath
} from '../js/file-tree.js';
import { createMockDirectoryHandle, createMockFileHandle } from './mocks/file-system.js';

describe('file-tree', () => {
  describe('getRelativePath', () => {
    it('returns path for file in root directory', async () => {
      const file = createMockFileHandle('readme.md');
      const root = createMockDirectoryHandle('root', {
        'readme.md': file
      });

      const result = await getRelativePath(root, file);

      expect(result).toBe('readme.md');
    });

    it('returns path for file in subdirectory', async () => {
      const file = createMockFileHandle('note.md');
      const subdir = createMockDirectoryHandle('docs', {
        'note.md': file
      });
      const root = createMockDirectoryHandle('root', {
        docs: subdir
      });

      const result = await getRelativePath(root, file);

      expect(result).toBe('docs/note.md');
    });

    it('returns path for deeply nested file', async () => {
      const file = createMockFileHandle('deep.md');
      const level3 = createMockDirectoryHandle('level3', {
        'deep.md': file
      });
      const level2 = createMockDirectoryHandle('level2', {
        level3: level3
      });
      const level1 = createMockDirectoryHandle('level1', {
        level2: level2
      });
      const root = createMockDirectoryHandle('root', {
        level1: level1
      });

      const result = await getRelativePath(root, file);

      expect(result).toBe('level1/level2/level3/deep.md');
    });

    it('returns null when rootDirHandle is null', async () => {
      const file = createMockFileHandle('file.md');

      const result = await getRelativePath(null, file);

      expect(result).toBe(null);
    });

    it('returns null when file is not found in directory', async () => {
      const file = createMockFileHandle('orphan.md');
      const root = createMockDirectoryHandle('root');

      const result = await getRelativePath(root, file);

      expect(result).toBe(null);
    });
  });

  describe('openFileByPath', () => {
    let mockState;
    let mockOpenFileInPane;

    beforeEach(() => {
      const file = createMockFileHandle('target.md', 'file content');
      const subdir = createMockDirectoryHandle('subdir', {
        'target.md': file
      });

      mockState = {
        rootDirHandle: createMockDirectoryHandle('root', {
          subdir: subdir,
          'root-file.md': createMockFileHandle('root-file.md', 'root content')
        })
      };

      mockOpenFileInPane = vi.fn();
    });

    it('opens file in root directory', async () => {
      const result = await openFileByPath('root-file.md', 'left', mockState, mockOpenFileInPane);

      expect(result).toBe(true);
      expect(mockOpenFileInPane).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'root-file.md' }),
        expect.objectContaining({ kind: 'directory' }),
        'left'
      );
    });

    it('opens file in subdirectory', async () => {
      const result = await openFileByPath('subdir/target.md', 'left', mockState, mockOpenFileInPane);

      expect(result).toBe(true);
      expect(mockOpenFileInPane).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'target.md' }),
        expect.objectContaining({ name: 'subdir' }),
        'left'
      );
    });

    it('passes correct pane to openFileInPane', async () => {
      await openFileByPath('root-file.md', 'right', mockState, mockOpenFileInPane);

      expect(mockOpenFileInPane).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        'right'
      );
    });

    it('returns false when rootDirHandle is null', async () => {
      mockState.rootDirHandle = null;

      const result = await openFileByPath('file.md', 'left', mockState, mockOpenFileInPane);

      expect(result).toBe(false);
      expect(mockOpenFileInPane).not.toHaveBeenCalled();
    });

    it('returns false when relativePath is empty', async () => {
      const result = await openFileByPath('', 'left', mockState, mockOpenFileInPane);

      expect(result).toBe(false);
      expect(mockOpenFileInPane).not.toHaveBeenCalled();
    });

    it('returns false when file does not exist', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await openFileByPath('nonexistent.md', 'left', mockState, mockOpenFileInPane);

      expect(result).toBe(false);
      expect(mockOpenFileInPane).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('returns false when directory in path does not exist', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await openFileByPath('fake/path/file.md', 'left', mockState, mockOpenFileInPane);

      expect(result).toBe(false);
      expect(mockOpenFileInPane).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
