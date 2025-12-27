import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getSyncMode,
    isDailyNote,
    parseDailyNotePath,
    isDailyNoteModified,
    getExportPath,
    SYNC_MODES
} from '../js/sync.js';

describe('sync', () => {
    describe('getSyncMode', () => {
        it('returns permanent mode', () => {
            const content = '---\nsync: permanent\n---\n\n# Content';
            expect(getSyncMode(content)).toBe('permanent');
        });

        it('returns temporary mode', () => {
            const content = '---\nsync: temporary\n---\n\n# Content';
            expect(getSyncMode(content)).toBe('temporary');
        });

        it('returns delete mode', () => {
            const content = '---\nsync: delete\n---\n\n# Content';
            expect(getSyncMode(content)).toBe('delete');
        });

        it('returns null for unknown mode', () => {
            const content = '---\nsync: unknown\n---\n\n# Content';
            expect(getSyncMode(content)).toBe(null);
        });

        it('returns null when no sync key', () => {
            const content = '---\ntags: test\n---\n\n# Content';
            expect(getSyncMode(content)).toBe(null);
        });

        it('returns null when no frontmatter', () => {
            const content = '# Just content';
            expect(getSyncMode(content)).toBe(null);
        });
    });

    describe('isDailyNote', () => {
        it('returns true for daily note path', () => {
            expect(isDailyNote('zzz_Daily Notes/2024/12/2024-12-14.md', 'zzz_Daily Notes')).toBe(true);
        });

        it('returns false for regular file', () => {
            expect(isDailyNote('projects/todo.md', 'zzz_Daily Notes')).toBe(false);
        });

        it('returns false for partial match without trailing slash', () => {
            expect(isDailyNote('zzz_Daily NotesExtra/file.md', 'zzz_Daily Notes')).toBe(false);
        });

        it('handles custom daily notes folder', () => {
            expect(isDailyNote('Daily/2024/12/2024-12-14.md', 'Daily')).toBe(true);
        });
    });

    describe('parseDailyNotePath', () => {
        it('extracts date from valid path', () => {
            const date = parseDailyNotePath('zzz_Daily Notes/2024/12/2024-12-14.md');
            expect(date.getFullYear()).toBe(2024);
            expect(date.getMonth()).toBe(11); // December (0-indexed)
            expect(date.getDate()).toBe(14);
        });

        it('returns null for invalid path', () => {
            expect(parseDailyNotePath('notes/file.md')).toBe(null);
        });

        it('returns null for path without date format', () => {
            expect(parseDailyNotePath('zzz_Daily Notes/2024/12/notes.md')).toBe(null);
        });

        it('handles different years', () => {
            const date = parseDailyNotePath('zzz_Daily Notes/2025/01/2025-01-05.md');
            expect(date.getFullYear()).toBe(2025);
            expect(date.getMonth()).toBe(0); // January
            expect(date.getDate()).toBe(5);
        });
    });

    describe('isDailyNoteModified', () => {
        it('returns false for unmodified template', () => {
            const date = new Date(2024, 11, 14); // December 14, 2024 (Saturday)
            const template = `---
sync: delete
---

# 2024-12-14

## Saturday

- [ ]

## Notes

`;
            expect(isDailyNoteModified(template, date)).toBe(false);
        });

        it('returns true when content added to todo', () => {
            const date = new Date(2024, 11, 14);
            const content = `---
sync: delete
---

# 2024-12-14

## Saturday

- [ ] Added a task

## Notes

`;
            expect(isDailyNoteModified(content, date)).toBe(true);
        });

        it('returns true when checkbox checked', () => {
            const date = new Date(2024, 11, 14);
            const content = `---
sync: delete
---

# 2024-12-14

## Saturday

- [x]

## Notes

`;
            expect(isDailyNoteModified(content, date)).toBe(true);
        });

        it('returns true when notes added', () => {
            const date = new Date(2024, 11, 14);
            const content = `---
sync: delete
---

# 2024-12-14

## Saturday

- [ ]

## Notes

Some notes here.
`;
            expect(isDailyNoteModified(content, date)).toBe(true);
        });

        it('returns false with extra whitespace only', () => {
            const date = new Date(2024, 11, 14);
            const content = `---
sync: delete
---

# 2024-12-14

## Saturday

- [ ]

## Notes


`;
            expect(isDailyNoteModified(content, date)).toBe(false);
        });
    });

    describe('getExportPath', () => {
        it('converts md path to docx export path', () => {
            expect(getExportPath('zzz_Daily Notes/2024/12/2024-12-14.md', 'zzzz_exports'))
                .toBe('zzzz_exports/zzz_Daily Notes/2024/12/2024-12-14.docx');
        });

        it('handles simple file paths', () => {
            expect(getExportPath('projects/todo.md', 'zzzz_exports'))
                .toBe('zzzz_exports/projects/todo.docx');
        });

        it('handles root level files', () => {
            expect(getExportPath('readme.md', 'zzzz_exports'))
                .toBe('zzzz_exports/readme.docx');
        });

        it('uses custom sync directory', () => {
            expect(getExportPath('notes/file.md', 'exports'))
                .toBe('exports/notes/file.docx');
        });
    });

    describe('SYNC_MODES', () => {
        it('has all expected modes', () => {
            expect(SYNC_MODES.PERMANENT).toBe('permanent');
            expect(SYNC_MODES.TEMPORARY).toBe('temporary');
            expect(SYNC_MODES.DELETE).toBe('delete');
        });
    });

    describe('Daily note sync upgrade flow', () => {
        // Test for legacy daily notes without frontmatter
        it('returns null sync mode for content without frontmatter', () => {
            const contentNoFrontmatter = `# 2024-12-14

## Saturday

- [ ] Added a task

## Notes
`;
            const syncMode = getSyncMode(contentNoFrontmatter);
            expect(syncMode).toBe(null);
            // This means the upgrade condition (syncMode === DELETE) would be FALSE
        });

        it('returns null sync mode for content with frontmatter but no sync key', () => {
            const contentNoSyncKey = `---
tags: daily
---

# 2024-12-14

## Saturday

- [ ] Added a task

## Notes
`;
            const syncMode = getSyncMode(contentNoSyncKey);
            expect(syncMode).toBe(null);
        });

        it('detects modification for daily note without frontmatter', () => {
            // Content without frontmatter that has been modified
            const contentNoFrontmatter = `# 2024-12-14

## Saturday

- [ ] Added a task

## Notes
`;
            const date = new Date(2024, 11, 14); // December 14, 2024
            // isDailyNoteModified compares bodies, but the template includes frontmatter
            // The template body is different from content without frontmatter
            const isModified = isDailyNoteModified(contentNoFrontmatter, date);
            // This should be TRUE because the content doesn't match the template
            expect(isModified).toBe(true);
        });

        it('simulates upgrade path for legacy daily note without sync key (savePane logic)', () => {
            const relativePath = 'zzz_Daily Notes/2024/12/2024-12-14.md';
            const dailyNotesFolder = 'zzz_Daily Notes';

            // Legacy daily note: has frontmatter but no sync key, with modifications
            const legacyContent = `---
tags: daily
---

# 2024-12-14

## Saturday

- [ ] Added a task

## Notes
`;
            // Simulate the conditions checked in savePane
            const isDaily = isDailyNote(relativePath, dailyNotesFolder);
            expect(isDaily).toBe(true);

            const syncMode = getSyncMode(legacyContent);
            expect(syncMode).toBe(null);

            const date = parseDailyNotePath(relativePath);
            expect(date).not.toBeNull();

            // The NEW condition: syncMode === DELETE || syncMode === null
            const shouldUpgrade = (syncMode === SYNC_MODES.DELETE || syncMode === null);
            expect(shouldUpgrade).toBe(true);

            const isModified = isDailyNoteModified(legacyContent, date);
            expect(isModified).toBe(true);

            // All conditions are met, so the upgrade should happen
        });

        it('simulates upgrade path for legacy daily note without any frontmatter (savePane logic)', () => {
            const relativePath = 'zzz_Daily Notes/2024/12/2024-12-14.md';
            const dailyNotesFolder = 'zzz_Daily Notes';

            // Very old daily note: no frontmatter at all
            const veryOldContent = `# 2024-12-14

## Saturday

- [ ] Added a task

## Notes
`;
            const isDaily = isDailyNote(relativePath, dailyNotesFolder);
            expect(isDaily).toBe(true);

            const syncMode = getSyncMode(veryOldContent);
            expect(syncMode).toBe(null);

            const date = parseDailyNotePath(relativePath);
            expect(date).not.toBeNull();

            // The NEW condition: syncMode === DELETE || syncMode === null
            const shouldUpgrade = (syncMode === SYNC_MODES.DELETE || syncMode === null);
            expect(shouldUpgrade).toBe(true);

            const isModified = isDailyNoteModified(veryOldContent, date);
            expect(isModified).toBe(true);

            // All conditions are met, so the upgrade should happen
        });

        // This test simulates the complete upgrade scenario from savePane
        it('should detect modified daily note and identify need for upgrade', () => {
            const relativePath = 'zzz_Daily Notes/2024/12/2024-12-14.md';
            const dailyNotesFolder = 'zzz_Daily Notes';

            // Content with sync: delete and user modifications
            const modifiedContent = `---
sync: delete
---

# 2024-12-14

## Saturday

- [ ] Added a task

## Notes

`;
            // Check all conditions that savePane evaluates
            const isDaily = isDailyNote(relativePath, dailyNotesFolder);
            expect(isDaily).toBe(true);

            const syncMode = getSyncMode(modifiedContent);
            expect(syncMode).toBe('delete');

            const date = parseDailyNotePath(relativePath);
            expect(date).not.toBeNull();
            expect(date.getFullYear()).toBe(2024);
            expect(date.getMonth()).toBe(11);
            expect(date.getDate()).toBe(14);

            const isModified = isDailyNoteModified(modifiedContent, date);
            expect(isModified).toBe(true);
        });

        it('should NOT detect unmodified daily note as needing upgrade', () => {
            const relativePath = 'zzz_Daily Notes/2024/12/2024-12-14.md';
            const dailyNotesFolder = 'zzz_Daily Notes';

            // Content exactly matching template (Saturday = Dec 14, 2024)
            const unmodifiedContent = `---
sync: delete
---

# 2024-12-14

## Saturday

- [ ]

## Notes

`;
            const isDaily = isDailyNote(relativePath, dailyNotesFolder);
            expect(isDaily).toBe(true);

            const syncMode = getSyncMode(unmodifiedContent);
            expect(syncMode).toBe('delete');

            const date = parseDailyNotePath(relativePath);
            expect(date).not.toBeNull();

            const isModified = isDailyNoteModified(unmodifiedContent, date);
            expect(isModified).toBe(false);
        });

        it('should NOT upgrade non-daily notes', () => {
            const relativePath = 'projects/my-notes.md';
            const dailyNotesFolder = 'zzz_Daily Notes';

            const content = `---
sync: delete
---

# Some project notes
`;
            const isDaily = isDailyNote(relativePath, dailyNotesFolder);
            expect(isDaily).toBe(false);
            // No upgrade should happen for non-daily notes
        });

        it('should NOT upgrade daily notes already set to temporary or permanent', () => {
            const relativePath = 'zzz_Daily Notes/2024/12/2024-12-14.md';

            const temporaryContent = `---
sync: temporary
---

# 2024-12-14

## Saturday

- [ ] Added task

## Notes

`;
            const syncMode = getSyncMode(temporaryContent);
            expect(syncMode).toBe('temporary');
            // Since syncMode !== DELETE, no upgrade should happen
        });
    });
});
