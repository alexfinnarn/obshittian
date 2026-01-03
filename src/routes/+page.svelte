<script lang="ts">
  // Minimal MD Editor - Svelte 5 Migration
  import { onMount, onDestroy } from 'svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import EditorPane from '$lib/components/EditorPane.svelte';
  import PaneResizer from '$lib/components/PaneResizer.svelte';
  import VaultPicker from '$lib/components/VaultPicker.svelte';
  import JournalPane from '$lib/components/JournalPane.svelte';
  import { on, type AppEvents } from '$lib/utils/eventBus';
  import { vault, openVault, getIsVaultOpen } from '$lib/stores/vault.svelte';
  import { settings, loadSettings } from '$lib/stores/settings.svelte';
  import {
    tabsStore,
    getActiveTab,
    switchTab,
    updateTabContent,
    getTabsFromStorage,
    saveTabsToStorage,
  } from '$lib/stores/tabs.svelte';
  import { shortcut } from '$lib/actions/shortcut';
  import {
    handleSave,
    handleToggleView,
    handleCloseTab,
    handleNextTab,
    handlePrevTab,
  } from '$lib/services/shortcutHandlers';
  import {
    savePaneWidth,
    getPaneWidth,
    getVaultPath,
    saveLastOpenFile,
  } from '$lib/utils/filesystem';
  import {
    buildTagIndex,
    removeFileFromIndex,
    renameFileInIndex,
    initializeFuseFromIndex,
  } from '$lib/utils/tags';
  import {
    setIndexing,
    loadTagIndexFromStorage,
  } from '$lib/stores/tags.svelte';
  import { loadVaultConfig } from '$lib/stores/vaultConfig.svelte';
  import {
    journalStore,
    loadEntriesForDate,
    scanDatesWithEntries,
  } from '$lib/stores/journal.svelte';
  import { loadTagVocabulary } from '$lib/stores/tagVocabulary.svelte';
  import { openFileInTabs, openFileInSinglePane } from '$lib/services/fileOpen';
  import { saveFile } from '$lib/services/fileSave';
  import { fileService } from '$lib/services/fileService';

  // Event bus subscriptions
  let unsubscribers: (() => void)[] = [];

  // Pane width state (percentage for left pane)
  let leftPaneWidthPercent = $state(50);

  // Vault restoration state
  let isRestoringVault = $state(true); // Start true to avoid flash of VaultPicker


  onMount(async () => {
    // Load settings first
    loadSettings();

    // Restore pane width from localStorage
    const savedWidth = getPaneWidth();
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
          await openFileInTabs(data.path, data.openInNewTab ?? false);
        } else {
          await openFileInSinglePane(data.path, pane);
        }
      })
    );

    // Listen for file:save events
    unsubscribers.push(
      on('file:save', async (data: AppEvents['file:save']) => {
        await saveFile(data.pane);
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

    // Listen for journal:scrollToEntry events from TagSearch
    unsubscribers.push(
      on('journal:scrollToEntry', async (data: AppEvents['journal:scrollToEntry']) => {
        // Parse the date string to a Date object
        const [year, month, day] = data.date.split('-').map(Number);
        const date = new Date(year, month - 1, day);

        // Load entries for that date
        await loadEntriesForDate(date);

        // Scroll to the specific entry after a brief delay for DOM update
        setTimeout(() => {
          const entryElement = document.querySelector(
            `[data-testid="journal-entry-${data.entryId}"]`
          );
          if (entryElement) {
            entryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      })
    );

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
    if (activeTab?.filePath) {
      saveLastOpenFile(activeTab.filePath);
    }
  });

  /**
   * Try to restore the previously opened vault (auto-restore on load)
   */
  async function tryRestoreVault() {
    try {
      const savedPath = getVaultPath();
      if (!savedPath) {
        isRestoringVault = false;
        return;
      }

      // Validate with server to set process.env.VAULT_PATH
      const response = await fetch('/api/vault/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: savedPath }),
      });

      if (!response.ok) {
        console.error('Saved vault path is no longer valid');
        isRestoringVault = false;
        return;
      }

      const data = await response.json();

      // Set the vault path and initialize fileService
      openVault(data.path);
      fileService.setVaultPath(data.path);
      await onVaultOpened();
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

    if (!vault.path) return;

    // Load vault config (Quick Links, Quick Files) from .editor-config.json
    // Falls back to defaults from src/lib/config.ts via settings store
    await loadVaultConfig({
      quickLinks: settings.defaultQuickLinks,
      quickFiles: settings.defaultQuickFiles,
    });

    // Scan for journal files (for calendar indicators)
    await scanDatesWithEntries();

    // Initialize tag index
    await initializeTagIndex();

    // Load tag vocabulary for autocomplete (after tag index is ready)
    await loadTagVocabulary();

    // Restore tabs
    await restoreTabs();

    // Open today's journal if configured
    if (settings.autoOpenTodayNote) {
      await loadEntriesForDate(new Date());
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
        await openFileInTabs(tabData.filePath, true);
      } catch (err) {
        console.error('Failed to restore tab:', tabData.filePath, err);
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
    if (vault.path) {
      await buildTagIndexAsync();
    }
  }

  /**
   * Build tag index with loading state
   */
  async function buildTagIndexAsync() {
    if (!vault.path) return;

    setIndexing(true);
    try {
      await buildTagIndex(vault.dailyNotesFolder);
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
  });

  /**
   * Handle date selection from calendar.
   */
  function handleDateSelect(date: Date) {
    loadEntriesForDate(date);
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

</script>

{#if isRestoringVault}
  <!-- Show nothing while checking for stored vault -->
  <div class="app loading" data-testid="app-loading"></div>
{:else if !getIsVaultOpen()}
  <VaultPicker onopen={onVaultOpened} />
{:else}
  <div
    class="app"
    data-testid="app-container"
    use:shortcut={{ binding: 'save', handler: handleSave }}
    use:shortcut={{ binding: 'toggleView', handler: handleToggleView }}
    use:shortcut={{ binding: 'closeTab', handler: handleCloseTab }}
    use:shortcut={{ binding: 'nextTab', handler: handleNextTab }}
    use:shortcut={{ binding: 'prevTab', handler: handlePrevTab }}
  >
    <Sidebar ondateselect={handleDateSelect} />

    <main class="editor-area" data-testid="editor-area">
      <div class="pane left-pane" style="flex: {leftPaneWidthPercent}" data-testid="left-pane">
        <EditorPane
          pane="left"
          mode="tabs"
          initialViewMode="view"
          oncontentchange={handleLeftContentChange}
        />
      </div>

      <PaneResizer onresize={handlePaneResize} />

      <div class="pane right-pane" style="flex: {100 - leftPaneWidthPercent}" data-testid="right-pane">
        <JournalPane />
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
