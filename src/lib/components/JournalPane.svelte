<script lang="ts">
  import {
    journalStore,
    getEntries,
    addEntry,
  } from '$lib/stores/journal.svelte';
  import { vaultConfig } from '$lib/stores/vaultConfig.svelte';
  import JournalEntry from './JournalEntry.svelte';
  import CodeMirrorEditor from './CodeMirrorEditor.svelte';
  import TagInput from './TagInput.svelte';
  import DailyTaskTabs from './DailyTaskTabs.svelte';
  import DailyTasksConfigModal from './DailyTasksConfigModal.svelte';
  import { isTaskVisibleOnDate, loadNextTemplate, type DailyTask } from '$lib/types/dailyTasks';

  let newEntryText = $state('');
  let newEntryTags = $state<string[]>([]);
  let isAdding = $state(false);
  let activeTaskId = $state<string | null>(null);
  let showConfigModal = $state(false);
  let isLoadingTemplate = $state(false);

  // Get entries sorted by order
  const sortedEntries = $derived(
    [...getEntries()].sort((a, b) => a.order - b.order)
  );

  // Get tasks visible on selected date
  const visibleTasks = $derived(
    journalStore.selectedDate
      ? vaultConfig.dailyTasks.filter((task) =>
          isTaskVisibleOnDate(task, journalStore.selectedDate!)
        )
      : []
  );

  // Get active task (if any)
  const activeTask = $derived(
    activeTaskId ? visibleTasks.find((t) => t.id === activeTaskId) ?? null : null
  );

  // Filter entries based on active task
  const filteredEntries = $derived(
    activeTask
      ? sortedEntries.filter((e) => e.tags.includes(activeTask.tag))
      : sortedEntries
  );

  // Load template when task tab is selected
  $effect(() => {
    if (activeTask && journalStore.selectedDate) {
      isLoadingTemplate = true;
      const currentCount = filteredEntries.length;
      loadNextTemplate(activeTask, currentCount)
        .then((content) => {
          newEntryText = content;
        })
        .catch((err) => {
          console.warn('Failed to load template:', err);
          newEntryText = '';
        })
        .finally(() => {
          isLoadingTemplate = false;
        });
    } else if (!activeTask) {
      // Clear template when switching to "All" tab
      newEntryText = '';
    }
  });

  // Reset activeTaskId when date changes if task not visible on new date
  $effect(() => {
    if (activeTaskId && journalStore.selectedDate) {
      const stillVisible = visibleTasks.some((t) => t.id === activeTaskId);
      if (!stillVisible) {
        activeTaskId = null;
      }
    }
  });

  function handleTaskSelect(taskId: string | null) {
    activeTaskId = taskId;
    // Clear tags when switching tasks (template will be loaded by effect)
    newEntryTags = [];
  }

  function openConfigModal() {
    showConfigModal = true;
  }

  function closeConfigModal() {
    showConfigModal = false;
  }

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
      // Auto-add task tag if a task tab is selected
      let tagsToAdd = [...newEntryTags];
      if (activeTask && !tagsToAdd.includes(activeTask.tag)) {
        tagsToAdd = [activeTask.tag, ...tagsToAdd];
      }

      await addEntry(text, tagsToAdd.length > 0 ? tagsToAdd : undefined);
      newEntryText = '';
      newEntryTags = [];

      // Reload template for next entry if task is selected
      if (activeTask) {
        const newCount = filteredEntries.length + 1;
        loadNextTemplate(activeTask, newCount)
          .then((content) => {
            newEntryText = content;
          })
          .catch(() => {
            newEntryText = '';
          });
      }
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

  <!-- Daily Task Tabs -->
  <DailyTaskTabs
    entries={sortedEntries}
    tasks={visibleTasks}
    {activeTaskId}
    onselect={handleTaskSelect}
    onconfigure={openConfigModal}
  />

  <!-- New Entry Input -->
  <div class="new-entry-section">
    {#if activeTask}
      <div class="task-hint" data-testid="task-hint">
        Adding entry with tag: <strong>{activeTask.tag}</strong>
      </div>
    {/if}
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
        disabled={!newEntryText.trim() || isAdding || isLoadingTemplate}
        data-testid="add-entry-btn"
      >
        {isAdding ? 'Adding...' : isLoadingTemplate ? 'Loading...' : 'Add Entry'}
      </button>
    </div>
    <div class="new-entry-editor">
      <CodeMirrorEditor content={newEntryText} onchange={handleEditorChange} />
    </div>
  </div>

  <!-- Entry List -->
  <div class="entries-list" data-testid="entries-list">
    {#if journalStore.isLoading}
      <p class="loading-state">Loading entries...</p>
    {:else if filteredEntries.length === 0}
      <p class="empty-state">
        {#if activeTask}
          No entries for this task
        {:else}
          No entries for this day
        {/if}
      </p>
    {:else}
      {#each filteredEntries as entry (entry.id)}
        <JournalEntry {entry} />
      {/each}
    {/if}
  </div>
</div>

<!-- Config Modal -->
<DailyTasksConfigModal visible={showConfigModal} onclose={closeConfigModal} />

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

  .task-hint {
    font-size: 0.75rem;
    color: var(--text-muted, #888);
    margin-bottom: 0.5rem;
    padding: 0.25rem 0.5rem;
    background: var(--dt-pending-bg, #3a3a3a);
    border-radius: 4px;
    display: inline-block;
  }

  .task-hint strong {
    color: var(--accent-color, #3794ff);
  }

  .new-entry-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .new-entry-editor {
    height: 80px;
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    overflow: hidden;
    transition: height 0.2s ease, border-color 0.2s ease;
  }

  .new-entry-editor:focus-within {
    height: 250px;
    border-color: var(--accent-color, #0078d4);
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
