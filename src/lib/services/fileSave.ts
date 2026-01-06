/**
 * File save service - handles saving files with tag index updates
 */

import { tabsStore, getActiveTab, markTabClean } from '$lib/stores/tabs.svelte';
import { fileService } from './fileService';
import { updateFileInIndex } from '$lib/utils/tags';
import { logActivity } from './activityLogger';

/**
 * Save the active tab file
 */
export async function saveFile(): Promise<void> {
  const activeTab = getActiveTab();
  if (!activeTab || !activeTab.isDirty) {
    return;
  }

  const content = activeTab.editorContent;
  const filePath = activeTab.filePath;

  try {
    await fileService.writeFile(filePath, content);
    markTabClean(tabsStore.activeTabIndex, content);
    console.log('File saved:', activeTab.filename);

    // Log activity
    logActivity('file.saved', {
      path: filePath,
      sizeBytes: content.length,
    });

    // Update tag index after save
    updateFileInIndex(filePath, content);
  } catch (err) {
    console.error('Failed to save file:', err);
  }
}
