<script lang="ts">
  import Fuse from 'fuse.js';
  import { clickOutside } from '$lib/actions/clickOutside';
  import { tagVocabulary, getTags, addTag, saveTagVocabulary } from '$lib/stores/tagVocabulary.svelte';
  import type { VocabularyTag } from '$lib/types/tagVocabulary';

  interface Props {
    /** Currently selected tags */
    tags: string[];
    /** Callback when tags change */
    onchange: (tags: string[]) => void;
    /** Placeholder text when no tags */
    placeholder?: string;
    /** Allow creating new tags not in vocabulary */
    allowNew?: boolean;
    /** Disabled state */
    disabled?: boolean;
  }

  let {
    tags,
    onchange,
    placeholder = 'Add tags...',
    allowNew = true,
    disabled = false,
  }: Props = $props();

  let inputValue = $state('');
  let showDropdown = $state(false);
  let selectedIndex = $state(0);
  let inputRef: HTMLInputElement | null = $state(null);

  // Fuse.js instance for fuzzy search
  let fuse = $derived(
    new Fuse(getTags(), {
      keys: ['name'],
      threshold: 0.4,
      includeScore: true,
    })
  );

  // Filter suggestions based on input
  let suggestions = $derived.by(() => {
    if (!inputValue.trim()) {
      // Show top tags not already selected
      return getTags()
        .filter((t) => !tags.includes(t.name))
        .slice(0, 8);
    }

    // Fuzzy search and filter out already selected
    const results = fuse.search(inputValue.trim());
    return results
      .map((r) => r.item)
      .filter((t) => !tags.includes(t.name))
      .slice(0, 8);
  });

  // Check if current input matches an existing tag
  let inputMatchesExisting = $derived(
    suggestions.some((s) => s.name.toLowerCase() === inputValue.trim().toLowerCase())
  );

  // Show "Create new" option when input doesn't match and allowNew is true
  let showCreateOption = $derived(
    allowNew &&
      inputValue.trim() &&
      !inputMatchesExisting &&
      !tags.includes(inputValue.trim().toLowerCase())
  );

  function handleInput(event: Event) {
    inputValue = (event.target as HTMLInputElement).value;
    showDropdown = true;
    selectedIndex = 0;
  }

  function handleFocus() {
    showDropdown = true;
    selectedIndex = 0;
  }

  function handleClickOutside() {
    showDropdown = false;
  }

  function addTagFromInput(tagName: string) {
    const normalized = tagName.trim().toLowerCase();
    if (!normalized || tags.includes(normalized)) return;

    // Add to vocabulary if new
    if (!tagVocabulary.tags.some((t) => t.name === normalized)) {
      addTag(normalized);
      saveTagVocabulary();
    }

    onchange([...tags, normalized]);
    inputValue = '';
    showDropdown = false;
    selectedIndex = 0;
    inputRef?.focus();
  }

  function removeTag(tagName: string) {
    onchange(tags.filter((t) => t !== tagName));
    inputRef?.focus();
  }

  function handleKeydown(event: KeyboardEvent) {
    const totalOptions = suggestions.length + (showCreateOption ? 1 : 0);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!showDropdown) {
          showDropdown = true;
        } else {
          selectedIndex = (selectedIndex + 1) % totalOptions;
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (showDropdown) {
          selectedIndex = selectedIndex <= 0 ? totalOptions - 1 : selectedIndex - 1;
        }
        break;

      case 'Enter':
      case 'Tab':
        if (showDropdown && totalOptions > 0) {
          event.preventDefault();
          if (showCreateOption && selectedIndex === suggestions.length) {
            // Create new tag
            addTagFromInput(inputValue.trim());
          } else if (suggestions[selectedIndex]) {
            // Add existing tag
            addTagFromInput(suggestions[selectedIndex].name);
          }
        } else if (event.key === 'Enter' && inputValue.trim() && allowNew) {
          event.preventDefault();
          addTagFromInput(inputValue.trim());
        }
        break;

      case 'Backspace':
        if (!inputValue && tags.length > 0) {
          event.preventDefault();
          removeTag(tags[tags.length - 1]);
        }
        break;

      case 'Escape':
        showDropdown = false;
        break;
    }
  }

  function handleSuggestionClick(tagName: string) {
    addTagFromInput(tagName);
  }

  function handleCreateClick() {
    addTagFromInput(inputValue.trim());
  }

  function handleRemoveClick(event: MouseEvent, tagName: string) {
    event.stopPropagation();
    removeTag(tagName);
  }
</script>

<div
  class="tag-input-container"
  use:clickOutside={handleClickOutside}
  data-testid="tag-input"
>
  <div class="tag-input-inner" class:disabled>
    <!-- Existing tags as pills -->
    {#each tags as tag}
      <span class="tag-pill" data-testid="tag-pill">
        {tag}
        {#if !disabled}
          <button
            type="button"
            class="remove-tag"
            onclick={(e) => handleRemoveClick(e, tag)}
            data-testid="remove-tag"
          >
            &times;
          </button>
        {/if}
      </span>
    {/each}

    <!-- Input field -->
    <input
      bind:this={inputRef}
      type="text"
      class="tag-input"
      value={inputValue}
      oninput={handleInput}
      onfocus={handleFocus}
      onkeydown={handleKeydown}
      placeholder={tags.length === 0 ? placeholder : ''}
      {disabled}
      data-testid="tag-input-field"
    />
  </div>

  <!-- Autocomplete dropdown -->
  {#if showDropdown && !disabled && (suggestions.length > 0 || showCreateOption)}
    <div class="autocomplete-dropdown" data-testid="autocomplete-dropdown">
      {#each suggestions as suggestion, i}
        <button
          type="button"
          class="suggestion-item"
          class:selected={i === selectedIndex}
          onclick={() => handleSuggestionClick(suggestion.name)}
          data-testid="suggestion-item"
        >
          <span class="suggestion-name">{suggestion.name}</span>
          <span class="suggestion-count">({suggestion.count})</span>
        </button>
      {/each}

      {#if showCreateOption}
        <button
          type="button"
          class="suggestion-item create-new"
          class:selected={selectedIndex === suggestions.length}
          onclick={handleCreateClick}
          data-testid="create-new-option"
        >
          Create "{inputValue.trim()}"
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .tag-input-container {
    position: relative;
    width: 100%;
  }

  .tag-input-inner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.5rem;
    border: 1px solid var(--border-color, #333);
    border-radius: 4px;
    background: var(--input-bg, #2d2d2d);
    min-height: 2rem;
    cursor: text;
  }

  .tag-input-inner:focus-within {
    border-color: var(--accent-color, #3794ff);
  }

  .tag-input-inner.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .tag-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.375rem;
    background: var(--accent-color, #3794ff);
    color: white;
    font-size: 0.75rem;
    border-radius: 3px;
    white-space: nowrap;
  }

  .remove-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    padding: 0;
    border: none;
    background: transparent;
    color: white;
    font-size: 0.875rem;
    line-height: 1;
    cursor: pointer;
    opacity: 0.7;
    border-radius: 2px;
  }

  .remove-tag:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.2);
  }

  .tag-input {
    flex: 1;
    min-width: 60px;
    padding: 0.125rem;
    border: none;
    background: transparent;
    color: var(--text-color, #d4d4d4);
    font-size: 0.875rem;
    outline: none;
  }

  .tag-input::placeholder {
    color: var(--text-muted, #888);
  }

  .tag-input:disabled {
    cursor: not-allowed;
  }

  .autocomplete-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 2px;
    background: var(--dropdown-bg, #2d2d2d);
    border: 1px solid var(--border-color, #333);
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100;
    max-height: 200px;
    overflow-y: auto;
  }

  .suggestion-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.5rem;
    border: none;
    background: transparent;
    color: var(--text-color, #d4d4d4);
    font-size: 0.875rem;
    text-align: left;
    cursor: pointer;
  }

  .suggestion-item:hover,
  .suggestion-item.selected {
    background: var(--hover-bg, #3a3a3a);
  }

  .suggestion-name {
    flex: 1;
  }

  .suggestion-count {
    font-size: 0.75rem;
    color: var(--text-muted, #888);
    margin-left: 0.5rem;
  }

  .suggestion-item.create-new {
    border-top: 1px solid var(--border-color, #333);
    color: var(--accent-color, #3794ff);
    font-style: italic;
  }
</style>
