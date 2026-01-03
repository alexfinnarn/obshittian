<script lang="ts">
  import {
    journalStore,
    getEntries,
    addEntry,
  } from '$lib/stores/journal.svelte';
  import JournalEntry from './JournalEntry.svelte';
  import CodeMirrorEditor from './CodeMirrorEditor.svelte';
  import TagInput from './TagInput.svelte';

  let newEntryText = $state('');
  let newEntryTags = $state<string[]>([]);
  let isAdding = $state(false);

  // Get entries sorted by order
  const sortedEntries = $derived(
    [...getEntries()].sort((a, b) => a.order - b.order)
  );

  // Format date for header display (e.g., "Sunday - December 29, 2025")
  function formatDateHeader(date: Date | null): string {
    if (!date) return 'No date selected';

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };

    const formatted = date.toLocaleDateString('en-US', options);
    // Split to insert dash: "Sunday, December 29, 2025" -> "Sunday - December 29, 2025"
    const parts = formatted.split(', ');
    if (parts.length >= 2) {
      return `${parts[0]} - ${parts.slice(1).join(', ')}`;
    }
    return formatted;
  }

  async function handleAdd() {
    const text = newEntryText.trim();
    if (!text || isAdding) return;

    isAdding = true;
    try {
      await addEntry(text, newEntryTags.length > 0 ? newEntryTags : undefined);
      newEntryText = '';
      newEntryTags = [];
    } finally {
      isAdding = false;
    }
  }

  function handleEditorChange(content: string) {
    newEntryText = content;
  }

  function handleTagsChange(tags: string[]) {
    newEntryTags = tags;
  }
</script>

<div class="journal-pane" data-testid="journal-pane">
  <!-- Date Header -->
  <header class="journal-header">
    <h2>{formatDateHeader(journalStore.selectedDate)}</h2>
  </header>

  <!-- New Entry Input -->
  <div class="new-entry-section">
    <div class="new-entry-editor">
      <CodeMirrorEditor content={newEntryText} onchange={handleEditorChange} />
    </div>
    <div class="new-entry-controls">
      <div class="tags-input-wrapper">
        <TagInput
          tags={newEntryTags}
          onchange={handleTagsChange}
          placeholder="Add tags..."
        />
      </div>
      <button
        class="add-btn"
        onclick={handleAdd}
        disabled={!newEntryText.trim() || isAdding}
        data-testid="add-entry-btn"
      >
        {isAdding ? 'Adding...' : 'Add Entry'}
      </button>
    </div>
  </div>

  <!-- Entry List -->
  <div class="entries-list" data-testid="entries-list">
    {#if journalStore.isLoading}
      <p class="loading-state">Loading entries...</p>
    {:else if sortedEntries.length === 0}
      <p class="empty-state">No entries for this day</p>
    {:else}
      {#each sortedEntries as entry (entry.id)}
        <JournalEntry {entry} />
      {/each}
    {/if}
  </div>
</div>

<style>
  .journal-pane {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary, #1e1e1e);
  }

  /* Header */
  .journal-header {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-color, #444);
    flex-shrink: 0;
  }

  .journal-header h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color, #fff);
  }

  /* New Entry Section */
  .new-entry-section {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-color, #444);
    flex-shrink: 0;
  }

  .new-entry-editor {
    height: 80px;
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
    transition: height 0.2s ease, border-color 0.2s ease;
  }

  .new-entry-editor:focus-within {
    height: 250px;
    border-color: var(--accent-color, #0078d4);
  }

  .new-entry-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .tags-input-wrapper {
    flex: 1;
    min-width: 150px;
  }

  .add-btn {
    background: var(--accent-color, #0078d4);
    border: none;
    color: white;
    padding: 0.375rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .add-btn:hover:not(:disabled) {
    background: var(--accent-color-hover, #006cbd);
  }

  .add-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Entries List */
  .entries-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem 1rem;
  }

  .empty-state,
  .loading-state {
    color: var(--text-muted, #666);
    font-size: 0.875rem;
    font-style: italic;
    margin: 0;
    text-align: center;
    padding: 2rem;
  }
</style>
