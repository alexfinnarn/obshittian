import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  saveLastOpenFile,
  getLastOpenFile,
  savePaneWidth,
  getPaneWidth,
  saveQuickLinks,
  getQuickLinks
} from '../js/persistence.js';

describe('persistence', () => {
  describe('localStorage helpers', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    describe('saveLastOpenFile / getLastOpenFile', () => {
      it('saves and retrieves last open file path', () => {
        saveLastOpenFile('folder/subfolder/file.md');

        const result = getLastOpenFile();

        expect(result).toBe('folder/subfolder/file.md');
      });

      it('returns null when no file has been saved', () => {
        const result = getLastOpenFile();

        expect(result).toBe(null);
      });

      it('overwrites previous value', () => {
        saveLastOpenFile('first.md');
        saveLastOpenFile('second.md');

        const result = getLastOpenFile();

        expect(result).toBe('second.md');
      });

      it('handles paths with special characters', () => {
        const path = 'folder/file with spaces & symbols (1).md';
        saveLastOpenFile(path);

        expect(getLastOpenFile()).toBe(path);
      });
    });

    describe('savePaneWidth / getPaneWidth', () => {
      it('saves and retrieves pane width', () => {
        savePaneWidth('500');

        const result = getPaneWidth();

        expect(result).toBe('500');
      });

      it('returns null when no width has been saved', () => {
        const result = getPaneWidth();

        expect(result).toBe(null);
      });

      it('stores value as string', () => {
        savePaneWidth(400);

        const result = getPaneWidth();

        // localStorage always returns strings
        expect(result).toBe('400');
      });
    });

    describe('saveQuickLinks / getQuickLinks', () => {
      it('saves and retrieves quick links array', () => {
        const links = [
          { path: 'notes/todo.md', name: 'Todo' },
          { path: 'projects/readme.md', name: 'Readme' }
        ];

        saveQuickLinks(links);

        const result = getQuickLinks();

        expect(result).toEqual(links);
      });

      it('returns null when no links have been saved', () => {
        const result = getQuickLinks();

        expect(result).toBe(null);
      });

      it('handles empty array', () => {
        saveQuickLinks([]);

        const result = getQuickLinks();

        expect(result).toEqual([]);
      });

      it('preserves complex link objects', () => {
        const links = [
          {
            path: 'folder/file.md',
            name: 'My File',
            metadata: { created: '2024-01-01', tags: ['important', 'work'] }
          }
        ];

        saveQuickLinks(links);

        const result = getQuickLinks();

        expect(result).toEqual(links);
        expect(result[0].metadata.tags).toEqual(['important', 'work']);
      });
    });
  });

  // Note: IndexedDB tests are more complex and would require mocking
  // the entire IndexedDB API. For now, we focus on localStorage helpers
  // which cover the most commonly used persistence functions.
});
