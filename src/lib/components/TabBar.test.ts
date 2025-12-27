import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import TabBar from './TabBar.svelte';
import { tabsStore, addTab, resetTabsStore } from '$lib/stores/tabs.svelte';
import { createTab, type Tab } from '$lib/types/tabs';

// Create a mock tab
function createMockTab(filename: string, relativePath: string): Tab {
  const mockFileHandle = {
    kind: 'file' as const,
    name: filename,
    getFile: async () => new File([''], filename),
    createWritable: async () => ({} as FileSystemWritableFileStream),
  } as unknown as FileSystemFileHandle;

  const mockDirHandle = {
    kind: 'directory' as const,
    name: 'test-dir',
  } as unknown as FileSystemDirectoryHandle;

  return createTab(mockFileHandle, mockDirHandle, '', relativePath);
}

describe('TabBar', () => {
  beforeEach(() => {
    localStorage.clear();
    resetTabsStore();
  });

  afterEach(() => {
    cleanup();
  });

  describe('empty state', () => {
    it('shows "No file open" when no tabs', () => {
      render(TabBar, { props: {} });

      expect(screen.getByText('No file open')).toBeTruthy();
    });
  });

  describe('rendering tabs', () => {
    it('renders correct number of tabs', () => {
      addTab(createMockTab('file1.md', 'file1.md'));
      addTab(createMockTab('file2.md', 'file2.md'));
      addTab(createMockTab('file3.md', 'file3.md'));

      render(TabBar, { props: {} });

      expect(screen.getByText('file1.md')).toBeTruthy();
      expect(screen.getByText('file2.md')).toBeTruthy();
      expect(screen.getByText('file3.md')).toBeTruthy();
    });

    it('hides "No file open" when tabs exist', () => {
      addTab(createMockTab('file.md', 'file.md'));
      render(TabBar, { props: {} });

      expect(screen.queryByText('No file open')).toBeNull();
    });
  });

  describe('active tab', () => {
    it('highlights active tab', () => {
      const tab1 = createMockTab('file1.md', 'file1.md');
      const tab2 = createMockTab('file2.md', 'file2.md');
      addTab(tab1);
      addTab(tab2);

      render(TabBar, { props: {} });

      // tab2 should be active (last added)
      const tab1Element = screen.getByTestId(`tab-${tab1.id}`);
      const tab2Element = screen.getByTestId(`tab-${tab2.id}`);

      expect(tab1Element.classList.contains('active')).toBe(false);
      expect(tab2Element.classList.contains('active')).toBe(true);
    });
  });

  describe('tab interactions', () => {
    it('calls ontabchange when tab is clicked', async () => {
      const tab1 = createMockTab('file1.md', 'file1.md');
      const tab2 = createMockTab('file2.md', 'file2.md');
      addTab(tab1);
      addTab(tab2);

      const ontabchange = vi.fn();
      render(TabBar, { props: { ontabchange } });

      // Click on first tab (not active)
      await fireEvent.click(screen.getByTestId(`tab-${tab1.id}`));

      expect(ontabchange).toHaveBeenCalled();
      expect(tabsStore.activeTabIndex).toBe(0);
    });

    it('calls ontabchange when tab is closed', async () => {
      const tab1 = createMockTab('file1.md', 'file1.md');
      const tab2 = createMockTab('file2.md', 'file2.md');
      addTab(tab1);
      addTab(tab2);

      const ontabchange = vi.fn();
      render(TabBar, { props: { ontabchange } });

      // Close the second tab (active)
      await fireEvent.click(screen.getByTestId(`tab-close-${tab2.id}`));

      expect(ontabchange).toHaveBeenCalled();
      expect(tabsStore.tabs.length).toBe(1);
    });
  });

  describe('accessibility', () => {
    it('has role="tablist"', () => {
      render(TabBar, { props: {} });

      expect(screen.getByTestId('tab-bar').getAttribute('role')).toBe('tablist');
    });
  });
});
