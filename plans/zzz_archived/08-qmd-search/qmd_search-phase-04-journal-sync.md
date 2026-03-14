# Phase 04: Journal Entry Synchronization

**Status:** Pending
**Output:** Journal entries synced to markdown for QMD indexing

## Objective

Convert journal YAML entries to markdown format and keep them synchronized with QMD's index so they appear in global search results.

## Tasks

- [ ] Create journal-to-markdown converter utility
- [ ] Create `.qmd-journals/` cache directory structure
- [ ] Implement journal sync on entry create/update/delete
- [ ] Hook into journal store events for auto-sync
- [ ] Add journal metadata to converted markdown (date, entryId, type)
- [ ] Update QMD index after journal changes
- [ ] Handle journal result clicks (navigate to journal pane)

## Content Outline

### 1. Journal Converter (src/lib/utils/journalConverter.ts)

Convert YAML journal entries to markdown:

```typescript
// Pseudocode structure
export function convertJournalEntryToMarkdown(
  date: string,
  entry: JournalEntry
): string {
  // Format as markdown with frontmatter
  return `---
date: ${date}
entryId: ${entry.id}
tags: [${entry.tags.join(', ')}]
type: journal
createdAt: ${entry.createdAt}
---

${entry.text}
`;
}

export function getJournalCachePath(date: string, entryId: string): string {
  // Return: .qmd-journals/2025-01-15#abc123.md
  return `.qmd-journals/${date}#${entryId}.md`;
}
```

### 2. Journal Sync Service (src/lib/utils/journalSync.ts)

Synchronize journal entries with QMD index:

```typescript
// Pseudocode structure
export class JournalSyncService {
  private cacheDir = '.qmd-journals';
  
  async syncEntry(date: string, entry: JournalEntry): Promise<void> {
    // Convert entry to markdown
    // Write to cache directory
    // Trigger QMD reindex for this file
  }
  
  async removeEntry(date: string, entryId: string): Promise<void> {
    // Delete cached markdown file
    // Trigger QMD index update
  }
  
  async syncAllJournals(): Promise<void> {
    // Iterate through all journal files
    // Convert all entries to markdown
    // Bulk write to cache directory
  }
  
  async clearCache(): Promise<void> {
    // Remove .qmd-journals/ directory
  }
}
```

### 3. Event Integration

Hook into journal store events:

```typescript
// In journal store or appropriate location
import { emit, on } from '$lib/utils/eventBus';
import { journalSyncService } from '$lib/utils/journalSync';

// Listen to journal events
on('journal:entryCreated', async ({ date, entry }) => {
  await journalSyncService.syncEntry(date, entry);
});

on('journal:entryUpdated', async ({ date, entry }) => {
  await journalSyncService.syncEntry(date, entry);
});

on('journal:entryDeleted', async ({ date, entryId }) => {
  await journalSyncService.removeEntry(date, entryId);
});

// Initial sync on vault open
on('vault:opened', async () => {
  await journalSyncService.syncAllJournals();
});
```

### 4. Cache Directory Structure

```
vault/
├── zzz_Daily Notes/
│   └── 2025/
│       └── 01/
│           ├── 2025-01-15.yaml  # Original journal
│           └── 2025-01-16.yaml
└── .qmd-journals/               # Cache directory
    ├── 2025-01-15#abc123.md
    ├── 2025-01-15#def456.md
    └── 2025-01-16#ghi789.md
```

### 5. Result Handling in GlobalSearch

Update GlobalSearch component to handle journal results:

```typescript
function handleResultClick(result: SearchResult) {
  // Check if it's a journal entry
  if (result.path.startsWith('.qmd-journals/')) {
    // Parse: .qmd-journals/2025-01-15#abc123.md
    const match = result.path.match(/\.qmd-journals\/(\d{4}-\d{2}-\d{2})#(.+)\.md/);
    if (match) {
      const [, date, entryId] = match;
      // Emit event to scroll to this journal entry
      emit('journal:scrollToEntry', { date, entryId });
    }
  } else {
    // Regular file - open in left pane
    emit('file:open', { path: result.path, pane: 'left' });
  }
}
```

### 6. QMD Collection Update

When journal entries sync, update QMD index:

```typescript
// Call QMD to index the cache directory
// Option 1: Add .qmd-journals to vault collection
qmd collection update vault --include ".qmd-journals/**/*.md"

// Option 2: Separate collection for journals
qmd collection add .qmd-journals --name journals
```

### 7. Display Enhancements

In GlobalSearch component, identify journal results:

```svelte
{#each results as result}
  <button class="search-result" class:journal-result={isJournalEntry(result)}>
    {#if isJournalEntry(result)}
      <span class="result-type">Journal</span>
    {/if}
    <div class="result-title">{result.title}</div>
    <div class="result-path">{formatPath(result.path)}</div>
    <div class="result-snippet">{result.snippet}</div>
  </button>
{/if}

<script>
function isJournalEntry(result: SearchResult): boolean {
  return result.path.startsWith('.qmd-journals/');
}

function formatPath(path: string): string {
  if (path.startsWith('.qmd-journals/')) {
    // Show date: "Jan 15, 2025"
    const match = path.match(/\.qmd-journals\/(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return formatDate(match[1]);
    }
  }
  return path;
}
</script>
```

## Dependencies

- Phase 01 must be complete (QMD setup)
- Journal store with event system
- File system access for cache directory

## Acceptance Criteria

- [ ] Journal entries convert to markdown correctly
- [ ] Cache directory created at `.qmd-journals/`
- [ ] New journal entries automatically sync to cache
- [ ] Updated entries sync changes
- [ ] Deleted entries are removed from cache
- [ ] QMD index updates after sync
- [ ] Journal results appear in global search
- [ ] Clicking journal result navigates to journal pane
- [ ] Journal results display with proper formatting
- [ ] Cache doesn't grow unbounded (cleanup old entries)
- [ ] Unit tests for converter
- [ ] Integration tests for sync flow