import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveLastOpenFile,
  getLastOpenFile,
  savePaneWidth,
  getPaneWidth,
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
});
