import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import Tab from './Tab.svelte';
import type { Tab as TabType } from '$lib/types/tabs';

// Create a mock tab
function createMockTab(options: Partial<TabType> = {}): TabType {
  return {
    id: 'test-id',
    filename: 'test.md',
    filePath: 'folder/test.md',
    savedContent: '',
    editorContent: '',
    isDirty: false,
    ...options,
  };
}

describe('Tab', () => {
  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('renders filename', () => {
      const tab = createMockTab({ filename: 'myfile.md' });
      render(Tab, { props: { tab, isActive: false, onclick: vi.fn(), onclose: vi.fn() } });

      expect(screen.getByText('myfile.md')).toBeTruthy();
    });

    it('no longer shows unsaved indicator (removed in favor of Save/Cancel buttons)', () => {
      const tab = createMockTab({ id: 'dirty-tab', isDirty: true });
      render(Tab, { props: { tab, isActive: false, onclick: vi.fn(), onclose: vi.fn() } });

      // Unsaved indicator was removed - dirty state is now shown via Save/Cancel buttons in TabBar
      expect(screen.queryByTestId('tab-unsaved-dirty-tab')).toBeNull();
    });

    it('does not show unsaved indicator when not dirty', () => {
      const tab = createMockTab({ id: 'clean-tab', isDirty: false });
      render(Tab, { props: { tab, isActive: false, onclick: vi.fn(), onclose: vi.fn() } });

      expect(screen.queryByTestId('tab-unsaved-clean-tab')).toBeNull();
    });

    it('has close button', () => {
      const tab = createMockTab({ id: 'tab-1' });
      render(Tab, { props: { tab, isActive: false, onclick: vi.fn(), onclose: vi.fn() } });

      expect(screen.getByTestId('tab-close-tab-1')).toBeTruthy();
    });

    it('shows full path in title tooltip', () => {
      const tab = createMockTab({ filePath: 'folder/subfolder/test.md' });
      render(Tab, { props: { tab, isActive: false, onclick: vi.fn(), onclose: vi.fn() } });

      const filenameSpan = screen.getByText(tab.filename);
      expect(filenameSpan.getAttribute('title')).toBe('folder/subfolder/test.md');
    });
  });

  describe('active state', () => {
    it('applies active class when isActive is true', () => {
      const tab = createMockTab({ id: 'active-tab' });
      render(Tab, { props: { tab, isActive: true, onclick: vi.fn(), onclose: vi.fn() } });

      const tabElement = screen.getByTestId('tab-active-tab');
      expect(tabElement.classList.contains('active')).toBe(true);
    });

    it('does not apply active class when isActive is false', () => {
      const tab = createMockTab({ id: 'inactive-tab' });
      render(Tab, { props: { tab, isActive: false, onclick: vi.fn(), onclose: vi.fn() } });

      const tabElement = screen.getByTestId('tab-inactive-tab');
      expect(tabElement.classList.contains('active')).toBe(false);
    });
  });

  describe('click handlers', () => {
    it('calls onclick when tab is clicked', async () => {
      const onclick = vi.fn();
      const tab = createMockTab({ id: 'click-tab' });
      render(Tab, { props: { tab, isActive: false, onclick, onclose: vi.fn() } });

      await fireEvent.click(screen.getByTestId('tab-click-tab'));

      expect(onclick).toHaveBeenCalledTimes(1);
    });

    it('calls onclose when close button is clicked', async () => {
      const onclose = vi.fn();
      const tab = createMockTab({ id: 'close-tab' });
      render(Tab, { props: { tab, isActive: false, onclick: vi.fn(), onclose } });

      await fireEvent.click(screen.getByTestId('tab-close-close-tab'));

      expect(onclose).toHaveBeenCalledTimes(1);
    });

    it('does not call onclick when close button is clicked', async () => {
      const onclick = vi.fn();
      const onclose = vi.fn();
      const tab = createMockTab({ id: 'test-tab' });
      render(Tab, { props: { tab, isActive: false, onclick, onclose } });

      await fireEvent.click(screen.getByTestId('tab-close-test-tab'));

      expect(onclick).not.toHaveBeenCalled();
      expect(onclose).toHaveBeenCalled();
    });
  });

  describe('keyboard accessibility', () => {
    it('calls onclick on Enter key', async () => {
      const onclick = vi.fn();
      const tab = createMockTab({ id: 'key-tab' });
      render(Tab, { props: { tab, isActive: false, onclick, onclose: vi.fn() } });

      await fireEvent.keyDown(screen.getByTestId('tab-key-tab'), { key: 'Enter' });

      expect(onclick).toHaveBeenCalledTimes(1);
    });

    it('calls onclick on Space key', async () => {
      const onclick = vi.fn();
      const tab = createMockTab({ id: 'space-tab' });
      render(Tab, { props: { tab, isActive: false, onclick, onclose: vi.fn() } });

      await fireEvent.keyDown(screen.getByTestId('tab-space-tab'), { key: ' ' });

      expect(onclick).toHaveBeenCalledTimes(1);
    });
  });

  describe('ARIA attributes', () => {
    it('has role="tab"', () => {
      const tab = createMockTab({ id: 'aria-tab' });
      render(Tab, { props: { tab, isActive: false, onclick: vi.fn(), onclose: vi.fn() } });

      const tabElement = screen.getByTestId('tab-aria-tab');
      expect(tabElement.getAttribute('role')).toBe('tab');
    });

    it('has aria-selected=true when active', () => {
      const tab = createMockTab({ id: 'selected-tab' });
      render(Tab, { props: { tab, isActive: true, onclick: vi.fn(), onclose: vi.fn() } });

      const tabElement = screen.getByTestId('tab-selected-tab');
      expect(tabElement.getAttribute('aria-selected')).toBe('true');
    });

    it('has aria-selected=false when not active', () => {
      const tab = createMockTab({ id: 'not-selected-tab' });
      render(Tab, { props: { tab, isActive: false, onclick: vi.fn(), onclose: vi.fn() } });

      const tabElement = screen.getByTestId('tab-not-selected-tab');
      expect(tabElement.getAttribute('aria-selected')).toBe('false');
    });

    it('close button has aria-label', () => {
      const tab = createMockTab({ id: 'label-tab', filename: 'document.md' });
      render(Tab, { props: { tab, isActive: false, onclick: vi.fn(), onclose: vi.fn() } });

      const closeButton = screen.getByTestId('tab-close-label-tab');
      expect(closeButton.getAttribute('aria-label')).toBe('Close document.md');
    });
  });
});
