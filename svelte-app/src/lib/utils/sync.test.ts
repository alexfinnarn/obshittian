/**
 * Tests for sync.ts utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSyncMode,
  isDailyNote,
  parseDailyNotePath,
  isDailyNoteModified,
  getExportPath,
  SYNC_MODES,
} from './sync';

describe('sync utilities', () => {
  describe('getSyncMode', () => {
    it('returns permanent for sync: permanent', () => {
      const content = `---
sync: permanent
---
# Test`;
      expect(getSyncMode(content)).toBe('permanent');
    });

    it('returns temporary for sync: temporary', () => {
      const content = `---
sync: temporary
---
# Test`;
      expect(getSyncMode(content)).toBe('temporary');
    });

    it('returns delete for sync: delete', () => {
      const content = `---
sync: delete
---
# Test`;
      expect(getSyncMode(content)).toBe('delete');
    });

    it('returns null for no sync key', () => {
      const content = `---
title: Test
---
# Test`;
      expect(getSyncMode(content)).toBeNull();
    });

    it('returns null for invalid sync value', () => {
      const content = `---
sync: invalid
---
# Test`;
      expect(getSyncMode(content)).toBeNull();
    });

    it('returns null for no frontmatter', () => {
      const content = '# Just markdown';
      expect(getSyncMode(content)).toBeNull();
    });
  });

  describe('isDailyNote', () => {
    it('returns true for files in daily notes folder', () => {
      expect(isDailyNote('zzz_Daily Notes/2024/12/2024-12-14.md', 'zzz_Daily Notes')).toBe(true);
    });

    it('returns true for nested daily note', () => {
      expect(isDailyNote('zzz_Daily Notes/2024/01/2024-01-01.md', 'zzz_Daily Notes')).toBe(true);
    });

    it('returns false for files outside daily notes folder', () => {
      expect(isDailyNote('notes/todo.md', 'zzz_Daily Notes')).toBe(false);
    });

    it('returns false for files with similar name but different folder', () => {
      expect(isDailyNote('zzz_Daily NotesBackup/2024/12/2024-12-14.md', 'zzz_Daily Notes')).toBe(false);
    });

    it('returns false for root level files', () => {
      expect(isDailyNote('readme.md', 'zzz_Daily Notes')).toBe(false);
    });
  });

  describe('parseDailyNotePath', () => {
    it('extracts date from valid daily note path', () => {
      const date = parseDailyNotePath('zzz_Daily Notes/2024/12/2024-12-14.md');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
      expect(date!.getMonth()).toBe(11); // 0-indexed
      expect(date!.getDate()).toBe(14);
    });

    it('extracts date regardless of folder structure', () => {
      const date = parseDailyNotePath('any/path/2023-06-15.md');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2023);
      expect(date!.getMonth()).toBe(5);
      expect(date!.getDate()).toBe(15);
    });

    it('returns null for non-daily note path', () => {
      expect(parseDailyNotePath('notes/todo.md')).toBeNull();
    });

    it('returns null for invalid date format', () => {
      expect(parseDailyNotePath('notes/12-14-2024.md')).toBeNull();
    });

    it('returns null for path without .md extension', () => {
      expect(parseDailyNotePath('notes/2024-12-14.txt')).toBeNull();
    });
  });

  describe('isDailyNoteModified', () => {
    const testDate = new Date(2024, 11, 14); // December 14, 2024 (Saturday)

    it('returns false for unmodified template', () => {
      // Template format: # YYYY-MM-DD, ## DayName, - [ ], ## Notes
      const content = `---
sync: delete
---

# 2024-12-14

## Saturday

- [ ]

## Notes

`;
      expect(isDailyNoteModified(content, testDate)).toBe(false);
    });

    it('returns true when tasks are added', () => {
      const content = `---
sync: delete
---

# 2024-12-14

## Saturday

- [ ] Buy groceries
- [ ] Call mom

## Notes

`;
      expect(isDailyNoteModified(content, testDate)).toBe(true);
    });

    it('returns true when notes are added', () => {
      const content = `---
sync: delete
---

# 2024-12-14

## Saturday

- [ ]

## Notes
Today was a good day.
`;
      expect(isDailyNoteModified(content, testDate)).toBe(true);
    });

    it('returns true when content structure is changed', () => {
      const content = `---
sync: delete
---

# 2024-12-14

## Custom Section
Some custom content.
`;
      expect(isDailyNoteModified(content, testDate)).toBe(true);
    });

    it('ignores whitespace differences', () => {
      const content = `---
sync: delete
---

# 2024-12-14

## Saturday

- [ ]

## Notes

`;
      expect(isDailyNoteModified(content, testDate)).toBe(false);
    });
  });

  describe('getExportPath', () => {
    it('prepends sync directory to path', () => {
      expect(getExportPath('notes/todo.md', 'zzzz_exports')).toBe('zzzz_exports/notes/todo.md');
    });

    it('handles daily notes path', () => {
      expect(getExportPath('zzz_Daily Notes/2024/12/2024-12-14.md', 'zzzz_exports')).toBe(
        'zzzz_exports/zzz_Daily Notes/2024/12/2024-12-14.md'
      );
    });

    it('handles root level files', () => {
      expect(getExportPath('readme.md', 'exports')).toBe('exports/readme.md');
    });

    it('handles custom sync directory', () => {
      expect(getExportPath('notes/file.md', 'my_sync')).toBe('my_sync/notes/file.md');
    });
  });

  describe('SYNC_MODES', () => {
    it('has correct mode values', () => {
      expect(SYNC_MODES.PERMANENT).toBe('permanent');
      expect(SYNC_MODES.TEMPORARY).toBe('temporary');
      expect(SYNC_MODES.DELETE).toBe('delete');
    });
  });
});
