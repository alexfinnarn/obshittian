/**
 * File save service - handles saving files with tag index updates
 */

import { editor, markPaneClean, type PaneId } from '$lib/stores/editor.svelte';
import { tabsStore, getActiveTab, markTabClean } from '$lib/stores/tabs.svelte';
import { fileService } from './fileService';
import { updateFileInIndex } from '$lib/utils/tags';

/**
 * Save the file in the left pane (tabs mode)
 */
async function saveLeftPane(): Promise<void> {
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

    // Update tag index after save
    updateFileInIndex(filePath, content);
  } catch (err) {
    console.error('Failed to save file:', err);
  }
}

/**
 * Save the file in the right pane (single file mode)
 */
async function saveRightPane(): Promise<void> {
  const state = editor.right;
  if (!state.filePath || !state.isDirty) {
    return;
  }

  const content = state.content;
  const filePath = state.filePath;

  try {
    await fileService.writeFile(filePath, content);
    markPaneClean('right', content);
    const filename = filePath.split('/').pop() ?? filePath;
    console.log('File saved:', filename);

    // Update tag index after save
    updateFileInIndex(filePath, content);
  } catch (err) {
    console.error('Failed to save file:', err);
  }
}

/**
 * Save the file in the specified pane
 */
export async function saveFile(pane: PaneId): Promise<void> {
  if (pane === 'left') {
    await saveLeftPane();
  } else {
    await saveRightPane();
  }
}
