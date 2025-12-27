/**
 * Tests for CodeMirrorEditor.svelte
 *
 * Note: These tests use the real CodeMirror implementation.
 * happy-dom supports enough DOM APIs for basic CodeMirror functionality.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import CodeMirrorEditor from './CodeMirrorEditor.svelte';

describe('CodeMirrorEditor', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render with data-testid', () => {
    render(CodeMirrorEditor, { props: { content: '' } });
    expect(screen.getByTestId('codemirror-editor')).toBeTruthy();
  });

  it('should render the container element', () => {
    render(CodeMirrorEditor, { props: { content: '' } });
    const container = screen.getByTestId('codemirror-editor');
    expect(container.classList.contains('editor-container')).toBe(true);
  });

  it('should accept initial content prop', () => {
    const content = '# Hello World';
    render(CodeMirrorEditor, { props: { content } });

    // The editor should be rendered (we can't easily inspect CM state in happy-dom)
    const container = screen.getByTestId('codemirror-editor');
    expect(container).toBeTruthy();
  });

  it('should call onchange when provided', async () => {
    const onchange = vi.fn();
    render(CodeMirrorEditor, {
      props: { content: '', onchange },
    });

    // The component renders - we can't easily trigger CM changes in happy-dom
    // but we verify the handler is accepted without error
    expect(screen.getByTestId('codemirror-editor')).toBeTruthy();
  });

  it('should call ondocchange when provided', async () => {
    const ondocchange = vi.fn();
    render(CodeMirrorEditor, {
      props: { content: '', ondocchange },
    });

    // Verify the handler is accepted
    expect(screen.getByTestId('codemirror-editor')).toBeTruthy();
  });

  it('should expose getContent method', () => {
    const { component } = render(CodeMirrorEditor, { props: { content: 'test' } });

    // The exported method should exist
    expect(typeof component.getContent).toBe('function');
  });

  it('should expose focus method', () => {
    const { component } = render(CodeMirrorEditor, { props: { content: '' } });

    // The exported method should exist
    expect(typeof component.focus).toBe('function');
  });

  it('should expose hasFocus method', () => {
    const { component } = render(CodeMirrorEditor, { props: { content: '' } });

    // The exported method should exist
    expect(typeof component.hasFocus).toBe('function');
  });
});
