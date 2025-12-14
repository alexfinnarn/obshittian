import { describe, it, expect } from 'vitest';
import {
    extractFrontmatterRaw,
    parseFrontmatter,
    splitFrontmatter
} from '../js/frontmatter.js';

describe('frontmatter', () => {
    describe('extractFrontmatterRaw', () => {
        it('returns null for content without frontmatter', () => {
            const content = '# Hello World\n\nSome content here.';
            expect(extractFrontmatterRaw(content)).toBeNull();
        });

        it('returns null for null/undefined content', () => {
            expect(extractFrontmatterRaw(null)).toBeNull();
            expect(extractFrontmatterRaw(undefined)).toBeNull();
            expect(extractFrontmatterRaw('')).toBeNull();
        });

        it('returns null for unclosed frontmatter', () => {
            const content = '---\ntags: one, two\nNo closing delimiter';
            expect(extractFrontmatterRaw(content)).toBeNull();
        });

        it('extracts raw frontmatter text', () => {
            const content = '---\ntags: one, two\ntitle: Test\n---\n\n# Content';
            const result = extractFrontmatterRaw(content);
            expect(result.raw).toBe('tags: one, two\ntitle: Test');
            expect(result.endIndex).toBe(content.indexOf('---', 3) + 3);
        });
    });

    describe('parseFrontmatter', () => {
        it('returns empty object for content without frontmatter', () => {
            const content = '# Hello World\n\nSome content here.';
            const result = parseFrontmatter(content);
            expect(result).toEqual({});
        });

        it('returns empty object for null/undefined content', () => {
            expect(parseFrontmatter(null)).toEqual({});
            expect(parseFrontmatter(undefined)).toEqual({});
            expect(parseFrontmatter('')).toEqual({});
        });

        it('returns empty object for unclosed frontmatter', () => {
            const content = '---\ntags: one, two\nNo closing delimiter';
            const result = parseFrontmatter(content);
            expect(result).toEqual({});
        });

        it('parses comma-separated tags', () => {
            const content = '---\ntags: one, two, three\n---\n\n# Content';
            const result = parseFrontmatter(content);
            expect(result.tags).toEqual(['one', 'two', 'three']);
        });

        it('parses YAML array syntax', () => {
            const content = '---\ntags: [project, important, todo]\n---\n\n# Content';
            const result = parseFrontmatter(content);
            expect(result.tags).toEqual(['project', 'important', 'todo']);
        });

        it('parses YAML list syntax', () => {
            const content = '---\ntags:\n  - one\n  - two\n  - three\n---\n\n# Content';
            const result = parseFrontmatter(content);
            expect(result.tags).toEqual(['one', 'two', 'three']);
        });

        it('handles single tag value', () => {
            const content = '---\ntags: single\n---\n\n# Content';
            const result = parseFrontmatter(content);
            expect(result.tags).toBe('single');
        });

        it('trims whitespace from tags', () => {
            const content = '---\ntags:  spaced ,  out  ,  tags  \n---\n\n# Content';
            const result = parseFrontmatter(content);
            expect(result.tags).toEqual(['spaced', 'out', 'tags']);
        });

        it('handles empty tags array', () => {
            const content = '---\ntags: []\n---\n\n# Content';
            const result = parseFrontmatter(content);
            expect(result.tags).toEqual([]);
        });

        it('parses multiple frontmatter fields', () => {
            const content = '---\ntitle: My Note\ntags: one, two\nstatus: draft\n---\n\n# Content';
            const result = parseFrontmatter(content);
            expect(result.title).toBe('My Note');
            expect(result.tags).toEqual(['one', 'two']);
            expect(result.status).toBe('draft');
        });
    });

    describe('splitFrontmatter', () => {
        it('returns null frontmatter for content without it', () => {
            const content = '# Hello World\n\nSome content here.';
            const result = splitFrontmatter(content);
            expect(result.frontmatter).toBeNull();
            expect(result.body).toBe(content);
        });

        it('handles null/undefined content', () => {
            expect(splitFrontmatter(null)).toEqual({ frontmatter: null, body: '' });
            expect(splitFrontmatter(undefined)).toEqual({ frontmatter: null, body: '' });
            expect(splitFrontmatter('')).toEqual({ frontmatter: null, body: '' });
        });

        it('returns null frontmatter for unclosed delimiter', () => {
            const content = '---\ntags: test\nNo closing';
            const result = splitFrontmatter(content);
            expect(result.frontmatter).toBeNull();
            expect(result.body).toBe(content);
        });

        it('splits frontmatter and body correctly', () => {
            const content = '---\ntags: test\ntitle: Hello\n---\n\n# My Content\n\nParagraph here.';
            const result = splitFrontmatter(content);
            expect(result.frontmatter).toBe('tags: test\ntitle: Hello');
            expect(result.body).toBe('# My Content\n\nParagraph here.');
        });

        it('trims leading whitespace from body', () => {
            const content = '---\ntags: test\n---\n\n\n# Content';
            const result = splitFrontmatter(content);
            expect(result.body).toBe('# Content');
        });
    });
});
