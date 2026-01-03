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

describe('editor store', () => {
  beforeEach(() => {
    resetEditorState();
  });

  describe('initial state', () => {
    it('should have empty left pane', () => {
      expect(editor.left.filePath).toBeNull();
      expect(editor.left.content).toBe('');
      expect(editor.left.isDirty).toBe(false);
    });

    it('should have empty right pane', () => {
      expect(editor.right.filePath).toBeNull();
      expect(editor.right.content).toBe('');
      expect(editor.right.isDirty).toBe(false);
    });

    it('should have no focused pane', () => {
      expect(editor.focusedPane).toBeNull();
    });
  });

  describe('openFileInPane', () => {
    it('should open file in left pane', () => {
      openFileInPane('left', 'folder/test.md', '# Content');

      expect(editor.left.filePath).toBe('folder/test.md');
      expect(editor.left.content).toBe('# Content');
      expect(editor.left.isDirty).toBe(false);
    });

    it('should open file in right pane', () => {
      openFileInPane('right', 'daily/daily.md', '# Daily');

      expect(editor.right.filePath).toBe('daily/daily.md');
      expect(editor.right.content).toBe('# Daily');
    });

    it('should replace existing file in pane', () => {
      openFileInPane('left', 'first.md', 'First');
      openFileInPane('left', 'second.md', 'Second');

      expect(editor.left.filePath).toBe('second.md');
      expect(editor.left.content).toBe('Second');
    });
  });

  describe('updatePaneContent', () => {
    it('should update content and mark as dirty', () => {
      openFileInPane('left', 'test.md', 'Original');
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
      openFileInPane('left', 'test.md', 'Original');
      markPaneDirty('left');
      markPaneClean('left', 'Updated');

      expect(editor.left.content).toBe('Updated');
      expect(editor.left.isDirty).toBe(false);
    });
  });

  describe('closePaneFile', () => {
    it('should reset pane state', () => {
      openFileInPane('left', 'test.md', 'Content');
      closePaneFile('left');

      expect(editor.left.filePath).toBeNull();
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
      openFileInPane('left', 'test.md', 'Content');

      expect(isPaneFileOpen('left')).toBe(true);
    });
  });

  describe('getPaneFilename', () => {
    it('should return empty string for empty pane', () => {
      expect(getPaneFilename('left')).toBe('');
    });

    it('should return filename when file is open', () => {
      openFileInPane('left', 'folder/my-file.md', 'Content');

      expect(getPaneFilename('left')).toBe('my-file.md');
    });
  });

  describe('getPaneState', () => {
    it('should return pane state', () => {
      openFileInPane('left', 'test.md', 'Content');

      const state = getPaneState('left');
      expect(state.filePath).toBe('test.md');
      expect(state.content).toBe('Content');
    });
  });
});
