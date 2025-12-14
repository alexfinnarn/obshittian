import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

// We need to set up marked globally before importing our module
const markedModule = await import('marked');
globalThis.marked = markedModule.marked || markedModule.default;

import { configureMarked, renderPreview } from '../js/marked-config.js';

describe('marked-config', () => {
  beforeAll(() => {
    configureMarked();
  });

  describe('configureMarked', () => {
    describe('link renderer', () => {
      it('adds target="_blank" to links', () => {
        const html = marked.parse('[Example](https://example.com)');

        expect(html).toContain('target="_blank"');
        expect(html).toContain('href="https://example.com"');
        expect(html).toContain('>Example</a>');
      });

      it('preserves link title attribute', () => {
        const html = marked.parse('[Example](https://example.com "Example Title")');

        expect(html).toContain('title="Example Title"');
      });

      it('handles links without title', () => {
        const html = marked.parse('[Test](https://test.com)');

        expect(html).not.toContain('title=');
        expect(html).toContain('href="https://test.com"');
      });

      it('handles inline formatting in link text', () => {
        const html = marked.parse('[**Bold Link**](https://example.com)');

        expect(html).toContain('<strong>Bold Link</strong>');
        expect(html).toContain('href="https://example.com"');
      });
    });

    describe('listitem renderer', () => {
      it('renders simple list items normally', () => {
        const html = marked.parse('- Item 1\n- Item 2');

        expect(html).toContain('<li>Item 1</li>');
        expect(html).toContain('<li>Item 2</li>');
        expect(html).not.toContain('<details>');
      });

      it('wraps nested lists in details/summary', () => {
        const markdown = `- Parent item
  - Child item 1
  - Child item 2`;

        const html = marked.parse(markdown);

        expect(html).toContain('<details>');
        expect(html).toContain('<summary>');
        expect(html).toContain('Parent item');
        expect(html).toContain('Child item 1');
      });

      it('handles deeply nested lists', () => {
        const markdown = `- Level 1
  - Level 2
    - Level 3`;

        const html = marked.parse(markdown);

        // Should have multiple details elements for nesting
        expect(html).toContain('<details>');
        expect(html).toContain('Level 1');
        expect(html).toContain('Level 2');
        expect(html).toContain('Level 3');
      });

      it('handles mixed list types', () => {
        const markdown = `- Unordered parent
  1. Ordered child 1
  2. Ordered child 2`;

        const html = marked.parse(markdown);

        expect(html).toContain('<details>');
        expect(html).toContain('<ol>');
      });
    });
  });

  describe('renderPreview', () => {
    let previewElement;

    beforeEach(() => {
      previewElement = document.createElement('div');
    });

    it('renders markdown to HTML in the element', () => {
      renderPreview('# Hello World', previewElement);

      expect(previewElement.innerHTML).toContain('<h1>Hello World</h1>');
    });

    it('renders paragraphs', () => {
      renderPreview('This is a paragraph.', previewElement);

      expect(previewElement.innerHTML).toContain('<p>This is a paragraph.</p>');
    });

    it('renders code blocks', () => {
      renderPreview('```javascript\nconst x = 1;\n```', previewElement);

      expect(previewElement.innerHTML).toContain('<code');
      expect(previewElement.innerHTML).toContain('const x = 1;');
    });

    it('renders bold and italic text', () => {
      renderPreview('**bold** and *italic*', previewElement);

      expect(previewElement.innerHTML).toContain('<strong>bold</strong>');
      expect(previewElement.innerHTML).toContain('<em>italic</em>');
    });

    it('renders task lists', () => {
      renderPreview('- [ ] Unchecked\n- [x] Checked', previewElement);

      expect(previewElement.innerHTML).toContain('type="checkbox"');
    });

    it('clears previous content before rendering', () => {
      previewElement.innerHTML = '<p>Old content</p>';

      renderPreview('New content', previewElement);

      expect(previewElement.innerHTML).not.toContain('Old content');
      expect(previewElement.innerHTML).toContain('New content');
    });

    describe('frontmatter handling', () => {
      it('wraps frontmatter in a details element', () => {
        const content = `---
tags: test, example
title: My Note
---

# Content here`;

        renderPreview(content, previewElement);

        expect(previewElement.innerHTML).toContain('<details class="frontmatter-details">');
        expect(previewElement.innerHTML).toContain('<summary>Frontmatter</summary>');
      });

      it('displays frontmatter as preformatted text', () => {
        const content = `---
tags: test
---

# Heading`;

        renderPreview(content, previewElement);

        expect(previewElement.innerHTML).toContain('<pre class="frontmatter-yaml">');
        expect(previewElement.innerHTML).toContain('tags: test');
      });

      it('escapes HTML entities in frontmatter', () => {
        const content = `---
title: <script>alert("xss")</script>
---

Content`;

        renderPreview(content, previewElement);

        expect(previewElement.innerHTML).toContain('&lt;script&gt;');
        expect(previewElement.innerHTML).not.toContain('<script>alert');
      });

      it('renders content after frontmatter normally', () => {
        const content = `---
tags: test
---

# My Heading

Some paragraph text.`;

        renderPreview(content, previewElement);

        expect(previewElement.innerHTML).toContain('<h1>My Heading</h1>');
        expect(previewElement.innerHTML).toContain('<p>Some paragraph text.</p>');
      });

      it('renders content without frontmatter normally', () => {
        const content = `# No Frontmatter

Just regular content.`;

        renderPreview(content, previewElement);

        expect(previewElement.innerHTML).not.toContain('<details');
        expect(previewElement.innerHTML).toContain('<h1>No Frontmatter</h1>');
      });

      it('handles content starting with --- but no closing delimiter', () => {
        const content = `---
This is not valid frontmatter
It has no closing delimiter

# Heading`;

        renderPreview(content, previewElement);

        // Should treat the whole thing as content, not frontmatter
        expect(previewElement.innerHTML).not.toContain('frontmatter-details');
      });
    });
  });
});
