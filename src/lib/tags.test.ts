/**
 * Tags Tests - Store, Utilities, and Components
 *
 * Tests tag extraction, indexing, fuzzy search, and UI components.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
import {
  tagsStore,
  resetTagIndex,
  isIndexBuilt,
  getFilesForTag,
  setIndexing,
  getIsIndexing,
  setSelectedTag,
  getSelectedTag,
  setTagIndex,
  loadTagIndexFromStorage,
  saveTagIndexToStorage,
  clearTagIndexStorage,
  isTagIndexStale,
  getTagIndexMeta,
  type TagIndex,
} from '$lib/stores/tags.svelte';
import {
  extractTags,
  searchTags,
  updateFileInIndex,
  removeFileFromIndex,
  renameFileInIndex,
  getAllTags,
  initializeFuseFromIndex,
} from '$lib/utils/tags';
import { clear as clearEventBus, on } from '$lib/utils/eventBus';
import TagSearch from '$lib/components/TagSearch.svelte';
import SidebarTabs from '$lib/components/SidebarTabs.svelte';

// Mock Vanilla Calendar Pro for Calendar component (used by Sidebar -> SidebarTabs -> FileTree)
vi.mock('vanilla-calendar-pro', () => {
  class MockVanillaCalendar {
    selectedDates: string[];
    constructor(container: HTMLElement) {
      this.selectedDates = [];
      const calendarEl = document.createElement('div');
      calendarEl.className = 'vc-calendar';
      container.appendChild(calendarEl);
    }
    init() {}
    destroy() {}
    set() {}
    update() {}
  }
  return { Calendar: MockVanillaCalendar };
});

vi.mock('vanilla-calendar-pro/styles/index.css', () => ({}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
});

describe('Tags Store', () => {
  beforeEach(() => {
    resetTagIndex();
    localStorageMock.clear();
    clearEventBus();
  });

  afterEach(() => {
    cleanup();
  });

  describe('resetTagIndex', () => {
    it('clears all index data', () => {
      // Add some data first
      tagsStore.index.files['test.md'] = ['tag1', 'tag2'];
      tagsStore.index.tags['tag1'] = ['test.md'];
      tagsStore.index.allTags = [{ tag: 'tag1', count: 1 }];
      tagsStore.selectedTag = 'tag1';

      resetTagIndex();

      expect(Object.keys(tagsStore.index.files)).toHaveLength(0);
      expect(Object.keys(tagsStore.index.tags)).toHaveLength(0);
      expect(tagsStore.index.allTags).toHaveLength(0);
      expect(tagsStore.selectedTag).toBeNull();
    });
  });

  describe('isIndexBuilt', () => {
    it('returns false when empty', () => {
      expect(isIndexBuilt()).toBe(false);
    });

    it('returns true when files exist', () => {
      tagsStore.index.files['test.md'] = ['tag1'];
      expect(isIndexBuilt()).toBe(true);
    });

    it('returns true when allTags has entries', () => {
      tagsStore.index.allTags = [{ tag: 'tag1', count: 1 }];
      expect(isIndexBuilt()).toBe(true);
    });
  });

  describe('getFilesForTag', () => {
    it('returns files for existing tag', () => {
      tagsStore.index.tags['javascript'] = ['app.md', 'utils.md'];
      expect(getFilesForTag('javascript')).toEqual(['app.md', 'utils.md']);
    });

    it('returns empty array for non-existent tag', () => {
      expect(getFilesForTag('nonexistent')).toEqual([]);
    });
  });

  describe('setIndexing / getIsIndexing', () => {
    it('updates indexing state', () => {
      expect(getIsIndexing()).toBe(false);
      setIndexing(true);
      expect(getIsIndexing()).toBe(true);
      setIndexing(false);
      expect(getIsIndexing()).toBe(false);
    });
  });

  describe('setSelectedTag / getSelectedTag', () => {
    it('updates selected tag', () => {
      expect(getSelectedTag()).toBeNull();
      setSelectedTag('testing');
      expect(getSelectedTag()).toBe('testing');
      setSelectedTag(null);
      expect(getSelectedTag()).toBeNull();
    });
  });

  describe('setTagIndex', () => {
    it('updates index and metadata', () => {
      const index: TagIndex = {
        files: { 'a.md': ['tag1'], 'b.md': ['tag1', 'tag2'] },
        tags: { tag1: ['a.md', 'b.md'], tag2: ['b.md'] },
        allTags: [
          { tag: 'tag1', count: 2 },
          { tag: 'tag2', count: 1 },
        ],
      };

      setTagIndex(index);

      expect(tagsStore.index).toEqual(index);
      const meta = getTagIndexMeta();
      expect(meta.fileCount).toBe(2);
      expect(meta.tagCount).toBe(2);
      expect(meta.lastIndexed).toBeGreaterThan(0);
    });
  });

  describe('localStorage persistence', () => {
    it('saves and loads index from storage', () => {
      const index: TagIndex = {
        files: { 'test.md': ['svelte', 'typescript'] },
        tags: { svelte: ['test.md'], typescript: ['test.md'] },
        allTags: [
          { tag: 'svelte', count: 1 },
          { tag: 'typescript', count: 1 },
        ],
      };

      setTagIndex(index);
      saveTagIndexToStorage();

      // Reset and reload
      resetTagIndex();
      expect(isIndexBuilt()).toBe(false);

      const loaded = loadTagIndexFromStorage();
      expect(loaded).toBe(true);
      expect(tagsStore.index.files['test.md']).toEqual(['svelte', 'typescript']);
    });

    it('returns false when no stored index', () => {
      expect(loadTagIndexFromStorage()).toBe(false);
    });

    it('clears storage', () => {
      setTagIndex({
        files: { 'test.md': ['tag1'] },
        tags: { tag1: ['test.md'] },
        allTags: [{ tag: 'tag1', count: 1 }],
      });
      saveTagIndexToStorage();

      clearTagIndexStorage();

      expect(loadTagIndexFromStorage()).toBe(false);
    });
  });

  describe('isTagIndexStale', () => {
    it('returns true when no lastIndexed', () => {
      expect(isTagIndexStale()).toBe(true);
    });

    it('returns false when recently indexed', () => {
      setTagIndex({
        files: { 'test.md': ['tag1'] },
        tags: { tag1: ['test.md'] },
        allTags: [{ tag: 'tag1', count: 1 }],
      });
      expect(isTagIndexStale()).toBe(false);
    });

    it('returns true for old index with small maxAge', async () => {
      setTagIndex({
        files: { 'test.md': ['tag1'] },
        tags: { tag1: ['test.md'] },
        allTags: [{ tag: 'tag1', count: 1 }],
      });
      // Wait 10ms then check with 5ms maxAge
      await new Promise((r) => setTimeout(r, 10));
      expect(isTagIndexStale(5)).toBe(true);
    });
  });
});

describe('Tags Utilities', () => {
  beforeEach(() => {
    resetTagIndex();
    clearEventBus();
  });

  afterEach(() => {
    cleanup();
  });

  describe('extractTags', () => {
    it('extracts tags from YAML array [a, b]', () => {
      const content = `---
tags: [javascript, react, testing]
---
# Content`;
      expect(extractTags(content)).toEqual(['javascript', 'react', 'testing']);
    });

    it('extracts tags from comma-separated string', () => {
      const content = `---
tags: svelte, typescript, vitest
---
# Content`;
      expect(extractTags(content)).toEqual(['svelte', 'typescript', 'vitest']);
    });

    it('extracts tags from YAML list', () => {
      const content = `---
tags:
  - node
  - express
  - mongodb
---
# Content`;
      expect(extractTags(content)).toEqual(['node', 'express', 'mongodb']);
    });

    it('extracts single tag as string', () => {
      const content = `---
tags: solo
---
# Content`;
      expect(extractTags(content)).toEqual(['solo']);
    });

    it('returns empty array for no tags', () => {
      const content = `---
title: No Tags
---
# Content`;
      expect(extractTags(content)).toEqual([]);
    });

    it('returns empty array for no frontmatter', () => {
      const content = `# Just markdown
No frontmatter here`;
      expect(extractTags(content)).toEqual([]);
    });
  });

  describe('updateFileInIndex', () => {
    it('adds tags for new file', () => {
      const content = `---
tags: [new, file]
---
Content`;
      updateFileInIndex('new.md', content);

      expect(tagsStore.index.files['new.md']).toEqual(['new', 'file']);
      expect(tagsStore.index.tags['new']).toContain('new.md');
      expect(tagsStore.index.tags['file']).toContain('new.md');
    });

    it('updates tags for existing file', () => {
      // First add
      updateFileInIndex('update.md', `---
tags: [old, stale]
---`);
      expect(tagsStore.index.files['update.md']).toEqual(['old', 'stale']);

      // Then update
      updateFileInIndex('update.md', `---
tags: [new, fresh]
---`);
      expect(tagsStore.index.files['update.md']).toEqual(['new', 'fresh']);
      expect(tagsStore.index.tags['old']).toBeUndefined();
      expect(tagsStore.index.tags['new']).toContain('update.md');
    });

    it('removes file when tags are removed', () => {
      updateFileInIndex('remove.md', `---
tags: [temp]
---`);
      expect(tagsStore.index.files['remove.md']).toBeDefined();

      updateFileInIndex('remove.md', `---
title: No more tags
---`);
      expect(tagsStore.index.files['remove.md']).toBeUndefined();
    });

    it('emits tags:reindex event', () => {
      let eventData: unknown = null;
      on('tags:reindex', (data) => {
        eventData = data;
      });

      updateFileInIndex('event.md', `---
tags: [event, test]
---`);

      expect(eventData).toBeTruthy();
      expect((eventData as { type: string }).type).toBe('update');
    });
  });

  describe('removeFileFromIndex', () => {
    it('removes file and its tag references', () => {
      updateFileInIndex('delete.md', `---
tags: [deleteme, removeme]
---`);
      updateFileInIndex('keep.md', `---
tags: [deleteme]
---`);

      removeFileFromIndex('delete.md');

      expect(tagsStore.index.files['delete.md']).toBeUndefined();
      expect(tagsStore.index.tags['removeme']).toBeUndefined(); // No more references
      expect(tagsStore.index.tags['deleteme']).toEqual(['keep.md']); // Still has one ref
    });

    it('does nothing for non-existent file', () => {
      removeFileFromIndex('nonexistent.md');
      // Should not throw
    });
  });

  describe('renameFileInIndex', () => {
    it('updates file path in both indexes', () => {
      updateFileInIndex('old-name.md', `---
tags: [rename, test]
---`);

      renameFileInIndex('old-name.md', 'new-name.md');

      expect(tagsStore.index.files['old-name.md']).toBeUndefined();
      expect(tagsStore.index.files['new-name.md']).toEqual(['rename', 'test']);
      expect(tagsStore.index.tags['rename']).toContain('new-name.md');
      expect(tagsStore.index.tags['rename']).not.toContain('old-name.md');
    });

    it('does nothing for non-existent file', () => {
      renameFileInIndex('nonexistent.md', 'also-nonexistent.md');
      // Should not throw
    });
  });

  describe('searchTags', () => {
    beforeEach(() => {
      // Setup index with multiple tags
      updateFileInIndex('a.md', '---\ntags: [javascript, java, json]\n---');
      updateFileInIndex('b.md', '---\ntags: [typescript, testing]\n---');
      updateFileInIndex('c.md', '---\ntags: [javascript]\n---');
      initializeFuseFromIndex();
    });

    it('returns fuzzy matches', () => {
      const results = searchTags('java');
      expect(results.length).toBeGreaterThan(0);
      const tags = results.map((r) => r.tag);
      expect(tags).toContain('javascript');
      expect(tags).toContain('java');
    });

    it('returns matches with counts', () => {
      const results = searchTags('javascript');
      const jsResult = results.find((r) => r.tag === 'javascript');
      expect(jsResult).toBeTruthy();
      expect(jsResult!.count).toBe(2); // a.md and c.md
    });

    it('returns empty array for empty query', () => {
      expect(searchTags('')).toEqual([]);
    });

    it('returns empty array for no matches', () => {
      const results = searchTags('xyznonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('getAllTags', () => {
    it('returns all tags sorted by count descending', () => {
      updateFileInIndex('a.md', '---\ntags: [popular, rare]\n---');
      updateFileInIndex('b.md', '---\ntags: [popular, common]\n---');
      updateFileInIndex('c.md', '---\ntags: [popular, common]\n---');

      const allTags = getAllTags();
      expect(allTags[0].tag).toBe('popular');
      expect(allTags[0].count).toBe(3);
    });
  });
});

describe('TagSearch Component', () => {
  beforeEach(() => {
    resetTagIndex();
    clearEventBus();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders search input', () => {
    render(TagSearch);
    expect(screen.getByTestId('tag-search-input')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search tags...')).toBeTruthy();
  });

  it('shows "No tags found" when index is empty', () => {
    render(TagSearch);
    expect(screen.getByText('No tags found')).toBeTruthy();
  });

  it('shows tags when index has data', async () => {
    // Setup index
    updateFileInIndex('test.md', '---\ntags: [demo, example]\n---');
    initializeFuseFromIndex();

    render(TagSearch);

    // Tags should appear (getAllTags is used for empty query)
    expect(screen.getByText('demo')).toBeTruthy();
    expect(screen.getByText('example')).toBeTruthy();
  });

  it('shows search results after typing', async () => {
    updateFileInIndex('test.md', '---\ntags: [searchable, findme, hidden]\n---');
    initializeFuseFromIndex();

    render(TagSearch);
    const input = screen.getByTestId('tag-search-input');

    // Type search query
    await fireEvent.input(input, { target: { value: 'find' } });

    // Wait for debounce
    await new Promise((r) => setTimeout(r, 200));

    // Should show matching results
    expect(screen.getByText('findme')).toBeTruthy();
  });

  it('shows file results when tag is clicked', async () => {
    updateFileInIndex('file1.md', '---\ntags: [clickme]\n---');
    updateFileInIndex('file2.md', '---\ntags: [clickme]\n---');
    initializeFuseFromIndex();

    render(TagSearch);

    // Click on the tag
    const tagButton = screen.getByText('clickme');
    await fireEvent.click(tagButton);

    // Should show file results
    expect(screen.getByTestId('file-results')).toBeTruthy();
    expect(screen.getByText('Files with #clickme')).toBeTruthy();
    expect(screen.getByText('file1.md')).toBeTruthy();
    expect(screen.getByText('file2.md')).toBeTruthy();
  });

  it('emits file:open event when file is clicked', async () => {
    updateFileInIndex('openme.md', '---\ntags: [test]\n---');
    initializeFuseFromIndex();

    let openedPath: string | null = null;
    on('file:open', (data) => {
      openedPath = data.path;
    });

    render(TagSearch);

    // Click tag first
    await fireEvent.click(screen.getByText('test'));

    // Then click file
    await fireEvent.click(screen.getByText('openme.md'));

    expect(openedPath).toBe('openme.md');
  });

  it('shows indexing status', () => {
    setIndexing(true);
    render(TagSearch);
    expect(screen.getByText('Indexing tags...')).toBeTruthy();
  });
});

describe('SidebarTabs Component', () => {
  beforeEach(() => {
    resetTagIndex();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Files and Search tabs', () => {
    render(SidebarTabs);
    expect(screen.getByTestId('files-tab-button')).toBeTruthy();
    expect(screen.getByTestId('search-tab-button')).toBeTruthy();
  });

  it('Files tab is active by default', () => {
    render(SidebarTabs);
    const filesTab = screen.getByTestId('files-tab-button');
    const searchTab = screen.getByTestId('search-tab-button');

    expect(filesTab.classList.contains('active')).toBe(true);
    expect(searchTab.classList.contains('active')).toBe(false);
    expect(filesTab.getAttribute('aria-selected')).toBe('true');
  });

  it('shows FileTree in Files tab', () => {
    render(SidebarTabs);
    expect(screen.getByTestId('files-tab-panel')).toBeTruthy();
    expect(screen.getByTestId('file-tree-content')).toBeTruthy();
  });

  it('switches to Search tab on click', async () => {
    render(SidebarTabs);
    const searchTab = screen.getByTestId('search-tab-button');

    await fireEvent.click(searchTab);

    expect(searchTab.classList.contains('active')).toBe(true);
    expect(screen.getByTestId('search-tab-panel')).toBeTruthy();
    expect(screen.getByTestId('tag-search')).toBeTruthy();
  });

  it('switches back to Files tab', async () => {
    render(SidebarTabs);

    // Go to Search
    await fireEvent.click(screen.getByTestId('search-tab-button'));
    expect(screen.getByTestId('search-tab-panel')).toBeTruthy();

    // Go back to Files
    await fireEvent.click(screen.getByTestId('files-tab-button'));
    expect(screen.getByTestId('files-tab-panel')).toBeTruthy();
  });

  it('has proper ARIA attributes', () => {
    render(SidebarTabs);

    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeTruthy();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);

    const tabpanel = screen.getByRole('tabpanel');
    expect(tabpanel).toBeTruthy();
  });
});
