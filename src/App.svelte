<script lang="ts">
  // Minimal MD Editor - Svelte 5 Migration
  // Phase 9: Sync & Persistence
  import { onMount, onDestroy } from 'svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import EditorPane from '$lib/components/EditorPane.svelte';
  import PaneResizer from '$lib/components/PaneResizer.svelte';
  import VaultPicker from '$lib/components/VaultPicker.svelte';
  import { on, emit, type AppEvents } from '$lib/utils/eventBus';
  import { vault, openVault, getIsVaultOpen } from '$lib/stores/vault.svelte';
  import { settings, loadSettings } from '$lib/stores/settings.svelte';
  import {
    editor,
    openFileInPane,
    updatePaneContent,
    markPaneClean,
    getFocusedPane,
    type PaneId,
  } from '$lib/stores/editor.svelte';
  import {
    tabsStore,
    getActiveTab,
    addTab,
    replaceCurrentTab,
    removeTab,
    switchTab,
    updateTabContent,
    markTabClean,
    findTabByPath,
    getTabsFromStorage,
    setTabs,
    saveTabsToStorage,
  } from '$lib/stores/tabs.svelte';
  import { createTab, type Tab } from '$lib/types/tabs';
  import { writeToFile, getRelativePath } from '$lib/utils/fileOperations';
  import {
    savePaneWidth,
    getPaneWidth,
    getDirectoryHandle,
    saveLastOpenFile,
    getLastOpenFile,
  } from '$lib/utils/filesystem';
  import { getOrCreateDailyNote } from '$lib/utils/dailyNotes';
  import {
    buildTagIndex,
    updateFileInIndex,
    removeFileFromIndex,
    renameFileInIndex,
    initializeFuseFromIndex,
  } from '$lib/utils/tags';
  import {
    setIndexing,
    loadTagIndexFromStorage,
    isIndexBuilt,
  } from '$lib/stores/tags.svelte';
  import {
    processSync,
    cleanupTempExports,
    getSyncMode,
    isDailyNote,
    parseDailyNotePath,
    isDailyNoteModified,
    SYNC_MODES,
  } from '$lib/utils/sync';
  import { updateFrontmatterKey } from '$lib/utils/frontmatter';
  import { isTestMode, getMockVaultHandle } from '$lib/utils/mockFilesystem';

  // Event bus subscriptions
  let unsubscribers: (() => void)[] = [];

  // Pane width state (percentage for left pane)
  let leftPaneWidthPercent = $state(50);

  // Vault restoration state
  let isRestoringVault = $state(true); // Start true to avoid flash of VaultPicker

  // Component references
  let leftPaneComponent: EditorPane | null = $state(null);
  let rightPaneComponent: EditorPane | null = $state(null);
  let sidebarComponent: Sidebar | null = $state(null);

  onMount(async () => {
    // Load settings first
    loadSettings();

    // Restore pane width from localStorage
    const savedWidth = await getPaneWidth();
    if (savedWidth) {
      leftPaneWidthPercent = savedWidth;
    }

    // Try to auto-restore vault if configured
    if (settings.autoOpenLastDirectory) {
      await tryRestoreVault();
    } else {
      isRestoringVault = false;
    }

    // Listen for file:open events from FileTree and QuickFiles
    unsubscribers.push(
      on('file:open', async (data: AppEvents['file:open']) => {
        const pane = data.pane ?? 'left';
        if (pane === 'left') {
          await handleFileOpenInTabs(data.path, data.openInNewTab ?? false);
        } else {
          await handleFileOpen(data.path, pane);
        }
      })
    );

    // Listen for file:save events
    unsubscribers.push(
      on('file:save', async (data: AppEvents['file:save']) => {
        await handleFileSave(data.pane);
      })
    );

    // Listen for file:renamed events - update tag index
    unsubscribers.push(
      on('file:renamed', (data: AppEvents['file:renamed']) => {
        renameFileInIndex(data.oldPath, data.newPath);
      })
    );

    // Listen for file:deleted events - update tag index
    unsubscribers.push(
      on('file:deleted', (data: AppEvents['file:deleted']) => {
        removeFileFromIndex(data.path);
      })
    );

    // Listen for daily note open events
    unsubscribers.push(
      on('dailynote:open', async (data: AppEvents['dailynote:open']) => {
        await handleDailyNoteOpen(data.date);
      })
    );

    // Register keyboard shortcuts
    window.addEventListener('keydown', handleKeydown);
  });

  // Auto-save tabs when they change
  $effect(() => {
    // Track tabs and active index for persistence
    const tabs = tabsStore.tabs;
    const activeIndex = tabsStore.activeTabIndex;

    // Only persist if we have tabs
    if (tabs.length > 0) {
      saveTabsToStorage();
    }
  });

  // Save last open file when active tab changes
  $effect(() => {
    const activeTab = getActiveTab();
    if (activeTab?.relativePath) {
      saveLastOpenFile(activeTab.relativePath);
    }
  });

  /**
   * Try to restore the previously opened vault (auto-restore on load)
   */
  async function tryRestoreVault() {
    // In test mode, auto-open mock vault
    if (isTestMode()) {
      const mockHandle = getMockVaultHandle();
      openVault(mockHandle);
      await onVaultOpened();
      return;
    }

    try {
      const savedHandle = await getDirectoryHandle();
      if (!savedHandle) {
        isRestoringVault = false;
        return;
      }

      // Request permission - this may require user interaction
      const permission = await savedHandle.requestPermission({ mode: 'readwrite' });
      if (permission === 'granted') {
        openVault(savedHandle);
        await onVaultOpened();
      } else {
        // Permission denied, show VaultPicker
        isRestoringVault = false;
      }
    } catch (err) {
      console.error('Failed to restore vault:', err);
      isRestoringVault = false;
    }
  }

  /**
   * Called after vault is opened (new or restored)
   */
  async function onVaultOpened() {
    isRestoringVault = false;

    if (!vault.rootDirHandle) return;

    // Run sync cleanup
    try {
      const deleted = await cleanupTempExports(
        vault.rootDirHandle,
        vault.syncDirectory,
        settings.syncTempLimit
      );
      if (deleted > 0) {
        console.log(`Sync: Cleaned up ${deleted} old temporary export(s)`);
      }
    } catch (err) {
      console.error('Sync cleanup error:', err);
    }

    // Initialize tag index
    await initializeTagIndex();

    // Restore tabs
    await restoreTabs();

    // Open today's note if configured
    if (settings.autoOpenTodayNote) {
      await handleDailyNoteOpen(new Date());
    }
  }

  /**
   * Restore tabs from localStorage
   */
  async function restoreTabs() {
    const storedTabs = getTabsFromStorage();
    if (!storedTabs || storedTabs.tabs.length === 0) return;

    // Re-open each stored tab
    for (const tabData of storedTabs.tabs) {
      try {
        await handleFileOpenInTabs(tabData.relativePath, true);
      } catch (err) {
        console.error('Failed to restore tab:', tabData.relativePath, err);
      }
    }

    // Switch to the previously active tab
    if (storedTabs.activeIndex >= 0 && storedTabs.activeIndex < tabsStore.tabs.length) {
      switchTab(storedTabs.activeIndex);
    }
  }

  /**
   * Initialize tag index - load from storage or build from vault
   */
  async function initializeTagIndex() {
    // Try to load from localStorage
    const loaded = loadTagIndexFromStorage();
    if (loaded) {
      // Initialize Fuse.js with loaded index
      initializeFuseFromIndex();
      console.log('Tag index loaded from storage');
      return;
    }

    // No stored index, build from vault if open
    if (vault.rootDirHandle) {
      await buildTagIndexAsync();
    }
  }

  /**
   * Build tag index with loading state
   */
  async function buildTagIndexAsync() {
    if (!vault.rootDirHandle) return;

    setIndexing(true);
    try {
      await buildTagIndex(vault.rootDirHandle);
      console.log('Tag index built');
    } catch (err) {
      console.error('Failed to build tag index:', err);
    } finally {
      setIndexing(false);
    }
  }

  onDestroy(() => {
    // Cleanup event bus subscriptions
    unsubscribers.forEach((unsubscribe) => unsubscribe());

    // Remove keyboard listener
    window.removeEventListener('keydown', handleKeydown);
  });

  /**
   * Load a file by path and return handles + content
   */
  async function loadFile(relativePath: string): Promise<{
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
  async function handleFileOpenInTabs(relativePath: string, openInNewTab: boolean) {
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
   * Open a file by path in the right pane (single-file mode)
   */
  async function handleFileOpen(relativePath: string, pane: PaneId) {
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
  async function handleDailyNoteOpen(date: Date) {
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

  /**
   * Handle date selection from calendar.
   */
  function handleDateSelect(date: Date) {
    emit('dailynote:open', { date });
  }

  /**
   * Save the file in the specified pane
   */
  async function handleFileSave(pane: PaneId) {
    if (pane === 'left') {
      // Use tabs for left pane
      const activeTab = getActiveTab();
      if (!activeTab || !activeTab.isDirty) {
        return;
      }

      let content = activeTab.editorContent;
      const relativePath = activeTab.relativePath;

      // Auto-upgrade daily notes from delete to temporary when modified
      if (relativePath && isDailyNote(relativePath, vault.dailyNotesFolder)) {
        const syncMode = getSyncMode(content);
        if (syncMode === SYNC_MODES.DELETE || syncMode === null) {
          const date = parseDailyNotePath(relativePath);
          if (date && isDailyNoteModified(content, date)) {
            content = updateFrontmatterKey(content, 'sync', 'temporary');
            updateTabContent(tabsStore.activeTabIndex, content);
          }
        }
      }

      try {
        await writeToFile(activeTab.fileHandle, content);
        markTabClean(tabsStore.activeTabIndex, content);
        console.log('File saved:', activeTab.filename);

        // Update tag index after save
        if (relativePath) {
          updateFileInIndex(relativePath, content);
        }

        // Process sync
        if (relativePath && vault.rootDirHandle) {
          const result = await processSync(
            relativePath,
            content,
            vault.rootDirHandle,
            vault.syncDirectory
          );
          if (result.action !== 'none') {
            console.log(`Sync: ${result.action} - ${result.path}`);
          }

          // Cleanup after each save
          await cleanupTempExports(
            vault.rootDirHandle,
            vault.syncDirectory,
            settings.syncTempLimit
          );
        }
      } catch (err) {
        console.error('Failed to save file:', err);
      }
    } else {
      // Use editor store for right pane (daily notes)
      const state = editor[pane];
      if (!state.fileHandle || !state.isDirty) {
        return;
      }

      let content = state.content;
      const relativePath = state.relativePath;

      // Auto-upgrade daily notes from delete to temporary when modified
      if (relativePath && isDailyNote(relativePath, vault.dailyNotesFolder)) {
        const syncMode = getSyncMode(content);
        if (syncMode === SYNC_MODES.DELETE || syncMode === null) {
          const date = parseDailyNotePath(relativePath);
          if (date && isDailyNoteModified(content, date)) {
            content = updateFrontmatterKey(content, 'sync', 'temporary');
            updatePaneContent(pane, content);
          }
        }
      }

      try {
        await writeToFile(state.fileHandle, content);
        markPaneClean(pane, content);
        console.log('File saved:', state.fileHandle.name);

        // Update tag index after save
        if (relativePath) {
          updateFileInIndex(relativePath, content);
        }

        // Process sync
        if (relativePath && vault.rootDirHandle) {
          const result = await processSync(
            relativePath,
            content,
            vault.rootDirHandle,
            vault.syncDirectory
          );
          if (result.action !== 'none') {
            console.log(`Sync: ${result.action} - ${result.path}`);
          }

          // Cleanup after each save
          await cleanupTempExports(
            vault.rootDirHandle,
            vault.syncDirectory,
            settings.syncTempLimit
          );
        }
      } catch (err) {
        console.error('Failed to save file:', err);
      }
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  function handleKeydown(event: KeyboardEvent) {
    const isMod = event.metaKey || event.ctrlKey;

    // Cmd/Ctrl+S - Save
    if (isMod && event.key === 's') {
      event.preventDefault();
      const focused = getFocusedPane();
      if (focused) {
        emit('file:save', { pane: focused });
      } else {
        // Save both panes if neither is focused
        const activeTab = getActiveTab();
        if (activeTab?.isDirty) emit('file:save', { pane: 'left' });
        if (editor.right.isDirty) emit('file:save', { pane: 'right' });
      }
    }

    // Cmd/Ctrl+E - Toggle view mode
    if (isMod && event.key === 'e') {
      event.preventDefault();
      const focused = getFocusedPane();
      if (focused === 'left') {
        leftPaneComponent?.toggleViewMode();
      } else if (focused === 'right') {
        rightPaneComponent?.toggleViewMode();
      }
    }

    // Cmd/Ctrl+W - Close current tab (left pane only)
    if (isMod && event.key === 'w') {
      event.preventDefault();
      const focused = getFocusedPane();
      if (focused === 'left' && tabsStore.tabs.length > 0) {
        removeTab(tabsStore.activeTabIndex);
      }
    }

    // Cmd/Ctrl+Tab - Next tab
    if (isMod && event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault();
      if (tabsStore.tabs.length > 1) {
        const nextIndex = (tabsStore.activeTabIndex + 1) % tabsStore.tabs.length;
        switchTab(nextIndex);
      }
    }

    // Cmd/Ctrl+Shift+Tab - Previous tab
    if (isMod && event.key === 'Tab' && event.shiftKey) {
      event.preventDefault();
      if (tabsStore.tabs.length > 1) {
        const prevIndex = (tabsStore.activeTabIndex - 1 + tabsStore.tabs.length) % tabsStore.tabs.length;
        switchTab(prevIndex);
      }
    }

    // Daily note navigation (only when right pane is focused)
    const focused = getFocusedPane();
    if (focused === 'right' && isMod) {
      // Cmd/Ctrl+Left - Previous day
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        sidebarComponent?.navigateCalendar(-1);
      }

      // Cmd/Ctrl+Right - Next day
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        sidebarComponent?.navigateCalendar(1);
      }

      // Cmd/Ctrl+Up - Previous week
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        sidebarComponent?.navigateCalendar(-7);
      }

      // Cmd/Ctrl+Down - Next week
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        sidebarComponent?.navigateCalendar(7);
      }
    }
  }

  /**
   * Handle pane resize
   */
  function handlePaneResize(leftWidthPercent: number) {
    leftPaneWidthPercent = leftWidthPercent;
    savePaneWidth(leftWidthPercent);
  }

  /**
   * Handle content change from left editor pane (tabs mode)
   */
  function handleLeftContentChange(content: string) {
    if (tabsStore.activeTabIndex >= 0) {
      updateTabContent(tabsStore.activeTabIndex, content);
    }
  }

  /**
   * Handle content change from right editor pane (single mode)
   */
  function handleRightContentChange(content: string) {
    updatePaneContent('right', content);
  }
</script>

{#if isRestoringVault}
  <!-- Show nothing while checking for stored vault -->
  <div class="app loading" data-testid="app-loading"></div>
{:else if !getIsVaultOpen()}
  <VaultPicker onopen={onVaultOpened} />
{:else}
  <div class="app" data-testid="app-container">
    <Sidebar bind:this={sidebarComponent} ondateselect={handleDateSelect} />

    <main class="editor-area" data-testid="editor-area">
      <div class="pane left-pane" style="flex: {leftPaneWidthPercent}" data-testid="left-pane">
        <EditorPane
          bind:this={leftPaneComponent}
          pane="left"
          mode="tabs"
          oncontentchange={handleLeftContentChange}
        />
      </div>

      <PaneResizer onresize={handlePaneResize} />

      <div class="pane right-pane" style="flex: {100 - leftPaneWidthPercent}" data-testid="right-pane">
        <EditorPane
          bind:this={rightPaneComponent}
          pane="right"
          mode="single"
          filename={editor.right.fileHandle?.name ?? ''}
          content={editor.right.content}
          isDirty={editor.right.isDirty}
          oncontentchange={handleRightContentChange}
        />
      </div>
    </main>
  </div>
{/if}

<style>
  .app {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .app.loading {
    background: var(--bg-color, #1e1e1e);
  }

  .editor-area {
    flex: 1;
    display: flex;
    min-width: 0;
  }

  .pane {
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: var(--editor-bg, #1e1e1e);
  }
</style>
