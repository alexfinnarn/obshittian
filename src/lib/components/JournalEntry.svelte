<script lang="ts">
  import type { JournalEntry } from '$lib/types/journal';
  import {
    updateEntryText,
    updateEntryTags,
    updateEntryOrder,
    removeEntry,
  } from '$lib/stores/journal.svelte';
  import JournalEntryEditor from './JournalEntryEditor.svelte';
  import TagInput from './TagInput.svelte';
  import { shortcut } from '$lib/actions/shortcut';

  interface Props {
    entry: JournalEntry;
  }

  let { entry }: Props = $props();

  let editorPane = $state<JournalEntryEditor | null>(null);
  let editText = $state('');
  let editTags = $state<string[]>([]);
  let editOrder = $state(0);
  let isSaving = $state(false);
  let isEditing = $state(false);

  // Format timestamp for display
  function formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function enterEditMode() {
    editText = entry.text;
    editTags = [...entry.tags];
    editOrder = entry.order;
    isEditing = true;
    editorPane?.setViewMode('edit');
  }

  function handleTagsChange(tags: string[]) {
    editTags = tags;
  }

  // Check if tags arrays are different
  function tagsChanged(): boolean {
    if (editTags.length !== entry.tags.length) return true;
    return editTags.some((t, i) => t !== entry.tags[i]);
  }

  async function handleSave() {
    if (isSaving) return;
    isSaving = true;

    try {
      // Only update fields that changed
      if (editText !== entry.text) {
        await updateEntryText(entry.id, editText);
      }
      if (tagsChanged()) {
        await updateEntryTags(entry.id, editTags);
      }
      if (editOrder !== entry.order) {
        await updateEntryOrder(entry.id, editOrder);
      }
      isEditing = false;
      editorPane?.setViewMode('view');
    } finally {
      isSaving = false;
    }
  }

  function handleCancel() {
    isEditing = false;
    editorPane?.setViewMode('view');
  }

  async function handleDelete(event: MouseEvent) {
    event.stopPropagation();
    if (confirm('Delete this entry?')) {
      await removeEntry(entry.id);
    }
  }

  function handleContentChange(content: string) {
    editText = content;
  }
</script>

<div
  class="journal-entry"
  class:editing={isEditing}
  data-testid="journal-entry-{entry.id}"
  use:shortcut={{
    binding: 'save',
    handler: handleSave,
    when: { check: () => isEditing }
  }}
>
  <JournalEntryEditor
    bind:this={editorPane}
    initialViewMode="view"
    content={isEditing ? editText : entry.text}
    oncontentchange={handleContentChange}
  >
    {#snippet toolbar()}
      {#if isEditing}
        <!-- Edit Mode Toolbar -->
        <div class="tags-edit-wrapper">
          <TagInput
            tags={editTags}
            onchange={handleTagsChange}
            placeholder="Add tags..."
          />
        </div>
        <label class="order-label">
          Order:
          <input
            type="number"
            bind:value={editOrder}
            class="order-input"
            min="1"
            data-testid="journal-entry-order-{entry.id}"
          />
        </label>
        <div class="toolbar-actions">
          <button
            class="view-toggle"
            onclick={handleSave}
            disabled={isSaving}
            data-testid="journal-entry-save-{entry.id}"
          >
            Save
          </button>
          <button
            class="view-toggle"
            onclick={handleCancel}
            data-testid="journal-entry-cancel-{entry.id}"
          >
            Cancel
          </button>
        </div>
      {:else}
        <!-- View Mode Toolbar -->
        {#if entry.tags.length > 0}
          <div class="tags-view">
            {#each entry.tags as tag}
              <span class="tag-badge">{tag}</span>
            {/each}
          </div>
        {/if}
        <span class="order">#{entry.order}</span>
        <span class="timestamp">
          {#if entry.createdAt !== entry.updatedAt}
            <strong>C:</strong> {formatTime(entry.createdAt)} | <strong>U:</strong> {formatTime(entry.updatedAt)}
          {:else}
            <strong>C:</strong> {formatTime(entry.createdAt)}
          {/if}
        </span>
        <div class="toolbar-actions">
          <button
            class="view-toggle"
            onclick={enterEditMode}
            data-testid="journal-entry-edit-{entry.id}"
          >
            Edit
          </button>
          <button
            class="view-toggle delete"
            onclick={handleDelete}
            data-testid="journal-entry-delete-{entry.id}"
          >
            Delete
          </button>
        </div>
      {/if}
    {/snippet}
  </JournalEntryEditor>
</div>

<style>
  .journal-entry {
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    margin-bottom: 0.5rem;
    overflow: hidden;
    transition: border-color 0.2s ease;
  }

  /* When editing, expand similar to new entry input */
  .journal-entry.editing {
    border-color: var(--accent-color, #0078d4);
  }

  /* Control the editor height inside the entry */
  .journal-entry {
    transition: height 0.2s ease;
  }

  /* Expand when editing and focused */
  .journal-entry.editing {
    height: 200px;
  }

  .journal-entry.editing:focus-within {
    height: 250px;
  }

  /* Toolbar items - these need :global because they're rendered inside EditorPane's toolbar slot */
  .journal-entry :global(.tags-view) {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .journal-entry :global(.tag-badge) {
    background: var(--accent-color, #0078d4);
    color: white;
    padding: 0.125rem 0.375rem;
    border-radius: 3px;
    font-size: 0.625rem;
    font-weight: 500;
  }

  .journal-entry :global(.tags-edit-wrapper) {
    flex: 1;
    min-width: 120px;
    max-width: 200px;
  }

  .journal-entry :global(.order) {
    color: var(--text-muted, #888);
    font-size: 0.8rem;
  }

  .journal-entry :global(.timestamp) {
    color: var(--text-muted, #888);
    font-size: 0.8rem;
    margin-left: auto;
  }

  .journal-entry :global(.order-label) {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8rem;
    color: var(--text-muted, #888);
  }

  .journal-entry :global(.order-input) {
    width: 50px;
    background: var(--input-bg, #1e1e1e);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    color: var(--text-color, #fff);
    font-size: 0.8rem;
    padding: 0.25rem;
    text-align: center;
  }

  .journal-entry :global(.order-input:focus) {
    outline: none;
    border-color: var(--accent-color, #0078d4);
  }

  /* Use EditorPane's button styles, add delete variant */
  .journal-entry :global(.view-toggle.delete:hover) {
    background: var(--error-color, #f44);
    border-color: var(--error-color, #f44);
    color: #fff;
  }
</style>
