/**
 * File opening service - handles loading and opening files in panes/tabs
 */

import { vault } from '$lib/stores/vault.svelte';
import {
  openFileInPane,
  type PaneId,
} from '$lib/stores/editor.svelte';
import {
  addTab,
  replaceCurrentTab,
  switchTab,
  findTabByPath,
} from '$lib/stores/tabs.svelte';
import { createTab } from '$lib/types/tabs';
import { getOrCreateDailyNote } from '$lib/utils/dailyNotes';
import { emit } from '$lib/utils/eventBus';

/**
 * Load a file by relative path and return handles + content
 */
export async function loadFile(relativePath: string): Promise<{
  fileHandle: FileSystemFileHandle;
  dirHandle: FileSystemDirectoryHandle;
  content: string;
}> {
  if (!vault.rootDirHandle) {
    throw new Error('No vault open');
  }

  const pathParts = relativePath.split('/');
  const filename = pathParts.pop()!;
  let currentDir = vault.rootDirHandle;

  for (const part of pathParts) {
    currentDir = await currentDir.getDirectoryHandle(part);
  }

  const fileHandle = await currentDir.getFileHandle(filename);
  const file = await fileHandle.getFile();
  const content = await file.text();

  return { fileHandle, dirHandle: currentDir, content };
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
    const { fileHandle, dirHandle, content } = await loadFile(relativePath);

    // Create tab
    const tab = createTab(fileHandle, dirHandle, content, relativePath);

    if (openInNewTab) {
      // Add as new tab
      addTab(tab);
    } else {
      // Replace current tab
      replaceCurrentTab(tab);
    }
  } catch (err) {
    console.error('Failed to open file:', err);
  }
}

/**
 * Open a file by path in a specific pane (single-file mode)
 */
export async function openFileInSinglePane(relativePath: string, pane: PaneId): Promise<void> {
  try {
    const { fileHandle, dirHandle, content } = await loadFile(relativePath);
    openFileInPane(pane, fileHandle, dirHandle, content, relativePath);
  } catch (err) {
    console.error('Failed to open file:', err);
  }
}

/**
 * Open a daily note for the given date in the right pane.
 */
export async function openDailyNote(date: Date): Promise<void> {
  if (!vault.rootDirHandle) {
    console.error('No vault open');
    return;
  }

  try {
    const { fileHandle, dirHandle, relativePath, content, isNew } =
      await getOrCreateDailyNote(
        vault.rootDirHandle,
        vault.dailyNotesFolder,
        date
      );

    // Open in right pane (single-file mode for daily notes)
    openFileInPane('right', fileHandle, dirHandle, content, relativePath);

    if (isNew) {
      emit('file:created', { path: relativePath });
      // Refresh file tree to show the new file
      emit('tree:refresh', undefined as unknown as void);
    }
  } catch (err) {
    console.error('Failed to open daily note:', err);
  }
}
