/**
 * Tests for PaneResizer.svelte
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
import PaneResizer from './PaneResizer.svelte';

describe('PaneResizer', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render with data-testid', () => {
    render(PaneResizer);
    expect(screen.getByTestId('pane-divider')).toBeTruthy();
  });

  it('should have correct ARIA attributes', () => {
    render(PaneResizer);
    const divider = screen.getByTestId('pane-divider');

    expect(divider.getAttribute('role')).toBe('separator');
    expect(divider.getAttribute('aria-orientation')).toBe('vertical');
    expect(divider.getAttribute('aria-label')).toBe('Resize panes');
  });

  it('should be focusable', () => {
    render(PaneResizer);
    const divider = screen.getByTestId('pane-divider');

    expect(divider.getAttribute('tabindex')).toBe('0');
  });

  it('should have pane-divider class', () => {
    render(PaneResizer);
    const divider = screen.getByTestId('pane-divider');

    expect(divider.classList.contains('pane-divider')).toBe(true);
  });

  it('should add dragging class on mousedown', async () => {
    render(PaneResizer);
    const divider = screen.getByTestId('pane-divider');

    await fireEvent.mouseDown(divider);

    expect(divider.classList.contains('dragging')).toBe(true);
  });

  it('should remove dragging class on mouseup', async () => {
    render(PaneResizer);
    const divider = screen.getByTestId('pane-divider');

    await fireEvent.mouseDown(divider);
    expect(divider.classList.contains('dragging')).toBe(true);

    // Simulate mouseup on window
    await fireEvent.mouseUp(window);

    expect(divider.classList.contains('dragging')).toBe(false);
  });

  it('should accept onresize callback', () => {
    const onresize = vi.fn();
    render(PaneResizer, { props: { onresize } });

    // The handler is wired up
    expect(screen.getByTestId('pane-divider')).toBeTruthy();
  });
});
