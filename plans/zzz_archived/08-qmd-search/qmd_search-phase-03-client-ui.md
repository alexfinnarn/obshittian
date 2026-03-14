# Phase 03: Client UI (GlobalSearch Component)

**Status:** Pending
**Output:** GlobalSearch component integrated into sidebar

## Objective

Create the GlobalSearch.svelte component and integrate it into the sidebar alongside existing Files and Search tabs.

## Tasks

- [ ] Create `GlobalSearch.svelte` component
- [ ] Add search service client (src/lib/services/searchService.ts)
- [ ] Modify `SidebarTabs.svelte` to add third "Global" tab
- [ ] Add debounced search input
- [ ] Display search results with proper formatting
- [ ] Handle click to open file in editor
- [ ] Show loading and error states
- [ ] Add search result metadata (score, path, context)

## Content Outline

### 1. Search Service (src/lib/services/searchService.ts)

Client-side service to call search API:

```typescript
// Pseudocode structure
export const searchService = {
  async query(query: string, options?: SearchOptions): Promise<SearchResponse> {
    // POST to /api/search/query
    // Handle errors
    // Return results
  },
  
  async checkStatus(): Promise<{ running: boolean; healthy: boolean }> {
    // POST to /api/search/status
    // Check if QMD is available
  }
};
```

### 2. GlobalSearch Component (src/lib/components/GlobalSearch.svelte)

Structure:
```svelte
<script lang="ts">
  import { searchService } from '$lib/services/searchService';
  import { emit } from '$lib/utils/eventBus';
  
  let searchQuery = $state('');
  let results = $state<SearchResult[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  
  async function handleSearch(query: string) {
    // Debounce
    // Call searchService.query()
    // Update results state
  }
  
  function handleResultClick(result: SearchResult) {
    // emit('file:open', { path: result.path, pane: 'left' })
    // For journal entries: parse metadata and navigate to journal
  }
</script>

<div class="global-search">
  <input 
    type="text" 
    placeholder="Search all documents..." 
    bind:value={searchQuery}
    oninput={() => handleSearch(searchQuery)}
  />
  
  {#if isLoading}
    <div class="search-status">Searching...</div>
  {:else if error}
    <div class="search-error">{error}</div>
  {:else if results.length === 0 && searchQuery}
    <div class="search-status">No results found</div>
  {:else}
    {#each results as result}
      <button 
        class="search-result"
        onclick={() => handleResultClick(result)}
      >
        <div class="result-title">{result.title}</div>
        <div class="result-path">{result.path}</div>
        <div class="result-snippet">{result.snippet}</div>
        <div class="result-score">{Math.round(result.score * 100)}%</div>
      </button>
    {/each}
  {/if}
</div>
```

### 3. SidebarTabs Integration

Modify SidebarTabs.svelte to add third tab:

```svelte
<script lang="ts">
  import FileTree from './FileTree.svelte';
  import TagSearch from './TagSearch.svelte';
  import GlobalSearch from './GlobalSearch.svelte'; // NEW
  
  type TabName = 'files' | 'search' | 'global'; // UPDATED
  let activeTab = $state<TabName>('files');
</script>

<div class="sidebar-tabs">
  <div class="tab-buttons" role="tablist">
    <button class="tab-button" class:active={activeTab === 'files'} onclick={() => switchTab('files')}>
      Files
    </button>
    <button class="tab-button" class:active={activeTab === 'search'} onclick={() => switchTab('search')}>
      Search
    </button>
    <button class="tab-button" class:active={activeTab === 'global'} onclick={() => switchTab('global')}>
      Global
    </button>
  </div>
  
  <!-- ... panels ... -->
  {#if activeTab === 'global'}
    <div class="tab-panel" role="tabpanel" data-testid="global-tab-panel">
      <GlobalSearch />
    </div>
  {/if}
</div>
```

### 4. UI/UX Considerations

- **Search input**: Large text input with search icon
- **Debouncing**: 200-300ms delay before sending query
- **Results list**: Scrollable with max-height
- **Result items**: Title, path, snippet preview, relevance score
- **Highlighting**: Mark query terms in snippets
- **Click behavior**: Open file in left pane, scroll to relevant section if possible
- **Journal results**: Different styling (icon, "Journal" label)
- **Empty state**: Helpful message when QMD not set up
- **Loading state**: Spinner or "Searching..." text
- **Error state**: Clear error message with retry option

### 5. Styling

Follow existing design patterns from TagSearch.svelte:
- Use CSS variables from app.css
- Consistent colors with tag search
- Responsive layout for mobile
- Keyboard accessible (focus states)

## Dependencies

- Phase 02 must be complete (working search API)
- Event bus for file navigation

## Acceptance Criteria

- [ ] GlobalSearch component renders correctly
- [ ] Search input debounces queries properly
- [ ] Results display with title, path, snippet, score
- [ ] Clicking result opens file in editor
- [ ] Journal results are identified and styled differently
- [ ] Loading state shows during search
- [ ] Error state shows when QMD unavailable
- [ ] "Global" tab appears in SidebarTabs
- [ ] Tab switching preserves component state
- [ ] Mobile responsive layout works
- [ ] Unit tests for GlobalSearch component
- [ ] E2E test for search flow