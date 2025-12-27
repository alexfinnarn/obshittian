/**
 * Tests for markdown.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  configureMarked,
  renderMarkdown,
  renderFrontmatterHtml,
  resetMarkedConfig,
} from './markdown';

describe('markdown utilities', () => {
  beforeEach(() => {
    resetMarkedConfig();
  });

  describe('configureMarked', () => {
    it('should configure marked without error', () => {
      expect(() => configureMarked()).not.toThrow();
    });

    it('should be idempotent (safe to call multiple times)', () => {
      configureMarked();
      expect(() => configureMarked()).not.toThrow();
    });
  });

  describe('renderFrontmatterHtml', () => {
    it('should escape HTML entities', () => {
      const yaml = 'title: Test <script>alert("xss")</script>';
      const html = renderFrontmatterHtml(yaml);

      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&lt;/script&gt;');
      expect(html).not.toContain('<script>');
    });

    it('should wrap in pre/code tags', () => {
      const yaml = 'title: Test';
      const html = renderFrontmatterHtml(yaml);

      expect(html).toContain('<pre class="frontmatter-yaml">');
      expect(html).toContain('<code>');
      expect(html).toContain('</code>');
      expect(html).toContain('</pre>');
    });

    it('should escape ampersands', () => {
      const yaml = 'title: Foo & Bar';
      const html = renderFrontmatterHtml(yaml);

      expect(html).toContain('&amp;');
      expect(html).not.toContain(' & ');
    });
  });

  describe('renderMarkdown', () => {
    it('should render plain markdown without frontmatter', () => {
      const result = renderMarkdown('# Hello\n\nWorld');

      expect(result.frontmatterHtml).toBe('');
      expect(result.bodyHtml).toContain('<h1>Hello</h1>');
      expect(result.bodyHtml).toContain('<p>World</p>');
    });

    it('should render markdown with frontmatter', () => {
      const content = `---
title: Test
tags: one, two
---

# Content`;

      const result = renderMarkdown(content);

      expect(result.frontmatterHtml).toContain('title: Test');
      expect(result.frontmatterHtml).toContain('tags: one, two');
      expect(result.bodyHtml).toContain('<h1>Content</h1>');
    });

    it('should render links with target="_blank"', () => {
      const result = renderMarkdown('[Link](https://example.com)');

      expect(result.bodyHtml).toContain('target="_blank"');
      expect(result.bodyHtml).toContain('rel="noopener noreferrer"');
      expect(result.bodyHtml).toContain('href="https://example.com"');
    });

    it('should render links with title attribute', () => {
      const result = renderMarkdown('[Link](https://example.com "My Title")');

      expect(result.bodyHtml).toContain('title="My Title"');
    });

    it('should handle empty content', () => {
      const result = renderMarkdown('');

      expect(result.frontmatterHtml).toBe('');
      expect(result.bodyHtml).toBe('');
    });

    it('should render nested lists with details/summary', () => {
      const content = `- Parent item
  - Child item 1
  - Child item 2`;

      const result = renderMarkdown(content);

      expect(result.bodyHtml).toContain('<details>');
      expect(result.bodyHtml).toContain('<summary>');
      expect(result.bodyHtml).toContain('Parent item');
    });

    it('should render simple lists without details/summary', () => {
      const content = `- Item 1
- Item 2
- Item 3`;

      const result = renderMarkdown(content);

      expect(result.bodyHtml).toContain('<li>');
      expect(result.bodyHtml).not.toContain('<details>');
    });
  });
});
