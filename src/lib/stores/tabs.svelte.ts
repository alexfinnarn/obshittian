/**
 * Tabs store for the left editor pane.
 * Manages multiple open files with tab switching, persistence, and dirty state tracking.
 */

import type { Tab, TabStorageItem, TabsStorageData } from '$lib/types/tabs';

// Constants
export const TAB_LIMIT = 5;
const TABS_STORAGE_KEY = 'editorLeftPaneTabs';

// Reactive state
interface TabsState {
  tabs: Tab[];
  activeTabIndex: number;
}

export const tabsStore = $state<TabsState>({
  tabs: [],
  activeTabIndex: -1,
});

// --- Getters (use functions since $derived can't be exported) ---

/** Get the currently active tab, or null if none */
export function getActiveTab(): Tab | null {
  if (tabsStore.activeTabIndex < 0 || tabsStore.activeTabIndex >= tabsStore.tabs.length) {
    return null;
  }
  return tabsStore.tabs[tabsStore.activeTabIndex];
}

/** Get current tab count */
export function getTabCount(): number {
  return tabsStore.tabs.length;
}

/** Check if a new tab can be added (under limit) */
export function canAddTab(): boolean {
  return tabsStore.tabs.length < TAB_LIMIT;
}

/** Find tab index by relative path, returns -1 if not found */
export function findTabByPath(relativePath: string): number {
  return tabsStore.tabs.findIndex(tab => tab.relativePath === relativePath);
}

// --- Tab Operations ---

/**
 * Add a new tab and make it active.
 * If file is already open, switches to that tab instead.
 * Returns true if tab was added, false if switched to existing.
 */
export function addTab(tab: Tab): boolean {
  // Check if already open
  const existingIndex = findTabByPath(tab.relativePath);
  if (existingIndex >= 0) {
    switchTab(existingIndex);
    return false;
  }

  // Add the new tab
  tabsStore.tabs.push(tab);
  tabsStore.activeTabIndex = tabsStore.tabs.length - 1;

  saveTabsToStorage();
  return true;
}

/**
 * Replace the current tab's content with a new file.
 * Used for single-click behavior (opens in current tab).
 * If file is already open in another tab, switches to that tab.
 * If current tab is dirty, prompts for confirmation.
 */
export function replaceCurrentTab(tab: Tab): boolean {
  // Check if already open in another tab
  const existingIndex = findTabByPath(tab.relativePath);
  if (existingIndex >= 0) {
    switchTab(existingIndex);
    return true;
  }

  if (tabsStore.tabs.length === 0) {
    // No tabs, just add this one
    tabsStore.tabs.push(tab);
    tabsStore.activeTabIndex = 0;
  } else {
    const currentTab = getActiveTab();
    if (currentTab && currentTab.isDirty) {
      // Prompt user about unsaved changes
      if (!confirm(`"${currentTab.filename}" has unsaved changes. Discard and open new file?`)) {
        return false;
      }
    }
    // Replace current tab
    tabsStore.tabs[tabsStore.activeTabIndex] = tab;
  }

  saveTabsToStorage();
  return true;
}

/**
 * Remove a tab by index.
 * If tab is dirty and skipConfirmation is false, prompts user.
 * Returns true if removed, false if cancelled.
 */
export function removeTab(index: number, skipConfirmation = false): boolean {
  if (index < 0 || index >= tabsStore.tabs.length) return false;

  const tab = tabsStore.tabs[index];

  // Check for unsaved changes
  if (tab.isDirty && !skipConfirmation) {
    if (!confirm(`Close "${tab.filename}" with unsaved changes?`)) {
      return false;
    }
  }

  // Remove the tab
  tabsStore.tabs.splice(index, 1);

  // Adjust active index
  if (tabsStore.tabs.length === 0) {
    tabsStore.activeTabIndex = -1;
  } else if (index <= tabsStore.activeTabIndex) {
    tabsStore.activeTabIndex = Math.max(0, tabsStore.activeTabIndex - 1);
  }

  saveTabsToStorage();
  return true;
}

/**
 * Switch to a different tab by index.
 * No-op if index is invalid or already active.
 */
export function switchTab(index: number): void {
  if (index < 0 || index >= tabsStore.tabs.length) return;
  if (index === tabsStore.activeTabIndex) return;

  tabsStore.activeTabIndex = index;
  saveTabsToStorage();
}

/**
 * Update the editor content for a tab (without marking dirty).
 * Used when syncing content from the editor.
 */
export function updateTabContent(index: number, content: string): void {
  if (index < 0 || index >= tabsStore.tabs.length) return;

  const tab = tabsStore.tabs[index];
  tab.editorContent = content;

  // Mark dirty if content differs from saved
  if (content !== tab.savedContent) {
    tab.isDirty = true;
  }
}

/**
 * Mark a tab as dirty (has unsaved changes).
 */
export function markTabDirty(index: number): void {
  if (index < 0 || index >= tabsStore.tabs.length) return;
  tabsStore.tabs[index].isDirty = true;
}

/**
 * Mark a tab as clean (no unsaved changes).
 * Updates both savedContent and editorContent to match.
 */
export function markTabClean(index: number, content: string): void {
  if (index < 0 || index >= tabsStore.tabs.length) return;

  const tab = tabsStore.tabs[index];
  tab.isDirty = false;
  tab.savedContent = content;
  tab.editorContent = content;

  saveTabsToStorage();
}

// --- Persistence ---

/** Save current tabs to localStorage */
export function saveTabsToStorage(): void {
  const data: TabsStorageData = {
    tabs: tabsStore.tabs.map(tab => ({
      relativePath: tab.relativePath,
      filename: tab.filename,
    })),
    activeIndex: tabsStore.activeTabIndex,
  };
  localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(data));
}

/** Get tabs data from localStorage */
export function getTabsFromStorage(): TabsStorageData | null {
  const stored = localStorage.getItem(TABS_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/** Clear tabs from localStorage */
export function clearTabsStorage(): void {
  localStorage.removeItem(TABS_STORAGE_KEY);
}

// --- Testing ---

/** Reset store to initial state (for testing) */
export function resetTabsStore(): void {
  tabsStore.tabs = [];
  tabsStore.activeTabIndex = -1;
}

/**
 * Set tabs directly (for restoring from storage).
 * Use this after loading file content for each stored tab.
 */
export function setTabs(tabs: Tab[], activeIndex: number): void {
  tabsStore.tabs = tabs;
  tabsStore.activeTabIndex = activeIndex >= 0 && activeIndex < tabs.length ? activeIndex : (tabs.length > 0 ? 0 : -1);
}
