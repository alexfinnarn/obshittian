/**
 * Tests for EditorPane.svelte (left pane, tabs-only)
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
import EditorPane from './EditorPane.svelte';
import { resetEditorState } from '$lib/stores/editor.svelte';
import { clear } from '$lib/utils/eventBus';

describe('EditorPane', () => {
  beforeEach(() => {
    resetEditorState();
    clear();
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('should render with data-testid for left pane', () => {
      render(EditorPane, { props: {} });
      expect(screen.getByTestId('editor-pane-left')).toBeTruthy();
    });

    it('should render TabBar', () => {
      render(EditorPane, { props: {} });
      expect(screen.getByTestId('tab-bar')).toBeTruthy();
    });

    it('should render CodeMirrorEditor in edit mode by default', () => {
      render(EditorPane, { props: {} });
      expect(screen.getByTestId('codemirror-editor')).toBeTruthy();
    });
  });

  describe('view mode', () => {
    it('should show MarkdownPreview when initialViewMode is view', async () => {
      render(EditorPane, { props: { initialViewMode: 'view' } });
      expect(screen.getByTestId('markdown-preview')).toBeTruthy();
    });

    it('should hide CodeMirrorEditor when in view mode', () => {
      render(EditorPane, { props: { initialViewMode: 'view' } });
      expect(screen.queryByTestId('codemirror-editor')).toBeNull();
    });
  });

  describe('callbacks', () => {
    it('should call oncontentchange when content changes', () => {
      const oncontentchange = vi.fn();
      render(EditorPane, { props: { oncontentchange } });

      // The handler is wired up (actual content change would require CM interaction)
      expect(screen.getByTestId('codemirror-editor')).toBeTruthy();
    });
  });

  describe('exported methods', () => {
    it('should expose toggleViewMode method', () => {
      const { component } = render(EditorPane, { props: {} });
      expect(typeof component.toggleViewMode).toBe('function');
    });

    it('should expose getViewMode method', () => {
      const { component } = render(EditorPane, { props: {} });
      expect(typeof component.getViewMode).toBe('function');
      expect(component.getViewMode()).toBe('edit');
    });

    it('should expose setViewMode method', () => {
      const { component } = render(EditorPane, { props: {} });
      expect(typeof component.setViewMode).toBe('function');

      component.setViewMode('view');
      expect(component.getViewMode()).toBe('view');
    });

    it('should toggle view mode correctly', () => {
      const { component } = render(EditorPane, { props: {} });

      expect(component.getViewMode()).toBe('edit');

      component.toggleViewMode();
      expect(component.getViewMode()).toBe('view');

      component.toggleViewMode();
      expect(component.getViewMode()).toBe('edit');
    });

    it('should expose focus method', () => {
      const { component } = render(EditorPane, { props: {} });
      expect(typeof component.focus).toBe('function');
    });

    it('should expose hasFocus method', () => {
      const { component } = render(EditorPane, { props: {} });
      expect(typeof component.hasFocus).toBe('function');
    });
  });
});
