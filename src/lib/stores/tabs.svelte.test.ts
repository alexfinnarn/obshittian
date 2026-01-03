import { describe, it, expect, beforeEach } from 'vitest';
import {
  tabsStore,
  TAB_LIMIT,
  getActiveTab,
  getTabCount,
  canAddTab,
  findTabByPath,
  addTab,
  replaceCurrentTab,
  removeTab,
  switchTab,
  updateTabContent,
  markTabDirty,
  markTabClean,
  saveTabsToStorage,
  getTabsFromStorage,
  clearTabsStorage,
  resetTabsStore,
  setTabs,
} from './tabs.svelte';
import { createTab, type Tab } from '$lib/types/tabs';

// Create mock tabs using the new path-based API
function createMockTab(filename: string, filePath: string, content = ''): Tab {
  return createTab(filePath, content);
}

describe('tabs store', () => {
  beforeEach(() => {
    localStorage.clear();
    resetTabsStore();
  });

  describe('initial state', () => {
    it('starts with empty tabs', () => {
      expect(tabsStore.tabs).toEqual([]);
      expect(tabsStore.activeTabIndex).toBe(-1);
    });

    it('getActiveTab returns null when no tabs', () => {
      expect(getActiveTab()).toBeNull();
    });

    it('getTabCount returns 0', () => {
      expect(getTabCount()).toBe(0);
    });

    it('canAddTab returns true when empty', () => {
      expect(canAddTab()).toBe(true);
    });
  });

  describe('createTab', () => {
    it('generates unique IDs', () => {
      const tab1 = createMockTab('file1.md', 'file1.md');
      const tab2 = createMockTab('file2.md', 'file2.md');
      expect(tab1.id).not.toBe(tab2.id);
    });

    it('sets correct initial properties', () => {
      const tab = createMockTab('test.md', 'folder/test.md', 'content');
      expect(tab.filename).toBe('test.md');
      expect(tab.filePath).toBe('folder/test.md');
      expect(tab.savedContent).toBe('content');
      expect(tab.editorContent).toBe('content');
      expect(tab.isDirty).toBe(false);
    });
  });

  describe('addTab', () => {
    it('adds tab and sets active index', () => {
      const tab = createMockTab('file1.md', 'file1.md');
      const result = addTab(tab);

      expect(result).toBe(true);
      expect(tabsStore.tabs.length).toBe(1);
      expect(tabsStore.activeTabIndex).toBe(0);
      expect(getActiveTab()?.filename).toBe('file1.md');
    });

    it('switches to existing tab if same path', () => {
      const tab1 = createMockTab('file1.md', 'path/file1.md');
      const tab2 = createMockTab('file2.md', 'path/file2.md');
      addTab(tab1);
      addTab(tab2);
      expect(tabsStore.activeTabIndex).toBe(1);

      // Try to add same path as tab1
      const duplicate = createMockTab('file1.md', 'path/file1.md');
      const result = addTab(duplicate);

      expect(result).toBe(false); // Indicates switched, not added
      expect(tabsStore.tabs.length).toBe(2);
      expect(tabsStore.activeTabIndex).toBe(0);
    });

    it('makes new tab active', () => {
      const tab1 = createMockTab('file1.md', 'file1.md');
      const tab2 = createMockTab('file2.md', 'file2.md');

      addTab(tab1);
      addTab(tab2);

      expect(tabsStore.activeTabIndex).toBe(1);
      expect(getActiveTab()?.filename).toBe('file2.md');
    });
  });

  describe('replaceCurrentTab', () => {
    it('adds first tab when empty', () => {
      const tab = createMockTab('file1.md', 'file1.md');
      replaceCurrentTab(tab);

      expect(tabsStore.tabs.length).toBe(1);
      expect(tabsStore.activeTabIndex).toBe(0);
    });

    it('replaces current tab', () => {
      const tab1 = createMockTab('file1.md', 'file1.md');
      const tab2 = createMockTab('file2.md', 'file2.md');

      addTab(tab1);
      replaceCurrentTab(tab2);

      expect(tabsStore.tabs.length).toBe(1);
      expect(getActiveTab()?.filename).toBe('file2.md');
    });

    it('switches to existing tab if path matches', () => {
      const tab1 = createMockTab('file1.md', 'path/file1.md');
      const tab2 = createMockTab('file2.md', 'path/file2.md');
      addTab(tab1);
      addTab(tab2);

      const duplicate = createMockTab('file1.md', 'path/file1.md');
      replaceCurrentTab(duplicate);

      expect(tabsStore.tabs.length).toBe(2);
      expect(tabsStore.activeTabIndex).toBe(0);
    });
  });

  describe('removeTab', () => {
    it('removes tab by index', () => {
      const tab1 = createMockTab('file1.md', 'file1.md');
      const tab2 = createMockTab('file2.md', 'file2.md');
      addTab(tab1);
      addTab(tab2);

      removeTab(0, true); // skip confirmation

      expect(tabsStore.tabs.length).toBe(1);
      expect(getActiveTab()?.filename).toBe('file2.md');
    });

    it('adjusts active index when removing before active', () => {
      const tab1 = createMockTab('file1.md', 'file1.md');
      const tab2 = createMockTab('file2.md', 'file2.md');
      const tab3 = createMockTab('file3.md', 'file3.md');
      addTab(tab1);
      addTab(tab2);
      addTab(tab3);

      removeTab(0, true);

      expect(tabsStore.activeTabIndex).toBe(1); // Was 2, now 1
      expect(getActiveTab()?.filename).toBe('file3.md');
    });

    it('sets activeTabIndex to -1 when removing last tab', () => {
      const tab = createMockTab('file.md', 'file.md');
      addTab(tab);
      removeTab(0, true);

      expect(tabsStore.tabs.length).toBe(0);
      expect(tabsStore.activeTabIndex).toBe(-1);
      expect(getActiveTab()).toBeNull();
    });

    it('returns false for invalid index', () => {
      const result = removeTab(-1);
      expect(result).toBe(false);

      const tab = createMockTab('file.md', 'file.md');
      addTab(tab);
      expect(removeTab(5)).toBe(false);
    });
  });

  describe('switchTab', () => {
    it('switches to specified tab', () => {
      const tab1 = createMockTab('file1.md', 'file1.md');
      const tab2 = createMockTab('file2.md', 'file2.md');
      addTab(tab1);
      addTab(tab2);

      switchTab(0);

      expect(tabsStore.activeTabIndex).toBe(0);
      expect(getActiveTab()?.filename).toBe('file1.md');
    });

    it('does nothing for invalid index', () => {
      const tab = createMockTab('file.md', 'file.md');
      addTab(tab);

      switchTab(-1);
      expect(tabsStore.activeTabIndex).toBe(0);

      switchTab(10);
      expect(tabsStore.activeTabIndex).toBe(0);
    });

    it('does nothing when switching to current tab', () => {
      const tab1 = createMockTab('file1.md', 'file1.md');
      const tab2 = createMockTab('file2.md', 'file2.md');
      addTab(tab1);
      addTab(tab2);

      switchTab(1);
      expect(tabsStore.activeTabIndex).toBe(1);
    });
  });

  describe('updateTabContent', () => {
    it('updates editorContent', () => {
      const tab = createMockTab('file.md', 'file.md', 'original');
      addTab(tab);

      updateTabContent(0, 'modified');

      expect(tabsStore.tabs[0].editorContent).toBe('modified');
    });

    it('marks tab dirty when content differs from saved', () => {
      const tab = createMockTab('file.md', 'file.md', 'original');
      addTab(tab);

      updateTabContent(0, 'modified');

      expect(tabsStore.tabs[0].isDirty).toBe(true);
    });
  });

  describe('markTabDirty / markTabClean', () => {
    it('markTabDirty sets isDirty to true', () => {
      const tab = createMockTab('file.md', 'file.md');
      addTab(tab);

      markTabDirty(0);

      expect(tabsStore.tabs[0].isDirty).toBe(true);
    });

    it('markTabClean sets isDirty to false and updates content', () => {
      const tab = createMockTab('file.md', 'file.md', 'original');
      addTab(tab);
      updateTabContent(0, 'modified');

      markTabClean(0, 'modified');

      expect(tabsStore.tabs[0].isDirty).toBe(false);
      expect(tabsStore.tabs[0].savedContent).toBe('modified');
      expect(tabsStore.tabs[0].editorContent).toBe('modified');
    });
  });

  describe('findTabByPath', () => {
    it('returns index of tab with matching path', () => {
      const tab1 = createMockTab('file1.md', 'path/file1.md');
      const tab2 = createMockTab('file2.md', 'path/file2.md');
      addTab(tab1);
      addTab(tab2);

      expect(findTabByPath('path/file1.md')).toBe(0);
      expect(findTabByPath('path/file2.md')).toBe(1);
    });

    it('returns -1 when path not found', () => {
      const tab = createMockTab('file.md', 'file.md');
      addTab(tab);

      expect(findTabByPath('nonexistent.md')).toBe(-1);
    });
  });

  describe('canAddTab', () => {
    it('returns true when under limit', () => {
      for (let i = 0; i < TAB_LIMIT - 1; i++) {
        addTab(createMockTab(`file${i}.md`, `file${i}.md`));
      }
      expect(canAddTab()).toBe(true);
    });

    it('returns false at limit', () => {
      for (let i = 0; i < TAB_LIMIT; i++) {
        addTab(createMockTab(`file${i}.md`, `file${i}.md`));
      }
      expect(canAddTab()).toBe(false);
    });
  });

  describe('persistence', () => {
    it('saveTabsToStorage saves tab paths and active index', () => {
      const tab1 = createMockTab('file1.md', 'path/file1.md');
      const tab2 = createMockTab('file2.md', 'path/file2.md');
      addTab(tab1);
      addTab(tab2);

      saveTabsToStorage();

      const stored = localStorage.getItem('editorLeftPaneTabs');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.tabs).toHaveLength(2);
      expect(parsed.tabs[0].filePath).toBe('path/file1.md');
      expect(parsed.tabs[1].filePath).toBe('path/file2.md');
      expect(parsed.activeIndex).toBe(1);
    });

    it('getTabsFromStorage retrieves stored data', () => {
      localStorage.setItem(
        'editorLeftPaneTabs',
        JSON.stringify({
          tabs: [{ filePath: 'test.md', filename: 'test.md' }],
          activeIndex: 0,
        })
      );

      const data = getTabsFromStorage();
      expect(data).not.toBeNull();
      expect(data!.tabs).toHaveLength(1);
      expect(data!.tabs[0].filePath).toBe('test.md');
    });

    it('getTabsFromStorage returns null when empty', () => {
      expect(getTabsFromStorage()).toBeNull();
    });

    it('getTabsFromStorage returns null for invalid JSON', () => {
      localStorage.setItem('editorLeftPaneTabs', 'not json');
      expect(getTabsFromStorage()).toBeNull();
    });

    it('clearTabsStorage removes stored tabs', () => {
      localStorage.setItem('editorLeftPaneTabs', '{}');
      clearTabsStorage();
      expect(localStorage.getItem('editorLeftPaneTabs')).toBeNull();
    });
  });

  describe('setTabs', () => {
    it('sets tabs directly', () => {
      const tab1 = createMockTab('file1.md', 'file1.md');
      const tab2 = createMockTab('file2.md', 'file2.md');

      setTabs([tab1, tab2], 1);

      expect(tabsStore.tabs).toHaveLength(2);
      expect(tabsStore.activeTabIndex).toBe(1);
    });

    it('clamps active index to valid range', () => {
      const tab = createMockTab('file.md', 'file.md');

      setTabs([tab], 10);
      expect(tabsStore.activeTabIndex).toBe(0);

      setTabs([tab], -1);
      expect(tabsStore.activeTabIndex).toBe(0);
    });

    it('sets activeTabIndex to -1 for empty tabs', () => {
      setTabs([], 0);
      expect(tabsStore.activeTabIndex).toBe(-1);
    });
  });
});
