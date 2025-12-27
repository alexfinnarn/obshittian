/**
 * Tests for MarkdownPreview.svelte
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import MarkdownPreview from './MarkdownPreview.svelte';
import { resetMarkedConfig } from '$lib/utils/markdown';

describe('MarkdownPreview', () => {
  beforeEach(() => {
    resetMarkedConfig();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render with data-testid', () => {
    render(MarkdownPreview, { props: { content: '' } });
    expect(screen.getByTestId('markdown-preview')).toBeTruthy();
  });

  it('should render markdown content as HTML', () => {
    render(MarkdownPreview, { props: { content: '# Hello World' } });

    const preview = screen.getByTestId('markdown-preview');
    expect(preview.innerHTML).toContain('<h1>Hello World</h1>');
  });

  it('should render paragraphs', () => {
    render(MarkdownPreview, { props: { content: 'This is a paragraph.' } });

    const preview = screen.getByTestId('markdown-preview');
    expect(preview.innerHTML).toContain('<p>This is a paragraph.</p>');
  });

  it('should render links with target="_blank"', () => {
    render(MarkdownPreview, { props: { content: '[Example](https://example.com)' } });

    const link = screen.getByRole('link', { name: 'Example' });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('href')).toBe('https://example.com');
  });

  it('should render frontmatter in collapsible details', () => {
    const content = `---
title: Test
tags: one, two
---

# Content`;

    render(MarkdownPreview, { props: { content } });

    // Should have a details element with frontmatter class
    const details = document.querySelector('.frontmatter-details');
    expect(details).toBeTruthy();

    // Summary should say "Frontmatter"
    const summary = details?.querySelector('summary');
    expect(summary?.textContent).toBe('Frontmatter');

    // Content should include the frontmatter YAML
    expect(details?.innerHTML).toContain('title: Test');
  });

  it('should not show frontmatter details when no frontmatter', () => {
    render(MarkdownPreview, { props: { content: '# No Frontmatter' } });

    const details = document.querySelector('.frontmatter-details');
    expect(details).toBeNull();
  });

  it('should render lists', () => {
    const content = `- Item 1
- Item 2
- Item 3`;

    render(MarkdownPreview, { props: { content } });

    const preview = screen.getByTestId('markdown-preview');
    expect(preview.innerHTML).toContain('<ul>');
    expect(preview.innerHTML).toContain('<li>');
    expect(preview.innerHTML).toContain('Item 1');
    expect(preview.innerHTML).toContain('Item 2');
    expect(preview.innerHTML).toContain('Item 3');
  });

  it('should render code blocks', () => {
    const content = '```\nconst x = 1;\n```';

    render(MarkdownPreview, { props: { content } });

    const preview = screen.getByTestId('markdown-preview');
    expect(preview.innerHTML).toContain('<pre>');
    expect(preview.innerHTML).toContain('<code>');
  });

  it('should render inline code', () => {
    const content = 'Use `const` for constants.';

    render(MarkdownPreview, { props: { content } });

    const preview = screen.getByTestId('markdown-preview');
    expect(preview.innerHTML).toContain('<code>const</code>');
  });

  it('should update when content changes', async () => {
    const { rerender } = render(MarkdownPreview, { props: { content: '# First' } });

    let preview = screen.getByTestId('markdown-preview');
    expect(preview.innerHTML).toContain('First');

    await rerender({ content: '# Second' });

    preview = screen.getByTestId('markdown-preview');
    expect(preview.innerHTML).toContain('Second');
    expect(preview.innerHTML).not.toContain('First');
  });

  it('should handle empty content', () => {
    render(MarkdownPreview, { props: { content: '' } });

    const preview = screen.getByTestId('markdown-preview');
    // Should exist and be empty (except for whitespace/newlines)
    expect(preview).toBeTruthy();
  });
});
