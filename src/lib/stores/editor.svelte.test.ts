/**
 * Tests for editor.svelte.ts store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  editor,
  setFocusedPane,
  getFocusedPane,
  resetEditorState,
} from './editor.svelte';

describe('editor store', () => {
  beforeEach(() => {
    resetEditorState();
  });

  describe('initial state', () => {
    it('should have no focused pane', () => {
      expect(editor.focusedPane).toBeNull();
    });
  });

  describe('focus tracking', () => {
    it('should set focused pane to left', () => {
      setFocusedPane('left');
      expect(getFocusedPane()).toBe('left');
    });

    it('should set focused pane to right', () => {
      setFocusedPane('right');
      expect(getFocusedPane()).toBe('right');
    });

    it('should clear focused pane', () => {
      setFocusedPane('left');
      setFocusedPane(null);
      expect(getFocusedPane()).toBeNull();
    });

    it('should switch between panes', () => {
      setFocusedPane('left');
      expect(getFocusedPane()).toBe('left');

      setFocusedPane('right');
      expect(getFocusedPane()).toBe('right');
    });
  });

  describe('resetEditorState', () => {
    it('should reset focused pane to null', () => {
      setFocusedPane('left');
      resetEditorState();
      expect(editor.focusedPane).toBeNull();
    });
  });
});
