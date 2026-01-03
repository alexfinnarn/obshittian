# Phase 03: Journal Components

**Status:** Pending
**Output:** `src/lib/components/JournalPane.svelte`, `src/lib/components/JournalEntry.svelte`

## Objective

Create the UI components for the journal system: the main pane and individual entry components.

## Tasks

- [ ] Create `src/lib/components/JournalPane.svelte`
- [ ] Create `src/lib/components/JournalEntry.svelte`
- [ ] Implement date header display
- [ ] Implement new entry input row (text + type dropdown + add button)
- [ ] Implement entry list rendering
- [ ] Implement view mode (markdown rendered)
- [ ] Implement edit mode (textarea + type dropdown + order input)
- [ ] Implement delete with confirmation
- [ ] Style with CSS variables for dark theme

## Content Outline

### JournalPane.svelte

```svelte
<script lang="ts">
  // State
  let newEntryText = $state('');
  let newEntryType = $state('one');  // Default to first type

  // Import from stores
  import { journalStore, getEntries, addEntry } from '$lib/stores/journal.svelte';
  import { settings } from '$lib/stores/settings.svelte';
</script>

<!-- Structure -->
<div class="journal-pane">
  <!-- Date Header -->
  <header class="journal-header">
    <h2>{formatDate(journalStore.selectedDate)}</h2>
  </header>

  <!-- New Entry Input -->
  <div class="new-entry-row">
    <input type="text" bind:value={newEntryText} placeholder="Add a note..." />
    <select bind:value={newEntryType}>
      {#each settings.journalEntryTypes as type}
        <option value={type}>{type}</option>
      {/each}
    </select>
    <button onclick={handleAdd} disabled={!newEntryText.trim()}>Add</button>
  </div>

  <!-- Entry List -->
  <div class="entries-list">
    {#each getEntries() as entry (entry.id)}
      <JournalEntry {entry} />
    {:else}
      <p class="empty-state">No entries for this day</p>
    {/each}
  </div>
</div>
```

### JournalEntry.svelte

```svelte
<script lang="ts">
  import type { JournalEntry } from '$lib/types/journal';

  let { entry } = $props<{ entry: JournalEntry }>();

  let isEditing = $state(false);
  let editText = $state(entry.text);
  let editType = $state(entry.type);
  let editOrder = $state(entry.order);
</script>

<!-- View Mode -->
{#if !isEditing}
  <div class="entry" onclick={() => isEditing = true}>
    <span class="type-badge">{entry.type}</span>
    <span class="order">#{entry.order}</span>
    <div class="content">{@html renderMarkdown(entry.text)}</div>
    <span class="timestamp">{formatTime(entry.createdAt)}</span>
    <button class="delete-btn" onclick={handleDelete}>Delete</button>
  </div>

<!-- Edit Mode -->
{:else}
  <div class="entry editing">
    <textarea bind:value={editText}></textarea>
    <select bind:value={editType}>...</select>
    <input type="number" bind:value={editOrder} />
    <button onclick={handleSave}>Save</button>
    <button onclick={handleCancel}>Cancel</button>
  </div>
{/if}
```

### UI Flow

1. **Add Entry:**
   - Type in input field
   - Select type from dropdown
   - Press Enter or click Add button
   - Entry appears in list in view mode

2. **Edit Entry:**
   - Click on entry to enter edit mode
   - Modify text, type, or order
   - Click Save or press Escape to save and exit
   - Click Cancel to discard changes

3. **Delete Entry:**
   - Click Delete button
   - Confirm in dialog
   - Entry removed from list

### Styling

- Use CSS variables: `--bg-color`, `--text-color`, `--accent-color`, `--border-color`
- Type badge with background color
- Timestamp in muted color
- Delete button visible on hover
- Markdown content rendered with existing `renderMarkdown()` function

## Dependencies

- Phase 01: Types and Configuration (JournalEntry interface)
- Phase 02: Journal Store (state and CRUD operations)
- Existing: `markdown.ts` for `renderMarkdown()` function
- Existing: `settings.svelte.ts` for entry types

## Acceptance Criteria

- [ ] Date header shows formatted selected date (e.g., "Sunday - December 29, 2025")
- [ ] Input row has text field, type dropdown, and Add button
- [ ] Add button disabled when input is empty
- [ ] Enter key triggers add
- [ ] Entries display in view mode with rendered markdown
- [ ] Clicking entry switches to edit mode
- [ ] Edit mode shows textarea, type dropdown, order input
- [ ] Save/Cancel buttons work correctly
- [ ] Delete shows confirmation dialog
- [ ] Empty state message when no entries
- [ ] Styling matches dark theme
