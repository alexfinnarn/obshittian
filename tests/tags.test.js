import { describe, it, expect, beforeEach } from 'vitest';
import {
    extractFrontmatter,
    extractTags,
    updateFileInIndex,
    removeFileFromIndex,
    renameFileInIndex,
    getFilesForTag,
    getTagIndex
} from '../js/tags.js';

describe('tags', () => {
    describe('extractFrontmatter', () => {
        it('returns empty object for content without frontmatter', () => {
            const content = '# Hello World\n\nSome content here.';
            const result = extractFrontmatter(content);
            expect(result).toEqual({});
        });

        it('returns empty object for null/undefined content', () => {
            expect(extractFrontmatter(null)).toEqual({});
            expect(extractFrontmatter(undefined)).toEqual({});
            expect(extractFrontmatter('')).toEqual({});
        });

        it('returns empty object for unclosed frontmatter', () => {
            const content = '---\ntags: one, two\nNo closing delimiter';
            const result = extractFrontmatter(content);
            expect(result).toEqual({});
        });

        it('parses comma-separated tags', () => {
            const content = '---\ntags: one, two, three\n---\n\n# Content';
            const result = extractFrontmatter(content);
            expect(result.tags).toEqual(['one', 'two', 'three']);
        });

        it('parses YAML array syntax', () => {
            const content = '---\ntags: [project, important, todo]\n---\n\n# Content';
            const result = extractFrontmatter(content);
            expect(result.tags).toEqual(['project', 'important', 'todo']);
        });

        it('parses YAML list syntax', () => {
            const content = '---\ntags:\n  - one\n  - two\n  - three\n---\n\n# Content';
            const result = extractFrontmatter(content);
            expect(result.tags).toEqual(['one', 'two', 'three']);
        });

        it('handles single tag value', () => {
            const content = '---\ntags: single\n---\n\n# Content';
            const result = extractFrontmatter(content);
            expect(result.tags).toBe('single');
        });

        it('trims whitespace from tags', () => {
            const content = '---\ntags:  spaced ,  out  ,  tags  \n---\n\n# Content';
            const result = extractFrontmatter(content);
            expect(result.tags).toEqual(['spaced', 'out', 'tags']);
        });

        it('handles empty tags array', () => {
            const content = '---\ntags: []\n---\n\n# Content';
            const result = extractFrontmatter(content);
            expect(result.tags).toEqual([]);
        });

        it('parses multiple frontmatter fields', () => {
            const content = '---\ntitle: My Note\ntags: one, two\nstatus: draft\n---\n\n# Content';
            const result = extractFrontmatter(content);
            expect(result.title).toBe('My Note');
            expect(result.tags).toEqual(['one', 'two']);
            expect(result.status).toBe('draft');
        });
    });

    describe('extractTags', () => {
        it('extracts tags from frontmatter', () => {
            const content = '---\ntags: project, important\n---\n\n# Content';
            const result = extractTags(content);
            expect(result).toEqual(['project', 'important']);
        });

        it('returns empty array when no frontmatter', () => {
            const content = '# Just a heading\n\nSome content';
            const result = extractTags(content);
            expect(result).toEqual([]);
        });

        it('returns empty array when no tags field', () => {
            const content = '---\ntitle: My Note\n---\n\n# Content';
            const result = extractTags(content);
            expect(result).toEqual([]);
        });

        it('handles single tag as string', () => {
            const content = '---\ntags: single\n---\n\n# Content';
            const result = extractTags(content);
            expect(result).toEqual(['single']);
        });

        it('handles tags from YAML list', () => {
            const content = '---\ntags:\n  - first\n  - second\n---\n\n# Content';
            const result = extractTags(content);
            expect(result).toEqual(['first', 'second']);
        });
    });

    describe('tag index operations', () => {
        beforeEach(() => {
            // Reset the index by removing any files
            const index = getTagIndex();
            Object.keys(index.files).forEach(path => {
                removeFileFromIndex(path);
            });
        });

        describe('updateFileInIndex', () => {
            it('adds tags for a new file', () => {
                const content = '---\ntags: project, todo\n---\n\n# Task';
                updateFileInIndex('notes/task.md', content);

                const index = getTagIndex();
                expect(index.files['notes/task.md']).toEqual(['project', 'todo']);
                expect(index.tags['project']).toContain('notes/task.md');
                expect(index.tags['todo']).toContain('notes/task.md');
            });

            it('updates tags when file content changes', () => {
                // Initial content
                updateFileInIndex('notes/task.md', '---\ntags: old\n---\n');

                // Updated content
                updateFileInIndex('notes/task.md', '---\ntags: new, updated\n---\n');

                const index = getTagIndex();
                expect(index.files['notes/task.md']).toEqual(['new', 'updated']);
                expect(index.tags['old']).toBeUndefined();
                expect(index.tags['new']).toContain('notes/task.md');
            });

            it('removes file from index when tags are removed', () => {
                updateFileInIndex('notes/task.md', '---\ntags: project\n---\n');
                updateFileInIndex('notes/task.md', '# No tags now\n');

                const index = getTagIndex();
                expect(index.files['notes/task.md']).toBeUndefined();
                expect(index.tags['project']).toBeUndefined();
            });
        });

        describe('removeFileFromIndex', () => {
            it('removes file and its tags from index', () => {
                updateFileInIndex('notes/task.md', '---\ntags: project, important\n---\n');
                removeFileFromIndex('notes/task.md');

                const index = getTagIndex();
                expect(index.files['notes/task.md']).toBeUndefined();
                expect(index.tags['project']).toBeUndefined();
                expect(index.tags['important']).toBeUndefined();
            });

            it('does not affect other files with same tags', () => {
                updateFileInIndex('notes/task1.md', '---\ntags: project\n---\n');
                updateFileInIndex('notes/task2.md', '---\ntags: project\n---\n');

                removeFileFromIndex('notes/task1.md');

                const index = getTagIndex();
                expect(index.files['notes/task1.md']).toBeUndefined();
                expect(index.files['notes/task2.md']).toEqual(['project']);
                expect(index.tags['project']).toEqual(['notes/task2.md']);
            });

            it('handles non-existent file gracefully', () => {
                expect(() => {
                    removeFileFromIndex('nonexistent.md');
                }).not.toThrow();
            });
        });

        describe('renameFileInIndex', () => {
            it('updates file path in index', () => {
                updateFileInIndex('old/path.md', '---\ntags: project\n---\n');
                renameFileInIndex('old/path.md', 'new/path.md');

                const index = getTagIndex();
                expect(index.files['old/path.md']).toBeUndefined();
                expect(index.files['new/path.md']).toEqual(['project']);
                expect(index.tags['project']).toContain('new/path.md');
                expect(index.tags['project']).not.toContain('old/path.md');
            });

            it('handles non-existent file gracefully', () => {
                expect(() => {
                    renameFileInIndex('nonexistent.md', 'new.md');
                }).not.toThrow();
            });
        });

        describe('getFilesForTag', () => {
            it('returns files containing a specific tag', () => {
                updateFileInIndex('notes/task1.md', '---\ntags: project\n---\n');
                updateFileInIndex('notes/task2.md', '---\ntags: project, important\n---\n');
                updateFileInIndex('notes/other.md', '---\ntags: other\n---\n');

                const files = getFilesForTag('project');
                expect(files).toHaveLength(2);
                expect(files).toContain('notes/task1.md');
                expect(files).toContain('notes/task2.md');
            });

            it('returns empty array for non-existent tag', () => {
                const files = getFilesForTag('nonexistent');
                expect(files).toEqual([]);
            });
        });

        describe('allTags array', () => {
            it('updates allTags with correct counts', () => {
                updateFileInIndex('notes/task1.md', '---\ntags: project\n---\n');
                updateFileInIndex('notes/task2.md', '---\ntags: project, important\n---\n');

                const index = getTagIndex();
                const projectTag = index.allTags.find(t => t.tag === 'project');
                const importantTag = index.allTags.find(t => t.tag === 'important');

                expect(projectTag.count).toBe(2);
                expect(importantTag.count).toBe(1);
            });
        });
    });
});
