/**
 * Shortcut Handlers - Handler functions for keyboard shortcuts
 *
 * These handlers contain the business logic for each keyboard shortcut.
 * They use the event bus for cross-component communication, allowing
 * shortcuts to be decoupled from specific component implementations.
 */

import { emit } from '$lib/utils/eventBus';
import { getFocusedPane } from '$lib/stores/editor.svelte';
import { tabsStore, removeTab, switchTab } from '$lib/stores/tabs.svelte';

/**
 * Handle toggle view mode shortcut (Cmd+E)
 *
 * Emits pane:toggleView event for the focused pane.
 * Components listen for this event and toggle their view mode.
 */
export function handleToggleView(): void {
  const focused = getFocusedPane();
  if (focused) {
    emit('pane:toggleView', { pane: focused });
  }
}

/**
 * Handle close tab shortcut (Cmd+W)
 *
 * Only works when left pane is focused and has tabs.
 */
export function handleCloseTab(): void {
  const focused = getFocusedPane();
  if (focused === 'left' && tabsStore.tabs.length > 0) {
    removeTab(tabsStore.activeTabIndex);
  }
}

/**
 * Handle next tab shortcut (Cmd+Tab)
 *
 * Cycles to the next tab in the left pane.
 */
export function handleNextTab(): void {
  if (tabsStore.tabs.length > 1) {
    const nextIndex = (tabsStore.activeTabIndex + 1) % tabsStore.tabs.length;
    switchTab(nextIndex);
  }
}

/**
 * Handle previous tab shortcut (Cmd+Shift+Tab)
 *
 * Cycles to the previous tab in the left pane.
 */
export function handlePrevTab(): void {
  if (tabsStore.tabs.length > 1) {
    const prevIndex =
      (tabsStore.activeTabIndex - 1 + tabsStore.tabs.length) % tabsStore.tabs.length;
    switchTab(prevIndex);
  }
}
