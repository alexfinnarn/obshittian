# Phase 6: Tabs System

## Goal
Implement the tabbed interface for the left editor pane, allowing multiple files to be open simultaneously. The right pane remains in single-file mode for daily notes.

## Prerequisites
- Phase 5 complete (EditorPane, CodeMirrorEditor, editor store, file:open events)

## Tasks

### 6.1 Create Tab Types and Interfaces

Create `src/lib/types/tabs.ts`:

```typescript
export interface Tab {
  /** Unique identifier for the tab */
  id: string;
  /** File handle for the open file */
  fileHandle: FileSystemFileHandle;
  /** Directory handle for the file's parent */
  dirHandle: FileSystemDirectoryHandle;
  /** Saved content (last saved state) */
  savedContent: string;
  /** Current editor content (may differ if dirty) */
  editorContent: string;
  /** Whether the tab has unsaved changes */
  isDirty: boolean;
  /** Filename for display */
  filename: string;
  /** Relative path from vault root */
  relativePath: string;
}

export function createTab(
  fileHandle: FileSystemFileHandle,
  dirHandle: FileSystemDirectoryHandle,
  content: string,
  relativePath: string
): Tab;
```

### 6.2 Create Tabs Store

Create `src/lib/stores/tabs.svelte.ts`:

```typescript
import type { Tab } from '$lib/types/tabs';

interface TabsState {
  tabs: Tab[];
  activeTabIndex: number;
}

export const tabsStore = $state<TabsState>({
  tabs: [],
  activeTabIndex: -1,
});

// Tab limit (matches vanilla JS)
const TAB_LIMIT = 5;
const TABS_STORAGE_KEY = 'editorLeftPaneTabs';

// Core functions
export function getActiveTab(): Tab | null;
export function findTabByPath(relativePath: string): number;
export function addTab(tab: Tab): boolean;
export function removeTab(index: number, skipConfirmation?: boolean): boolean;
export function switchTab(index: number): void;
export function updateTabContent(index: number, content: string): void;
export function markTabDirty(index: number): void;
export function markTabClean(index: number, content: string): void;

// Persistence
export function saveTabsToStorage(): void;
export function getTabsFromStorage(): { tabs: TabStorageItem[]; activeIndex: number } | null;
export function clearTabsStorage(): void;

// For testing
export function resetTabsStore(): void;
```

Key behaviors:
- Maximum 5 tabs (configurable via TAB_LIMIT)
- When limit reached, close oldest non-dirty tab automatically
- If all tabs are dirty, prompt user for confirmation
- Switching tabs saves current editor state first
- Tab positions persist to localStorage (paths and active index)

### 6.3 Create Tab Component

Create `src/lib/components/Tab.svelte`:

```svelte
<script lang="ts">
  import type { Tab } from '$lib/types/tabs';

  interface Props {
    tab: Tab;
    isActive: boolean;
    onclose: () => void;
    onclick: () => void;
  }

  let { tab, isActive, onclose, onclick }: Props = $props();

  function handleClose(e: MouseEvent) {
    e.stopPropagation();
    onclose();
  }
</script>

<div
  class="tab"
  class:active={isActive}
  onclick={onclick}
  role="tab"
  aria-selected={isActive}
  data-testid="tab-{tab.id}"
>
  <span class="tab-filename" title={tab.filename}>{tab.filename}</span>
  {#if tab.isDirty}
    <span class="tab-unsaved" data-testid="tab-unsaved-{tab.id}">●</span>
  {/if}
  <button
    class="tab-close"
    onclick={handleClose}
    title="Close"
    aria-label="Close {tab.filename}"
    data-testid="tab-close-{tab.id}"
  >
    ×
  </button>
</div>
```

Features:
- Displays filename with tooltip for full name
- Unsaved indicator (●) when dirty
- Close button (×) with click handler
- Active state styling
- Accessible with ARIA attributes

### 6.4 Create TabBar Component

Create `src/lib/components/TabBar.svelte`:

```svelte
<script lang="ts">
  import Tab from './Tab.svelte';
  import { tabsStore, getActiveTab, switchTab, removeTab } from '$lib/stores/tabs.svelte';

  interface Props {
    ontabchange?: (tab: Tab | null) => void;
  }

  let { ontabchange }: Props = $props();

  function handleTabClick(index: number) {
    switchTab(index);
    ontabchange?.(getActiveTab());
  }

  function handleTabClose(index: number) {
    if (removeTab(index)) {
      ontabchange?.(getActiveTab());
    }
  }
</script>

<div class="tab-bar" role="tablist" data-testid="tab-bar">
  {#if tabsStore.tabs.length === 0}
    <span class="no-file-open">No file open</span>
  {:else}
    {#each tabsStore.tabs as tab, index (tab.id)}
      <Tab
        {tab}
        isActive={index === tabsStore.activeTabIndex}
        onclick={() => handleTabClick(index)}
        onclose={() => handleTabClose(index)}
      />
    {/each}
  {/if}
</div>
```

Features:
- Renders list of Tab components
- Shows "No file open" when empty
- Uses `each` with key for efficient updates
- Emits events on tab changes

### 6.5 Update EditorPane for Tabs Mode

Modify `src/lib/components/EditorPane.svelte` to support tabs mode:

```svelte
<script lang="ts">
  // ... existing imports
  import TabBar from './TabBar.svelte';
  import { tabsStore, getActiveTab } from '$lib/stores/tabs.svelte';

  interface Props {
    pane: PaneId;
    mode?: 'single' | 'tabs';  // NEW: mode prop
    // ... existing props for single mode
    filename?: string;
    content?: string;
    isDirty?: boolean;
    oncontentchange?: (content: string) => void;
  }

  let {
    pane,
    mode = 'single',
    filename = '',
    content = '',
    isDirty = false,
    oncontentchange,
  }: Props = $props();

  // Derive content from tabs store when in tabs mode
  const effectiveContent = $derived(
    mode === 'tabs' ? (getActiveTab()?.editorContent ?? '') : content
  );
  const effectiveFilename = $derived(
    mode === 'tabs' ? (getActiveTab()?.filename ?? '') : filename
  );
  const effectiveIsDirty = $derived(
    mode === 'tabs' ? (getActiveTab()?.isDirty ?? false) : isDirty
  );
</script>

<div class="editor-pane" data-testid="editor-pane-{pane}">
  {#if mode === 'tabs'}
    <TabBar ontabchange={handleTabChange} />
  {/if}

  <header class="pane-toolbar">
    <!-- ... existing toolbar, use effectiveFilename/effectiveIsDirty -->
  </header>

  <div class="pane-content">
    {#if viewMode === 'edit'}
      <CodeMirrorEditor
        content={effectiveContent}
        onchange={handleContentChange}
      />
    {:else}
      <MarkdownPreview content={effectiveContent} />
    {/if}
  </div>
</div>
```

### 6.6 Update App.svelte for Tabs Integration

Update `src/App.svelte`:

```svelte
<script lang="ts">
  // ... existing imports
  import {
    tabsStore,
    addTab,
    updateTabContent,
    markTabClean,
    getActiveTab,
    findTabByPath,
    switchTab,
    saveTabsToStorage,
    getTabsFromStorage,
  } from '$lib/stores/tabs.svelte';
  import { createTab } from '$lib/types/tabs';

  onMount(async () => {
    // ... existing setup

    // Restore tabs from storage
    await restoreTabsFromStorage();

    // Listen for file:open events
    unsubscribers.push(
      on('file:open', async (data: AppEvents['file:open']) => {
        const pane = data.pane ?? 'left';
        if (pane === 'left') {
          await handleFileOpenInTabs(data.path, data.openInNewTab);
        } else {
          await handleFileOpen(data.path, pane);
        }
      })
    );
  });

  async function handleFileOpenInTabs(relativePath: string, openInNewTab = false) {
    // Check if already open
    const existingIndex = findTabByPath(relativePath);
    if (existingIndex >= 0) {
      switchTab(existingIndex);
      return;
    }

    // Load file content
    const { fileHandle, dirHandle, content } = await loadFile(relativePath);

    // Create and add tab
    const tab = createTab(fileHandle, dirHandle, content, relativePath);
    addTab(tab);
  }

  function handleLeftContentChange(content: string) {
    const activeTab = getActiveTab();
    if (activeTab) {
      updateTabContent(tabsStore.activeTabIndex, content);
    }
  }

  async function handleFileSave(pane: PaneId) {
    if (pane === 'left') {
      const activeTab = getActiveTab();
      if (activeTab && activeTab.isDirty) {
        await writeToFile(activeTab.fileHandle, activeTab.editorContent);
        markTabClean(tabsStore.activeTabIndex, activeTab.editorContent);
      }
    } else {
      // ... existing right pane save logic
    }
  }
</script>

<main class="editor-area">
  <div class="pane left-pane">
    <EditorPane
      bind:this={leftPaneComponent}
      pane="left"
      mode="tabs"
      oncontentchange={handleLeftContentChange}
    />
  </div>

  <PaneResizer onresize={handlePaneResize} />

  <div class="pane right-pane">
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
```

### 6.7 Add Context Menu "Open in Tab" Action

Update the FileTree context menu to include "Open in Tab":

```typescript
// In FileTree.svelte context menu items
const contextMenuItems = [
  // ... existing items
  { label: 'Open in Tab', action: 'open-in-tab', disabled: isFolder },
];

// Handle the action
case 'open-in-tab':
  emit('file:open', { path: relativePath, pane: 'left', openInNewTab: true });
  break;
```

Update `src/lib/utils/eventBus.ts`:

```typescript
export interface AppEvents {
  'file:open': { path: string; pane?: 'left' | 'right'; openInNewTab?: boolean };
  // ... rest unchanged
}
```

### 6.8 Add Tab Persistence

Implement localStorage persistence for tabs:

```typescript
// In tabs.svelte.ts

interface TabStorageItem {
  relativePath: string;
  filename: string;
}

interface TabsStorageData {
  tabs: TabStorageItem[];
  activeIndex: number;
}

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

export function getTabsFromStorage(): TabsStorageData | null {
  const stored = localStorage.getItem(TABS_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// In App.svelte
async function restoreTabsFromStorage() {
  const stored = getTabsFromStorage();
  if (!stored || !vault.rootDirHandle) return;

  for (const item of stored.tabs) {
    try {
      const { fileHandle, dirHandle, content } = await loadFile(item.relativePath);
      const tab = createTab(fileHandle, dirHandle, content, item.relativePath);
      addTab(tab);
    } catch (err) {
      console.warn('Failed to restore tab:', item.relativePath, err);
    }
  }

  if (stored.activeIndex >= 0 && stored.activeIndex < tabsStore.tabs.length) {
    switchTab(stored.activeIndex);
  }
}
```

### 6.9 Add Keyboard Shortcuts for Tabs

Add tab navigation shortcuts:

```typescript
// In App.svelte handleKeydown

// Cmd/Ctrl+W - Close current tab
if (isMod && event.key === 'w') {
  event.preventDefault();
  if (getFocusedPane() === 'left' && tabsStore.tabs.length > 0) {
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
```

### 6.10 Write Tests

Create tests for:

**`tabs.svelte.test.ts`** - Tabs store:
- Initial state (empty tabs, activeTabIndex = -1)
- createTab() generates unique IDs
- addTab() adds and activates tab
- addTab() switches to existing tab if path matches
- addTab() enforces TAB_LIMIT
- removeTab() removes and adjusts active index
- switchTab() saves current content before switching
- markTabDirty/markTabClean updates state
- saveTabsToStorage/getTabsFromStorage persistence

**`Tab.test.ts`** - Tab component:
- Renders filename
- Shows unsaved indicator when dirty
- Calls onclick when tab clicked
- Calls onclose when close button clicked
- Has correct ARIA attributes

**`TabBar.test.ts`** - TabBar component:
- Shows "No file open" when empty
- Renders correct number of tabs
- Highlights active tab
- Calls ontabchange when switching

**`EditorPane.test.ts`** (update):
- Tabs mode shows TabBar
- Single mode does not show TabBar
- Content derives from tabs store in tabs mode

### 6.11 Verify Integration

- Single click in FileTree opens file in current tab (replaces)
- "Open in Tab" context menu action opens in new tab
- Tab limit enforced (closes oldest non-dirty)
- Unsaved changes prompt when closing dirty tab
- Cmd+W closes current tab
- Cmd+Tab/Cmd+Shift+Tab navigates tabs
- Tabs persist across page reloads
- Right pane still works in single-file mode

## File Structure After Phase 6

```
src/lib/
├── types/
│   └── tabs.ts                   # NEW
├── stores/
│   ├── vault.svelte.ts
│   ├── settings.svelte.ts
│   ├── vaultConfig.svelte.ts
│   ├── editor.svelte.ts
│   └── tabs.svelte.ts            # NEW
├── components/
│   ├── Sidebar.svelte
│   ├── QuickLinks.svelte
│   ├── QuickFiles.svelte
│   ├── FileTree.svelte
│   ├── FileTreeItem.svelte
│   ├── FilenameModal.svelte
│   ├── Modal.svelte
│   ├── ContextMenu.svelte
│   ├── EditorPane.svelte         # UPDATED
│   ├── CodeMirrorEditor.svelte
│   ├── MarkdownPreview.svelte
│   ├── PaneResizer.svelte
│   ├── TabBar.svelte             # NEW
│   └── Tab.svelte                # NEW
├── actions/
│   └── clickOutside.ts
└── utils/
    ├── eventBus.ts               # UPDATED (openInNewTab)
    ├── fileOperations.ts
    ├── filesystem.ts
    ├── frontmatter.ts
    └── markdown.ts
```

## Success Criteria

- [ ] Tab bar displays in left pane
- [ ] Single click opens/replaces current tab
- [ ] "Open in Tab" creates new tab
- [ ] Tab limit (5) enforced with smart closing
- [ ] Unsaved indicator on dirty tabs
- [ ] Close button on each tab
- [ ] Prompt when closing dirty tab
- [ ] Cmd+W closes current tab
- [ ] Cmd+Tab / Cmd+Shift+Tab navigates tabs
- [ ] Tabs persist to localStorage
- [ ] Tabs restore on page reload
- [ ] Right pane unchanged (single-file mode)
- [ ] All tests pass
- [ ] `npm run check` passes

## Porting Notes

From vanilla JS:
- `js/tabs.js` → `tabs.svelte.ts` + `Tab.svelte` + `TabBar.svelte`
- Tab limit and storage key remain the same
- Tab structure similar but with TypeScript types

Key differences:
- Tabs state in dedicated store, not in `state.left`
- Reactive updates via Svelte 5 runes
- EditorPane has `mode` prop instead of separate components
- Content sync handled by $derived reactivity

## Notes

(Session notes will be added during implementation)
