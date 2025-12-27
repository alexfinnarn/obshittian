import { describe, it, expect } from 'vitest';
import {
  extractFrontmatterRaw,
  parseFrontmatter,
  splitFrontmatter,
  getFrontmatterValue,
  updateFrontmatterKey,
} from './frontmatter';

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
      expect(result?.raw).toBe('tags: one, two\ntitle: Test');
      expect(result?.endIndex).toBe(content.indexOf('---', 3) + 3);
      expect(result?.bomOffset).toBe(0);
    });

    it('handles BOM at start of file', () => {
      const content = '\uFEFF---\ntags: test\n---\n\n# Content';
      const result = extractFrontmatterRaw(content);
      expect(result?.raw).toBe('tags: test');
      expect(result?.bomOffset).toBe(1);
      expect(result?.endIndex).toBe(19);
      expect(content.substring(result!.endIndex)).toBe('\n\n# Content');
    });

    it('returns null for BOM without frontmatter', () => {
      const content = '\uFEFF# Just content';
      expect(extractFrontmatterRaw(content)).toBeNull();
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

  describe('getFrontmatterValue', () => {
    it('returns value for existing key', () => {
      const content = '---\nsync: permanent\ntags: one, two\n---\n\n# Content';
      expect(getFrontmatterValue(content, 'sync')).toBe('permanent');
    });

    it('returns array for array value', () => {
      const content = '---\ntags: one, two, three\n---\n\n# Content';
      expect(getFrontmatterValue(content, 'tags')).toEqual(['one', 'two', 'three']);
    });

    it('returns null for non-existent key', () => {
      const content = '---\ntags: test\n---\n\n# Content';
      expect(getFrontmatterValue(content, 'sync')).toBeNull();
    });

    it('returns null for content without frontmatter', () => {
      const content = '# Just content';
      expect(getFrontmatterValue(content, 'sync')).toBeNull();
    });
  });

  describe('updateFrontmatterKey', () => {
    it('updates existing key', () => {
      const content = '---\nsync: delete\n---\n\n# Content';
      const result = updateFrontmatterKey(content, 'sync', 'temporary');
      expect(result).toContain('sync: temporary');
      expect(result).not.toContain('sync: delete');
    });

    it('adds new key to existing frontmatter', () => {
      const content = '---\ntags: test\n---\n\n# Content';
      const result = updateFrontmatterKey(content, 'sync', 'permanent');
      expect(result).toContain('tags: test');
      expect(result).toContain('sync: permanent');
    });

    it('creates frontmatter when none exists', () => {
      const content = '# Just content';
      const result = updateFrontmatterKey(content, 'sync', 'temporary');
      expect(result).toBe('---\nsync: temporary\n---\n\n# Just content');
    });

    it('preserves body content', () => {
      const content = '---\nsync: delete\n---\n\n# Title\n\nSome paragraph.';
      const result = updateFrontmatterKey(content, 'sync', 'temporary');
      expect(result).toContain('# Title');
      expect(result).toContain('Some paragraph.');
    });

    it('handles multiple keys', () => {
      const content = '---\ntitle: Test\nsync: delete\ntags: one\n---\n\n# Content';
      const result = updateFrontmatterKey(content, 'sync', 'permanent');
      expect(result).toContain('title: Test');
      expect(result).toContain('sync: permanent');
      expect(result).toContain('tags: one');
    });

    it('handles BOM when creating frontmatter', () => {
      const content = '\uFEFF# Just content';
      const result = updateFrontmatterKey(content, 'sync', 'temporary');
      expect(result.charCodeAt(0)).toBe(0xfeff);
      expect(result).toBe('\uFEFF---\nsync: temporary\n---\n\n# Just content');
    });

    it('handles BOM when updating existing frontmatter', () => {
      const content = '\uFEFF---\nsync: delete\n---\n\n# Content';
      const result = updateFrontmatterKey(content, 'sync', 'temporary');
      expect(result.charCodeAt(0)).toBe(0xfeff);
      expect(result).toContain('sync: temporary');
      expect(result).not.toContain('sync: delete');
    });

    it('does not add BOM when none exists', () => {
      const content = '---\nsync: delete\n---\n\n# Content';
      const result = updateFrontmatterKey(content, 'sync', 'temporary');
      expect(result.charCodeAt(0)).toBe('-'.charCodeAt(0));
    });

    it('prevents duplicate frontmatter when called on content with BOM-prefixed frontmatter', () => {
      const contentWithBom = '\uFEFF---\nsync: delete\n---\n\n# Content';
      const result = updateFrontmatterKey(contentWithBom, 'sync', 'temporary');
      const frontmatterCount = (result.match(/---/g) || []).length;
      expect(frontmatterCount).toBe(2);
    });
  });
});
