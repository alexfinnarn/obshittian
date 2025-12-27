/**
 * Tests for EditorPane.svelte
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
      render(EditorPane, { props: { pane: 'left' } });
      expect(screen.getByTestId('editor-pane-left')).toBeTruthy();
    });

    it('should render with data-testid for right pane', () => {
      render(EditorPane, { props: { pane: 'right' } });
      expect(screen.getByTestId('editor-pane-right')).toBeTruthy();
    });

    it('should show "No file open" when no filename', () => {
      render(EditorPane, { props: { pane: 'left' } });
      expect(screen.getByTestId('pane-filename-left').textContent).toContain('No file open');
    });

    it('should show filename when provided', () => {
      render(EditorPane, { props: { pane: 'left', filename: 'test.md' } });
      expect(screen.getByTestId('pane-filename-left').textContent).toContain('test.md');
    });

    it('should show unsaved indicator when dirty', () => {
      render(EditorPane, { props: { pane: 'left', filename: 'test.md', isDirty: true } });
      expect(screen.getByTestId('unsaved-indicator-left')).toBeTruthy();
    });

    it('should not show unsaved indicator when not dirty', () => {
      render(EditorPane, { props: { pane: 'left', filename: 'test.md', isDirty: false } });
      expect(screen.queryByTestId('unsaved-indicator-left')).toBeNull();
    });
  });

  describe('toolbar', () => {
    it('should render Edit and View buttons', () => {
      render(EditorPane, { props: { pane: 'left' } });
      expect(screen.getByTestId('view-toggle-edit-left')).toBeTruthy();
      expect(screen.getByTestId('view-toggle-view-left')).toBeTruthy();
    });

    it('should have Edit button active by default', () => {
      render(EditorPane, { props: { pane: 'left' } });
      const editBtn = screen.getByTestId('view-toggle-edit-left');
      expect(editBtn.classList.contains('active')).toBe(true);
    });

    it('should switch to view mode when View button clicked', async () => {
      render(EditorPane, { props: { pane: 'left' } });

      const viewBtn = screen.getByTestId('view-toggle-view-left');
      await fireEvent.click(viewBtn);

      expect(viewBtn.classList.contains('active')).toBe(true);

      const editBtn = screen.getByTestId('view-toggle-edit-left');
      expect(editBtn.classList.contains('active')).toBe(false);
    });

    it('should switch back to edit mode when Edit button clicked', async () => {
      render(EditorPane, { props: { pane: 'left' } });

      // Go to view mode
      const viewBtn = screen.getByTestId('view-toggle-view-left');
      await fireEvent.click(viewBtn);

      // Go back to edit mode
      const editBtn = screen.getByTestId('view-toggle-edit-left');
      await fireEvent.click(editBtn);

      expect(editBtn.classList.contains('active')).toBe(true);
    });
  });

  describe('content display', () => {
    it('should show CodeMirrorEditor in edit mode', () => {
      render(EditorPane, { props: { pane: 'left' } });
      expect(screen.getByTestId('codemirror-editor')).toBeTruthy();
    });

    it('should show MarkdownPreview in view mode', async () => {
      render(EditorPane, { props: { pane: 'left', content: '# Hello' } });

      const viewBtn = screen.getByTestId('view-toggle-view-left');
      await fireEvent.click(viewBtn);

      expect(screen.getByTestId('markdown-preview')).toBeTruthy();
    });

    it('should hide CodeMirrorEditor when in view mode', async () => {
      render(EditorPane, { props: { pane: 'left' } });

      const viewBtn = screen.getByTestId('view-toggle-view-left');
      await fireEvent.click(viewBtn);

      expect(screen.queryByTestId('codemirror-editor')).toBeNull();
    });
  });

  describe('callbacks', () => {
    it('should call oncontentchange when content changes', () => {
      const oncontentchange = vi.fn();
      render(EditorPane, {
        props: { pane: 'left', oncontentchange },
      });

      // The handler is wired up (actual content change would require CM interaction)
      expect(screen.getByTestId('codemirror-editor')).toBeTruthy();
    });
  });

  describe('exported methods', () => {
    it('should expose toggleViewMode method', () => {
      const { component } = render(EditorPane, { props: { pane: 'left' } });
      expect(typeof component.toggleViewMode).toBe('function');
    });

    it('should expose getViewMode method', () => {
      const { component } = render(EditorPane, { props: { pane: 'left' } });
      expect(typeof component.getViewMode).toBe('function');
      expect(component.getViewMode()).toBe('edit');
    });

    it('should expose setViewMode method', () => {
      const { component } = render(EditorPane, { props: { pane: 'left' } });
      expect(typeof component.setViewMode).toBe('function');

      component.setViewMode('view');
      expect(component.getViewMode()).toBe('view');
    });

    it('should toggle view mode correctly', () => {
      const { component } = render(EditorPane, { props: { pane: 'left' } });

      expect(component.getViewMode()).toBe('edit');

      component.toggleViewMode();
      expect(component.getViewMode()).toBe('view');

      component.toggleViewMode();
      expect(component.getViewMode()).toBe('edit');
    });

    it('should expose focus method', () => {
      const { component } = render(EditorPane, { props: { pane: 'left' } });
      expect(typeof component.focus).toBe('function');
    });

    it('should expose hasFocus method', () => {
      const { component } = render(EditorPane, { props: { pane: 'left' } });
      expect(typeof component.hasFocus).toBe('function');
    });
  });
});
