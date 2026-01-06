/**
 * File opening service - handles loading and opening files in tabs
 */

import { vault } from '$lib/stores/vault.svelte';
import { addTab, replaceCurrentTab, switchTab, findTabByPath } from '$lib/stores/tabs.svelte';
import { createTab } from '$lib/types/tabs';
import { fileService } from './fileService';
import { logActivity } from './activityLogger';

/**
 * Load a file by relative path and return content
 */
export async function loadFile(relativePath: string): Promise<{
  content: string;
}> {
  if (!vault.path) {
    throw new Error('No vault open');
  }

  const content = await fileService.readFile(relativePath);
  return { content };
}

/**
 * Open a file in the left pane using tabs
 * @param relativePath - Path to file from vault root
 * @param openInNewTab - If true, always open in new tab. If false, replace current tab.
 */
export async function openFileInTabs(relativePath: string, openInNewTab: boolean): Promise<void> {
  try {
    // Check if already open
    const existingIndex = findTabByPath(relativePath);
    if (existingIndex >= 0) {
      switchTab(existingIndex);
      return;
    }

    // Load file content
    const { content } = await loadFile(relativePath);

    // Create tab
    const tab = createTab(relativePath, content);

    if (openInNewTab) {
      // Add as new tab
      addTab(tab);
    } else {
      // Replace current tab
      replaceCurrentTab(tab);
    }

    // Log activity
    logActivity('file.opened', {
      path: relativePath,
      source: openInNewTab ? 'tree' : 'tab',
    });
  } catch (err) {
    console.error('Failed to open file:', err);
  }
}

