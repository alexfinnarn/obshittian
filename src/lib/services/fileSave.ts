/**
 * File save service - handles saving files with tag index updates
 */

import {
  editor,
  markPaneClean,
  type PaneId,
} from '$lib/stores/editor.svelte';
import {
  tabsStore,
  getActiveTab,
  markTabClean,
} from '$lib/stores/tabs.svelte';
import { writeToFile } from '$lib/utils/fileOperations';
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
  const relativePath = activeTab.relativePath;

  try {
    await writeToFile(activeTab.fileHandle, content);
    markTabClean(tabsStore.activeTabIndex, content);
    console.log('File saved:', activeTab.filename);

    // Update tag index after save
    if (relativePath) {
      updateFileInIndex(relativePath, content);
    }
  } catch (err) {
    console.error('Failed to save file:', err);
  }
}

/**
 * Save the file in the right pane (single file mode)
 */
async function saveRightPane(): Promise<void> {
  const state = editor.right;
  if (!state.fileHandle || !state.isDirty) {
    return;
  }

  const content = state.content;
  const relativePath = state.relativePath;

  try {
    await writeToFile(state.fileHandle, content);
    markPaneClean('right', content);
    console.log('File saved:', state.fileHandle.name);

    // Update tag index after save
    if (relativePath) {
      updateFileInIndex(relativePath, content);
    }
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
