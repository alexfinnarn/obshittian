/**
 * Tests for editor.svelte.ts store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  editor,
  openFileInPane,
  updatePaneContent,
  markPaneDirty,
  markPaneClean,
  closePaneFile,
  setFocusedPane,
  getFocusedPane,
  isPaneFileOpen,
  getPaneState,
  getPaneFilename,
  resetEditorState,
} from './editor.svelte';

// Mock file handles
function createMockFileHandle(name: string): FileSystemFileHandle {
  return {
    name,
    kind: 'file',
    isSameEntry: async () => false,
    getFile: async () => new File([], name),
    createWritable: async () => ({} as FileSystemWritableFileStream),
    queryPermission: async () => 'granted' as PermissionState,
    requestPermission: async () => 'granted' as PermissionState,
  } as FileSystemFileHandle;
}

function createMockDirHandle(name: string): FileSystemDirectoryHandle {
  return {
    name,
    kind: 'directory',
    isSameEntry: async () => false,
    getFileHandle: async () => createMockFileHandle('file.md'),
    getDirectoryHandle: async () => ({} as FileSystemDirectoryHandle),
    removeEntry: async () => {},
    resolve: async () => null,
    keys: () => ({} as AsyncIterableIterator<string>),
    values: () => ({} as AsyncIterableIterator<FileSystemHandle>),
    entries: () =>
      ({} as AsyncIterableIterator<[string, FileSystemHandle]>),
    [Symbol.asyncIterator]: () =>
      ({} as AsyncIterableIterator<[string, FileSystemHandle]>),
    queryPermission: async () => 'granted' as PermissionState,
    requestPermission: async () => 'granted' as PermissionState,
  } as FileSystemDirectoryHandle;
}

describe('editor store', () => {
  beforeEach(() => {
    resetEditorState();
  });

  describe('initial state', () => {
    it('should have empty left pane', () => {
      expect(editor.left.fileHandle).toBeNull();
      expect(editor.left.content).toBe('');
      expect(editor.left.isDirty).toBe(false);
    });

    it('should have empty right pane', () => {
      expect(editor.right.fileHandle).toBeNull();
      expect(editor.right.content).toBe('');
      expect(editor.right.isDirty).toBe(false);
    });

    it('should have no focused pane', () => {
      expect(editor.focusedPane).toBeNull();
    });
  });

  describe('openFileInPane', () => {
    it('should open file in left pane', () => {
      const fileHandle = createMockFileHandle('test.md');
      const dirHandle = createMockDirHandle('folder');

      openFileInPane('left', fileHandle, dirHandle, '# Content', 'folder/test.md');

      expect(editor.left.fileHandle?.name).toBe(fileHandle.name);
      expect(editor.left.dirHandle?.name).toBe(dirHandle.name);
      expect(editor.left.content).toBe('# Content');
      expect(editor.left.isDirty).toBe(false);
      expect(editor.left.relativePath).toBe('folder/test.md');
    });

    it('should open file in right pane', () => {
      const fileHandle = createMockFileHandle('daily.md');
      const dirHandle = createMockDirHandle('daily');

      openFileInPane('right', fileHandle, dirHandle, '# Daily', 'daily/daily.md');

      expect(editor.right.fileHandle?.name).toBe(fileHandle.name);
      expect(editor.right.content).toBe('# Daily');
    });

    it('should replace existing file in pane', () => {
      const fileHandle1 = createMockFileHandle('first.md');
      const fileHandle2 = createMockFileHandle('second.md');
      const dirHandle = createMockDirHandle('folder');

      openFileInPane('left', fileHandle1, dirHandle, 'First', 'first.md');
      openFileInPane('left', fileHandle2, dirHandle, 'Second', 'second.md');

      expect(editor.left.fileHandle?.name).toBe(fileHandle2.name);
      expect(editor.left.content).toBe('Second');
    });
  });

  describe('updatePaneContent', () => {
    it('should update content and mark as dirty', () => {
      const fileHandle = createMockFileHandle('test.md');
      const dirHandle = createMockDirHandle('folder');

      openFileInPane('left', fileHandle, dirHandle, 'Original', 'test.md');
      updatePaneContent('left', 'Modified');

      expect(editor.left.content).toBe('Modified');
      expect(editor.left.isDirty).toBe(true);
    });
  });

  describe('markPaneDirty', () => {
    it('should mark pane as dirty', () => {
      expect(editor.left.isDirty).toBe(false);

      markPaneDirty('left');

      expect(editor.left.isDirty).toBe(true);
    });
  });

  describe('markPaneClean', () => {
    it('should mark pane as clean', () => {
      markPaneDirty('left');
      expect(editor.left.isDirty).toBe(true);

      markPaneClean('left');

      expect(editor.left.isDirty).toBe(false);
    });

    it('should update content when provided', () => {
      const fileHandle = createMockFileHandle('test.md');
      const dirHandle = createMockDirHandle('folder');

      openFileInPane('left', fileHandle, dirHandle, 'Original', 'test.md');
      markPaneDirty('left');
      markPaneClean('left', 'Updated');

      expect(editor.left.content).toBe('Updated');
      expect(editor.left.isDirty).toBe(false);
    });
  });

  describe('closePaneFile', () => {
    it('should reset pane state', () => {
      const fileHandle = createMockFileHandle('test.md');
      const dirHandle = createMockDirHandle('folder');

      openFileInPane('left', fileHandle, dirHandle, 'Content', 'test.md');
      closePaneFile('left');

      expect(editor.left.fileHandle).toBeNull();
      expect(editor.left.content).toBe('');
      expect(editor.left.isDirty).toBe(false);
    });
  });

  describe('focus tracking', () => {
    it('should set focused pane', () => {
      setFocusedPane('left');
      expect(getFocusedPane()).toBe('left');

      setFocusedPane('right');
      expect(getFocusedPane()).toBe('right');
    });

    it('should clear focused pane', () => {
      setFocusedPane('left');
      setFocusedPane(null);
      expect(getFocusedPane()).toBeNull();
    });
  });

  describe('isPaneFileOpen', () => {
    it('should return false for empty pane', () => {
      expect(isPaneFileOpen('left')).toBe(false);
    });

    it('should return true when file is open', () => {
      const fileHandle = createMockFileHandle('test.md');
      const dirHandle = createMockDirHandle('folder');

      openFileInPane('left', fileHandle, dirHandle, 'Content', 'test.md');

      expect(isPaneFileOpen('left')).toBe(true);
    });
  });

  describe('getPaneFilename', () => {
    it('should return empty string for empty pane', () => {
      expect(getPaneFilename('left')).toBe('');
    });

    it('should return filename when file is open', () => {
      const fileHandle = createMockFileHandle('my-file.md');
      const dirHandle = createMockDirHandle('folder');

      openFileInPane('left', fileHandle, dirHandle, 'Content', 'my-file.md');

      expect(getPaneFilename('left')).toBe('my-file.md');
    });
  });

  describe('getPaneState', () => {
    it('should return pane state', () => {
      const fileHandle = createMockFileHandle('test.md');
      const dirHandle = createMockDirHandle('folder');

      openFileInPane('left', fileHandle, dirHandle, 'Content', 'test.md');

      const state = getPaneState('left');
      expect(state.fileHandle?.name).toBe(fileHandle.name);
      expect(state.content).toBe('Content');
    });
  });
});
