import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createFile,
  createFolder,
  renameFile,
  renameFolder,
  deleteFile,
  deleteEntry,
  getContextMenuState,
  setContextMenuState,
  showContextMenu,
  hideContextMenu
} from '../js/file-operations.js';
import { createMockDirectoryHandle, createMockFileHandle } from './mocks/file-system.js';

describe('file-operations', () => {
  describe('createFile', () => {
    it('creates a new empty file', async () => {
      const parentDir = createMockDirectoryHandle('parent');

      const fileHandle = await createFile(parentDir, 'newfile.md');

      expect(fileHandle.kind).toBe('file');
      expect(fileHandle.name).toBe('newfile.md');
    });

    it('creates file with empty content', async () => {
      const parentDir = createMockDirectoryHandle('parent');

      const fileHandle = await createFile(parentDir, 'test.md');
      const file = await fileHandle.getFile();
      const content = await file.text();

      expect(content).toBe('');
    });
  });

  describe('createFolder', () => {
    it('creates a new folder', async () => {
      const parentDir = createMockDirectoryHandle('parent');

      const folderHandle = await createFolder(parentDir, 'newfolder');

      expect(folderHandle.kind).toBe('directory');
      expect(folderHandle.name).toBe('newfolder');
    });

    it('returns existing folder if it already exists', async () => {
      const existingFolder = createMockDirectoryHandle('existing');
      const parentDir = createMockDirectoryHandle('parent', {
        existing: existingFolder
      });

      const result = await createFolder(parentDir, 'existing');

      expect(result).toBe(existingFolder);
    });
  });

  describe('renameFile', () => {
    it('renames a file by copying content and deleting original', async () => {
      const oldFile = createMockFileHandle('old.md', 'file content');
      const parentDir = createMockDirectoryHandle('parent', {
        'old.md': oldFile
      });

      const newHandle = await renameFile(parentDir, 'old.md', 'new.md');

      expect(newHandle.name).toBe('new.md');
      const file = await newHandle.getFile();
      const content = await file.text();
      expect(content).toBe('file content');
    });

    it('removes the old file after renaming', async () => {
      const oldFile = createMockFileHandle('old.md', 'content');
      const parentDir = createMockDirectoryHandle('parent', {
        'old.md': oldFile
      });

      await renameFile(parentDir, 'old.md', 'new.md');

      // Old file should be removed
      expect(parentDir._files.has('old.md')).toBe(false);
      expect(parentDir._files.has('new.md')).toBe(true);
    });
  });

  describe('renameFolder', () => {
    it('renames a folder with its contents', async () => {
      const fileInFolder = createMockFileHandle('doc.md', 'document content');
      const oldFolder = createMockDirectoryHandle('oldFolder', {
        'doc.md': fileInFolder
      });
      const parentDir = createMockDirectoryHandle('parent', {
        oldFolder: oldFolder
      });

      const newDir = await renameFolder(parentDir, 'oldFolder', 'newFolder');

      expect(newDir.name).toBe('newFolder');
      // Old folder should be removed
      expect(parentDir._directories.has('oldFolder')).toBe(false);
      expect(parentDir._directories.has('newFolder')).toBe(true);
    });
  });

  describe('deleteFile', () => {
    it('deletes a file from directory', async () => {
      const file = createMockFileHandle('todelete.md', 'content');
      const parentDir = createMockDirectoryHandle('parent', {
        'todelete.md': file
      });

      await deleteFile(parentDir, 'todelete.md');

      expect(parentDir._files.has('todelete.md')).toBe(false);
    });
  });

  describe('deleteEntry', () => {
    it('deletes a file when isDirectory is false', async () => {
      const file = createMockFileHandle('file.md', 'content');
      const parentDir = createMockDirectoryHandle('parent', {
        'file.md': file
      });

      await deleteEntry(parentDir, 'file.md', false);

      expect(parentDir._files.has('file.md')).toBe(false);
    });

    it('deletes a directory when isDirectory is true', async () => {
      const folder = createMockDirectoryHandle('folder');
      const parentDir = createMockDirectoryHandle('parent', {
        folder: folder
      });

      await deleteEntry(parentDir, 'folder', true);

      expect(parentDir._directories.has('folder')).toBe(false);
    });
  });

  describe('context menu state', () => {
    beforeEach(() => {
      // Reset state
      setContextMenuState({
        targetElement: null,
        targetHandle: null,
        parentDirHandle: null,
        isDirectory: false
      });
    });

    it('getContextMenuState returns current state', () => {
      const state = getContextMenuState();

      expect(state).toEqual({
        targetElement: null,
        targetHandle: null,
        parentDirHandle: null,
        isDirectory: false
      });
    });

    it('setContextMenuState updates state partially', () => {
      setContextMenuState({ isDirectory: true });

      const state = getContextMenuState();
      expect(state.isDirectory).toBe(true);
      expect(state.targetElement).toBe(null);
    });

    it('setContextMenuState merges with existing state', () => {
      const mockElement = { id: 'test' };
      setContextMenuState({ targetElement: mockElement });
      setContextMenuState({ isDirectory: true });

      const state = getContextMenuState();
      expect(state.targetElement).toEqual({ id: 'test' });
      expect(state.isDirectory).toBe(true);
    });
  });

  describe('showContextMenu', () => {
    it('positions menu at specified coordinates', () => {
      const menu = document.createElement('div');
      document.body.appendChild(menu);

      showContextMenu(menu, 100, 200);

      expect(menu.style.left).toBe('100px');
      expect(menu.style.top).toBe('200px');
      expect(menu.classList.contains('visible')).toBe(true);

      document.body.removeChild(menu);
    });
  });

  describe('hideContextMenu', () => {
    it('removes visible class from menu', () => {
      const menu = document.createElement('div');
      menu.classList.add('visible');
      document.body.appendChild(menu);

      hideContextMenu(menu);

      expect(menu.classList.contains('visible')).toBe(false);

      document.body.removeChild(menu);
    });

    it('resets context menu state', () => {
      setContextMenuState({
        targetElement: { id: 'test' },
        targetHandle: { name: 'file.md' },
        parentDirHandle: { name: 'parent' },
        isDirectory: true
      });

      const menu = document.createElement('div');
      hideContextMenu(menu);

      const state = getContextMenuState();
      expect(state.targetElement).toBe(null);
      expect(state.targetHandle).toBe(null);
      expect(state.isDirectory).toBe(false);
    });
  });
});
