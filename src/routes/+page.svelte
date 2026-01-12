<script lang="ts">
  // Minimal MD Editor - Svelte 5 Migration
  import { onMount, onDestroy } from 'svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import EditorPane from '$lib/components/EditorPane.svelte';
  import PaneResizer from '$lib/components/PaneResizer.svelte';
  import VaultPicker from '$lib/components/VaultPicker.svelte';
  import JournalPane from '$lib/components/JournalPane.svelte';
  import MobileNav, { type MobileView } from '$lib/components/MobileNav.svelte';
  import { on, emit, type AppEvents } from '$lib/utils/eventBus';
  import { vault, openVault, getIsVaultOpen } from '$lib/stores/vault.svelte';
  import { settings, loadSettings } from '$lib/stores/settings.svelte';
  import {
    tabsStore,
    getActiveTab,
    switchTab,
    updateTabContent,
    getTabsFromStorage,
    saveTabsToStorage,
    revertTabContent,
  } from '$lib/stores/tabs.svelte';
  import { shortcut } from '$lib/actions/shortcut';
  import {
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
  import { openFileInTabs } from '$lib/services/fileOpen';
  import { saveFile } from '$lib/services/fileSave';
  import { fileService } from '$lib/services/fileService';
  import { logActivity } from '$lib/services/activityLogger';

  // Event bus subscriptions
  let unsubscribers: (() => void)[] = [];

  // Pane width state (percentage for left pane)
  let leftPaneWidthPercent = $state(50);

  // Vault restoration state
  let isRestoringVault = $state(true); // Start true to avoid flash of VaultPicker

  // Mobile layout state
  const MOBILE_BREAKPOINT = 768;
  let isMobile = $state(false);
  let mobileView = $state<MobileView>('journal'); // Default to journal on mobile


  onMount(async () => {
    // Detect mobile on mount and window resize
    function checkMobile() {
      isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    }
    checkMobile();
    window.addEventListener('resize', checkMobile);
    unsubscribers.push(() => window.removeEventListener('resize', checkMobile));

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
        await openFileInTabs(data.path, data.openInNewTab ?? false);
        // On mobile, switch to editor view after opening a file
        if (isMobile) {
          mobileView = 'editor';
        }
      })
    );

    // Listen for file:save events
    unsubscribers.push(
      on('file:save', async () => {
        await saveFile();
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

      // Log activity
      logActivity('vault.opened', { path: data.path, source: 'restored' });

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
    // On mobile, switch to journal view after selecting a date
    if (isMobile) {
      mobileView = 'journal';
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
   * Handle save from left editor pane
   */
  function handleLeftPaneSave() {
    emit('file:save', { pane: 'left' });
  }

  /**
   * Handle cancel (revert) from left editor pane
   */
  function handleLeftPaneCancel() {
    if (tabsStore.activeTabIndex >= 0) {
      revertTabContent(tabsStore.activeTabIndex);
    }
  }

  /**
   * Handle mobile view change from bottom nav
   */
  function handleMobileViewChange(view: MobileView) {
    mobileView = view;
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
    class:mobile={isMobile}
    data-testid="app-container"
    use:shortcut={{ binding: 'toggleView', handler: handleToggleView }}
    use:shortcut={{ binding: 'closeTab', handler: handleCloseTab }}
    use:shortcut={{ binding: 'nextTab', handler: handleNextTab }}
    use:shortcut={{ binding: 'prevTab', handler: handlePrevTab }}
  >
    {#if isMobile}
      <!-- Mobile layout: all panes mounted, CSS controls visibility -->
      <main class="mobile-content" data-testid="mobile-content">
        <div class="mobile-pane" class:active={mobileView === 'sidebar'} data-testid="mobile-sidebar">
          <Sidebar ondateselect={handleDateSelect} />
        </div>
        <div class="mobile-pane" class:active={mobileView === 'editor'} data-testid="mobile-editor">
          <EditorPane
            initialViewMode="view"
            oncontentchange={handleLeftContentChange}
            onsave={handleLeftPaneSave}
            oncancel={handleLeftPaneCancel}
          />
        </div>
        <div class="mobile-pane" class:active={mobileView === 'journal'} data-testid="mobile-journal">
          <JournalPane />
        </div>
      </main>
      <MobileNav activeView={mobileView} onviewchange={handleMobileViewChange} />
    {:else}
      <!-- Desktop layout: sidebar + dual panes -->
      <Sidebar ondateselect={handleDateSelect} />

      <main class="editor-area" data-testid="editor-area">
        <div class="pane left-pane" style="flex: {leftPaneWidthPercent}" data-testid="left-pane">
          <EditorPane
            initialViewMode="view"
            oncontentchange={handleLeftContentChange}
            onsave={handleLeftPaneSave}
            oncancel={handleLeftPaneCancel}
          />
        </div>

        <PaneResizer onresize={handlePaneResize} />

        <div class="pane right-pane" style="flex: {100 - leftPaneWidthPercent}" data-testid="right-pane">
          <JournalPane />
        </div>
      </main>
    {/if}
  </div>
{/if}

<style>
  .app {
    display: flex;
    height: 100vh;
    height: 100dvh; /* Dynamic viewport for mobile */
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

  /* Mobile layout */
  .app.mobile {
    flex-direction: column;
  }

  .mobile-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    /* Leave room for bottom nav */
    padding-bottom: var(--mobile-nav-height, 56px);
  }

  .mobile-pane {
    display: none;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .mobile-pane.active {
    display: flex;
    position: relative;
    flex: 1;
  }

  /* Make sidebar fill available space on mobile */
  .mobile-pane :global(.sidebar) {
    width: 100%;
    max-width: none;
    min-width: 0;
  }
</style>
