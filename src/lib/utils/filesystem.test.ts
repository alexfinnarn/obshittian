import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveLastOpenFile,
  getLastOpenFile,
  savePaneWidth,
  getPaneWidth,
  saveCollapsedPane,
  getCollapsedPane,
  clearCollapsedPane,
} from './filesystem';

describe('filesystem utilities', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('saveLastOpenFile / getLastOpenFile', () => {
    it('saves and retrieves last open file path', () => {
      saveLastOpenFile('folder/test.md');
      expect(getLastOpenFile()).toBe('folder/test.md');
    });

    it('returns null when no file saved', () => {
      expect(getLastOpenFile()).toBeNull();
    });

    it('overwrites previous value', () => {
      saveLastOpenFile('first.md');
      saveLastOpenFile('second.md');
      expect(getLastOpenFile()).toBe('second.md');
    });
  });

  describe('savePaneWidth / getPaneWidth', () => {
    it('saves and retrieves pane width', () => {
      savePaneWidth(400);
      expect(getPaneWidth()).toBe(400);
    });

    it('returns null when no width saved', () => {
      expect(getPaneWidth()).toBeNull();
    });

    it('handles decimal values', () => {
      savePaneWidth(350.5);
      expect(getPaneWidth()).toBe(350.5);
    });
  });

  describe('saveCollapsedPane / getCollapsedPane / clearCollapsedPane', () => {
    it('saves and retrieves collapsed pane', () => {
      saveCollapsedPane('left');
      expect(getCollapsedPane()).toBe('left');
    });

    it('returns null when no collapsed pane is saved', () => {
      expect(getCollapsedPane()).toBeNull();
    });

    it('clears the saved collapsed pane', () => {
      saveCollapsedPane('right');
      clearCollapsedPane();
      expect(getCollapsedPane()).toBeNull();
    });

    it('ignores invalid stored values', () => {
      localStorage.setItem('editorCollapsedPane', JSON.stringify('invalid'));
      expect(getCollapsedPane()).toBeNull();
    });
  });
});
