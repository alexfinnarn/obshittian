# Phase 8: Search & Tags

## Goal
Implement tag indexing and fuzzy search functionality. Add a Search tab to the sidebar that allows users to search for tags and open files containing those tags.

## Prerequisites
- Phase 7 complete (Calendar & Daily Notes)

## Tasks

### 8.1 Install Fuse.js Package

Add Fuse.js for fuzzy search:

```bash
cd svelte-app
npm install fuse.js
```

### 8.2 Create Tags Store

Create `src/lib/stores/tags.svelte.ts`:

```typescript
/**
 * Tags Store - Tag indexing and search state
 */

export interface TagEntry {
  tag: string;
  count: number;
}

export interface TagIndex {
  files: Record<string, string[]>;  // path -> [tags]
  tags: Record<string, string[]>;   // tag -> [paths]
  allTags: TagEntry[];              // for Fuse.js
}

interface TagsState {
  index: TagIndex;
  isIndexing: boolean;
  selectedTag: string | null;
}

export const tagsStore = $state<TagsState>({
  index: {
    files: {},
    tags: {},
    allTags: [],
  },
  isIndexing: false,
  selectedTag: null,
});

/**
 * Check if index has been built
 */
export function isIndexBuilt(): boolean {
  return tagsStore.index.allTags.length > 0 ||
         Object.keys(tagsStore.index.files).length > 0;
}

/**
 * Get files containing a specific tag
 */
export function getFilesForTag(tag: string): string[] {
  return tagsStore.index.tags[tag] || [];
}

/**
 * Get the current tag index
 */
export function getTagIndex(): TagIndex {
  return tagsStore.index;
}

/**
 * Set indexing state
 */
export function setIndexing(isIndexing: boolean): void {
  tagsStore.isIndexing = isIndexing;
}

/**
 * Set selected tag
 */
export function setSelectedTag(tag: string | null): void {
  tagsStore.selectedTag = tag;
}

/**
 * Reset the tag index
 */
export function resetTagIndex(): void {
  tagsStore.index = {
    files: {},
    tags: {},
    allTags: [],
  };
  tagsStore.selectedTag = null;
}
```

### 8.3 Create Tags Utilities

Create `src/lib/utils/tags.ts`:

```typescript
import Fuse from 'fuse.js';
import { parseFrontmatter } from './frontmatter';
import {
  tagsStore,
  type TagIndex,
  type TagEntry,
  resetTagIndex
} from '$lib/stores/tags.svelte';

// Fuse.js configuration
const FUSE_OPTIONS = {
  keys: ['tag'],
  threshold: 0.4,
  includeScore: true,
};

let fuseInstance: Fuse<TagEntry> | null = null;

/**
 * Rebuild allTags array and Fuse.js instance from current tag index
 */
function rebuildSearchIndex(): void {
  tagsStore.index.allTags = Object.entries(tagsStore.index.tags).map(
    ([tag, paths]) => ({
      tag,
      count: paths.length,
    })
  );

  fuseInstance = new Fuse(tagsStore.index.allTags, FUSE_OPTIONS);
}

/**
 * Remove a file's tags from the reverse index
 */
function removeFileTagReferences(filePath: string): void {
  const tags = tagsStore.index.files[filePath] || [];
  for (const tag of tags) {
    if (tagsStore.index.tags[tag]) {
      tagsStore.index.tags[tag] = tagsStore.index.tags[tag].filter(
        (p) => p !== filePath
      );
      if (tagsStore.index.tags[tag].length === 0) {
        delete tagsStore.index.tags[tag];
      }
    }
  }
}

/**
 * Add tags for a file to the reverse index
 */
function addFileTagReferences(filePath: string, tags: string[]): void {
  for (const tag of tags) {
    if (!tagsStore.index.tags[tag]) {
      tagsStore.index.tags[tag] = [];
    }
    tagsStore.index.tags[tag].push(filePath);
  }
}

/**
 * Extract tags from frontmatter
 */
export function extractTags(content: string): string[] {
  const frontmatter = parseFrontmatter(content);
  const tags = frontmatter.tags;

  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') return [tags];
  return [];
}

/**
 * Recursively scan directory and build tag index
 */
async function scanDirectory(
  dirHandle: FileSystemDirectoryHandle,
  basePath: string = ''
): Promise<void> {
  for await (const entry of dirHandle.values()) {
    const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (entry.kind === 'directory') {
      // Skip hidden directories
      if (entry.name.startsWith('.')) continue;

      const subDirHandle = await dirHandle.getDirectoryHandle(entry.name);
      await scanDirectory(subDirHandle, entryPath);
    } else if (entry.kind === 'file' && entry.name.endsWith('.md')) {
      try {
        const fileHandle = await dirHandle.getFileHandle(entry.name);
        const file = await fileHandle.getFile();

        // Only read first 2KB for frontmatter (performance optimization)
        const slice = file.slice(0, 2048);
        const text = await slice.text();

        const tags = extractTags(text);
        if (tags.length > 0) {
          tagsStore.index.files[entryPath] = tags;
          addFileTagReferences(entryPath, tags);
        }
      } catch (err) {
        console.error(`Error reading file ${entryPath}:`, err);
      }
    }
  }
}

/**
 * Build the tag index from a root directory
 */
export async function buildTagIndex(
  rootDirHandle: FileSystemDirectoryHandle
): Promise<TagIndex> {
  resetTagIndex();

  await scanDirectory(rootDirHandle);
  rebuildSearchIndex();

  return tagsStore.index;
}

/**
 * Search tags using fuzzy matching
 */
export function searchTags(
  query: string
): Array<{ tag: string; count: number; score?: number }> {
  if (!query || !fuseInstance) {
    return [];
  }

  const results = fuseInstance.search(query);
  return results.map((result) => ({
    tag: result.item.tag,
    count: result.item.count,
    score: result.score,
  }));
}

/**
 * Update tags for a single file (called on file save)
 */
export function updateFileInIndex(filePath: string, content: string): void {
  removeFileTagReferences(filePath);

  const newTags = extractTags(content);

  if (newTags.length > 0) {
    tagsStore.index.files[filePath] = newTags;
    addFileTagReferences(filePath, newTags);
  } else {
    delete tagsStore.index.files[filePath];
  }

  rebuildSearchIndex();
}

/**
 * Remove a file from the index (called on file delete)
 */
export function removeFileFromIndex(filePath: string): void {
  removeFileTagReferences(filePath);
  delete tagsStore.index.files[filePath];
  rebuildSearchIndex();
}

/**
 * Rename a file in the index (called on file rename)
 */
export function renameFileInIndex(oldPath: string, newPath: string): void {
  const tags = tagsStore.index.files[oldPath];
  if (!tags) return;

  // Update files index
  tagsStore.index.files[newPath] = tags;
  delete tagsStore.index.files[oldPath];

  // Update reverse index
  for (const tag of tags) {
    if (tagsStore.index.tags[tag]) {
      const idx = tagsStore.index.tags[tag].indexOf(oldPath);
      if (idx !== -1) {
        tagsStore.index.tags[tag][idx] = newPath;
      }
    }
  }
}
```

### 8.4 Create TagSearch Component

Create `src/lib/components/TagSearch.svelte`:

```svelte
<script lang="ts">
  import { searchTags } from '$lib/utils/tags';
  import { tagsStore, getFilesForTag, setSelectedTag } from '$lib/stores/tags.svelte';
  import { emit } from '$lib/utils/eventBus';

  let searchQuery = $state('');
  let searchResults = $state<Array<{ tag: string; count: number }>>([]);
  let fileResults = $state<string[]>([]);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function handleSearchInput(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    searchQuery = query;

    // Clear file results when search changes
    setSelectedTag(null);
    fileResults = [];

    // Debounce the search
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (query.trim()) {
        searchResults = searchTags(query.trim());
      } else {
        searchResults = [];
      }
    }, 150);
  }

  function handleTagClick(tag: string) {
    setSelectedTag(tag);
    fileResults = getFilesForTag(tag);
  }

  function handleFileClick(path: string) {
    emit('file:open', { path, pane: 'left' });
  }

  function getFilename(path: string): string {
    return path.split('/').pop() || path;
  }
</script>

<div class="tag-search" data-testid="tag-search">
  <input
    type="text"
    class="search-input"
    placeholder="Search tags..."
    value={searchQuery}
    oninput={handleSearchInput}
    data-testid="tag-search-input"
  />

  <div class="tag-results" data-testid="tag-results">
    {#if tagsStore.isIndexing}
      <div class="search-status">Indexing tags...</div>
    {:else if searchQuery && searchResults.length === 0}
      <div class="search-status">No matching tags</div>
    {:else}
      {#each searchResults as result}
        <button
          class="tag-item"
          class:active={tagsStore.selectedTag === result.tag}
          onclick={() => handleTagClick(result.tag)}
          data-testid="tag-item"
        >
          {result.tag}
          <span class="tag-count">{result.count}</span>
        </button>
      {/each}
    {/if}
  </div>

  {#if tagsStore.selectedTag && fileResults.length > 0}
    <div class="file-results" data-testid="file-results">
      <div class="file-results-header">Files with #{tagsStore.selectedTag}</div>
      {#each fileResults as path}
        <button
          class="file-result-item"
          title={path}
          onclick={() => handleFileClick(path)}
          data-testid="file-result-item"
        >
          {getFilename(path)}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .tag-search {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .search-input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border-color, #333);
    border-radius: 4px;
    background: var(--input-bg, #2d2d2d);
    color: var(--text-color, #d4d4d4);
    font-size: 0.875rem;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--accent-color, #3794ff);
  }

  .tag-results {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    min-height: 1.5rem;
  }

  .search-status {
    color: var(--text-muted, #888);
    font-size: 0.875rem;
    font-style: italic;
    padding: 0.25rem;
  }

  .tag-item {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border: none;
    border-radius: 4px;
    background: var(--tag-bg, #3a3a3a);
    color: var(--text-color, #d4d4d4);
    font-size: 0.75rem;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .tag-item:hover {
    background: var(--hover-bg, #4a4a4a);
  }

  .tag-item.active {
    background: var(--accent-color, #3794ff);
    color: white;
  }

  .tag-count {
    font-size: 0.625rem;
    opacity: 0.7;
    background: rgba(0, 0, 0, 0.2);
    padding: 0.125rem 0.25rem;
    border-radius: 2px;
  }

  .file-results {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.5rem;
    border-top: 1px solid var(--border-color, #333);
    padding-top: 0.5rem;
  }

  .file-results-header {
    font-size: 0.75rem;
    color: var(--text-muted, #888);
    padding: 0.25rem 0;
  }

  .file-result-item {
    display: block;
    width: 100%;
    padding: 0.375rem 0.5rem;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-color, #d4d4d4);
    font-size: 0.875rem;
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-result-item:hover {
    background: var(--hover-bg, #333);
  }
</style>
```

### 8.5 Create SidebarTabs Component

Create `src/lib/components/SidebarTabs.svelte`:

```svelte
<script lang="ts">
  import FileTree from './FileTree.svelte';
  import TagSearch from './TagSearch.svelte';

  type TabName = 'files' | 'search';
  let activeTab = $state<TabName>('files');

  function switchTab(tab: TabName) {
    activeTab = tab;
  }
</script>

<div class="sidebar-tabs" data-testid="sidebar-tabs">
  <div class="tab-buttons" role="tablist">
    <button
      class="tab-button"
      class:active={activeTab === 'files'}
      onclick={() => switchTab('files')}
      role="tab"
      aria-selected={activeTab === 'files'}
      data-testid="files-tab-button"
    >
      Files
    </button>
    <button
      class="tab-button"
      class:active={activeTab === 'search'}
      onclick={() => switchTab('search')}
      role="tab"
      aria-selected={activeTab === 'search'}
      data-testid="search-tab-button"
    >
      Search
    </button>
  </div>

  <div class="tab-content">
    {#if activeTab === 'files'}
      <div class="tab-panel" role="tabpanel" data-testid="files-tab-panel">
        <FileTree />
      </div>
    {:else}
      <div class="tab-panel" role="tabpanel" data-testid="search-tab-panel">
        <TagSearch />
      </div>
    {/if}
  </div>
</div>

<style>
  .sidebar-tabs {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .tab-buttons {
    display: flex;
    border-bottom: 1px solid var(--border-color, #333);
    padding: 0 0.5rem;
  }

  .tab-button {
    flex: 1;
    padding: 0.5rem;
    border: none;
    background: transparent;
    color: var(--text-muted, #888);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
  }

  .tab-button:hover {
    color: var(--text-color, #d4d4d4);
  }

  .tab-button.active {
    color: var(--accent-color, #3794ff);
    border-bottom-color: var(--accent-color, #3794ff);
  }

  .tab-content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .tab-panel {
    height: 100%;
    overflow-y: auto;
  }
</style>
```

### 8.6 Update Sidebar Component

Update `src/lib/components/Sidebar.svelte` to use SidebarTabs:

```svelte
<script lang="ts">
  import QuickLinks from './QuickLinks.svelte';
  import QuickFiles from './QuickFiles.svelte';
  import Calendar from './Calendar.svelte';
  import SidebarTabs from './SidebarTabs.svelte';

  interface Props {
    ondateselect?: (date: Date) => void;
  }

  let { ondateselect }: Props = $props();

  let calendarComponent: Calendar | null = $state(null);

  function handleDateSelect(date: Date) {
    ondateselect?.(date);
  }

  export function navigateCalendar(days: number): void {
    calendarComponent?.navigateDays(days);
  }

  export function getCalendar(): Calendar | null {
    return calendarComponent;
  }
</script>

<aside class="sidebar" data-testid="sidebar">
  <div class="sidebar-section calendar-section" data-testid="calendar">
    <header class="section-header">
      <h3>Calendar</h3>
    </header>
    <Calendar bind:this={calendarComponent} onselect={handleDateSelect} />
  </div>

  <QuickLinks />
  <QuickFiles />

  <!-- Tabbed Files/Search section -->
  <div class="sidebar-section tabbed-section" data-testid="tabbed-section">
    <SidebarTabs />
  </div>
</aside>

<style>
  /* ... existing styles ... */

  .tabbed-section {
    flex: 1;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    /* Remove the header since tabs have their own */
    padding-top: 0;
  }
</style>
```

### 8.7 Wire Up Tag Index Building

Update `src/App.svelte` to build tag index when vault opens:

```typescript
import { buildTagIndex, updateFileInIndex, removeFileFromIndex, renameFileInIndex } from '$lib/utils/tags';
import { setIndexing } from '$lib/stores/tags.svelte';

onMount(async () => {
  // ... existing setup ...

  // Listen for file:created events - update tag index
  unsubscribers.push(
    on('file:created', async (data: AppEvents['file:created']) => {
      console.log('file:created event received:', data.path);
      // New files start empty, no tags to index
    })
  );

  // Listen for file:renamed events - update tag index
  unsubscribers.push(
    on('file:renamed', (data: AppEvents['file:renamed']) => {
      console.log('file:renamed event received:', data.oldPath, '->', data.newPath);
      renameFileInIndex(data.oldPath, data.newPath);
    })
  );

  // Listen for file:deleted events - update tag index
  unsubscribers.push(
    on('file:deleted', (data: AppEvents['file:deleted']) => {
      console.log('file:deleted event received:', data.path);
      removeFileFromIndex(data.path);
    })
  );

  // Build tag index if vault is open
  if (vault.rootDirHandle) {
    await buildTagIndexAsync();
  }
});

/**
 * Build tag index with loading state
 */
async function buildTagIndexAsync() {
  if (!vault.rootDirHandle) return;

  setIndexing(true);
  try {
    await buildTagIndex(vault.rootDirHandle);
  } catch (err) {
    console.error('Failed to build tag index:', err);
  } finally {
    setIndexing(false);
  }
}
```

Update file save handler to update tag index:

```typescript
async function handleFileSave(pane: PaneId) {
  // ... existing save logic ...

  // After successful save, update tag index
  if (relativePath && content) {
    updateFileInIndex(relativePath, content);
  }
}
```

### 8.8 Add Tag Index Event to Event Bus

Update `src/lib/utils/eventBus.ts`:

```typescript
export interface AppEvents {
  // ... existing events ...
  'tags:reindex': void;  // Trigger a full reindex
}
```

### 8.9 Write Tests

**`tags.svelte.test.ts`** - Tags store:
- resetTagIndex() clears all data
- isIndexBuilt() returns false when empty
- isIndexBuilt() returns true after adding files
- getFilesForTag() returns correct files
- setIndexing() updates state
- setSelectedTag() updates state

**`tags.test.ts`** - Tags utilities:
- extractTags() from comma-separated string
- extractTags() from YAML array
- extractTags() from YAML list
- extractTags() returns empty for no tags
- updateFileInIndex() adds tags
- updateFileInIndex() updates existing tags
- removeFileFromIndex() removes tags
- renameFileInIndex() updates paths
- searchTags() returns fuzzy matches
- buildTagIndex() scans directory

**`TagSearch.test.ts`** - TagSearch component:
- Renders search input
- Shows "No matching tags" for empty results
- Shows tag results on search
- Highlights selected tag
- Shows file results when tag clicked
- Emits file:open on file click

**`SidebarTabs.test.ts`** - SidebarTabs component:
- Renders Files and Search tabs
- Files tab active by default
- Switches to Search tab on click
- Shows FileTree in Files tab
- Shows TagSearch in Search tab

### 8.10 Integration Verification

- [ ] Fuse.js installed and working
- [ ] Tag index builds on vault open
- [ ] Search returns fuzzy matches
- [ ] Click tag shows files
- [ ] Click file opens in left pane
- [ ] File save updates tag index
- [ ] File rename updates tag index
- [ ] File delete removes from index
- [ ] Indexing status shows while building
- [ ] Tab switching works
- [ ] All tests pass
- [ ] `npm run check` passes

## File Structure After Phase 8

```
src/lib/
├── types/
│   └── tabs.ts
├── stores/
│   ├── vault.svelte.ts
│   ├── settings.svelte.ts
│   ├── vaultConfig.svelte.ts
│   ├── editor.svelte.ts
│   ├── tabs.svelte.ts
│   └── tags.svelte.ts          # NEW
├── components/
│   ├── Sidebar.svelte          # UPDATED (uses SidebarTabs)
│   ├── SidebarTabs.svelte      # NEW
│   ├── TagSearch.svelte        # NEW
│   ├── Calendar.svelte
│   ├── QuickLinks.svelte
│   ├── QuickFiles.svelte
│   ├── FileTree.svelte
│   ├── FileTreeItem.svelte
│   ├── FilenameModal.svelte
│   ├── Modal.svelte
│   ├── ContextMenu.svelte
│   ├── EditorPane.svelte
│   ├── TabBar.svelte
│   ├── Tab.svelte
│   ├── CodeMirrorEditor.svelte
│   ├── MarkdownPreview.svelte
│   └── PaneResizer.svelte
├── actions/
│   └── clickOutside.ts
└── utils/
    ├── eventBus.ts             # UPDATED (tags:reindex)
    ├── dailyNotes.ts
    ├── tags.ts                 # NEW
    ├── fileOperations.ts
    ├── filesystem.ts
    ├── frontmatter.ts
    └── markdown.ts
```

## Success Criteria

- [ ] Fuse.js fuzzy search works for tags
- [ ] Tag index builds automatically on vault open
- [ ] Search shows matching tags with counts
- [ ] Click tag shows files containing that tag
- [ ] Click file opens in left pane tabs
- [ ] File operations update tag index in real-time
- [ ] Indexing status shown during scan
- [ ] Files/Search tabs switch correctly
- [ ] Performance acceptable for large vaults (2KB read limit per file)
- [ ] All tests pass
- [ ] `npm run check` passes

## Porting Notes

From vanilla JS:
- `js/tags.js` → `stores/tags.svelte.ts` + `utils/tags.ts`
- `js/sidebar.js` (tag search parts) → `TagSearch.svelte` + `SidebarTabs.svelte`
- Global `tagIndex` → `tagsStore` reactive state
- DOM manipulation → Svelte reactive template

Key differences:
- Tag index stored in Svelte $state store
- Fuse.js imported as npm package
- No manual DOM updates for search results
- File click uses event bus instead of direct function call
- Sidebar tabs as separate component with $state for active tab

## Notes

### Implementation Notes (2025-12-23)

**Completed:**
- Fuse.js already installed, verified in package.json
- Created `stores/tags.svelte.ts` with localStorage persistence
- Created `utils/tags.ts` with Fuse.js fuzzy search
- Created `TagSearch.svelte` and `SidebarTabs.svelte` components
- Updated `Sidebar.svelte` to use tabbed section
- Updated `eventBus.ts` with `tags:reindex` event
- Wired up tag indexing in `App.svelte`

**Enhancements over plan:**
- Added tag index persistence to localStorage - only rebuilds when:
  - No stored index exists
  - Files are saved/renamed/deleted (incremental updates)
- Added `ReindexEventData` interface with rich metadata:
  - `type`: 'full' | 'update' | 'remove' | 'rename'
  - `filesAdded`, `filesRemoved`, `tagsAdded`, `tagsRemoved`
  - `meta`: fileCount, tagCount, lastIndexed timestamp
- Added `isTagIndexStale()` function for future use
- Added `initializeFuseFromIndex()` for initializing Fuse.js after loading from storage
- Tags display sorted by count when no search query entered

**Key learnings:**
- Fuse.js types: Use `import Fuse, { type IFuseOptions } from 'fuse.js'` not `Fuse.IFuseOptions`
- Empty CSS rulesets trigger svelte-check warnings

**Tests added:** 47 tests covering store, utilities, and components

**Files created:**
- `src/lib/stores/tags.svelte.ts`
- `src/lib/utils/tags.ts`
- `src/lib/components/TagSearch.svelte`
- `src/lib/components/SidebarTabs.svelte`
- `src/lib/tags.test.ts`

**Files modified:**
- `src/lib/utils/eventBus.ts` (added `tags:reindex` event)
- `src/lib/components/Sidebar.svelte` (uses SidebarTabs)
- `src/App.svelte` (tag index initialization and file event handlers)
- `src/lib/components/Sidebar.test.ts` (updated for new structure)
