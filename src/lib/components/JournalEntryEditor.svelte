<script lang="ts">
  import { onDestroy, untrack, type Snippet } from 'svelte';
  import CodeMirrorEditor from './CodeMirrorEditor.svelte';
  import MarkdownPreview from './MarkdownPreview.svelte';
  import { on, type AppEvents } from '$lib/utils/eventBus';
  import { setFocusedPane } from '$lib/stores/editor.svelte';
  import { shortcut } from '$lib/actions/shortcut';

  interface Props {
    /** Initial view mode: 'edit' or 'view' */
    initialViewMode?: 'edit' | 'view';
    /** Custom toolbar content */
    toolbar?: Snippet;
    /** Content to display/edit */
    content?: string;
    /** Whether content is dirty (for save shortcut) */
    isDirty?: boolean;
    /** Content change callback */
    oncontentchange?: (content: string) => void;
    /** Save callback */
    onsave?: () => void;
    /** Cancel callback (revert changes) */
    oncancel?: () => void;
  }

  let {
    initialViewMode = 'edit',
    toolbar,
    content = '',
    isDirty = false,
    oncontentchange,
    onsave,
    oncancel,
  }: Props = $props();

  // View mode: 'edit' | 'view'
  // Capture initial value only - viewMode is managed internally after mount
  let viewMode = $state<'edit' | 'view'>(untrack(() => initialViewMode));

  // Reference to editor component for focus tracking
  let editorComponent: CodeMirrorEditor | null = $state(null);

  // Listen for pane:toggleView events for right pane
  const unsubscribeToggleView = on('pane:toggleView', (data: AppEvents['pane:toggleView']) => {
    if (data.pane === 'right') {
      toggleViewMode();
    }
  });

  onDestroy(() => {
    unsubscribeToggleView();
  });

  function handleContentChange(newContent: string) {
    oncontentchange?.(newContent);
  }

  function handleSaveClick() {
    onsave?.();
  }

  function handleCancelClick() {
    oncancel?.();
  }

  function handleFocus() {
    setFocusedPane('right');
  }

  /**
   * Toggle view mode between edit and view
   */
  export function toggleViewMode(): void {
    viewMode = viewMode === 'edit' ? 'view' : 'edit';
  }

  /**
   * Get current view mode
   */
  export function getViewMode(): 'edit' | 'view' {
    return viewMode;
  }

  /**
   * Set view mode
   */
  export function setViewMode(newMode: 'edit' | 'view'): void {
    viewMode = newMode;
  }

  /**
   * Focus the editor (if in edit mode)
   */
  export function focus(): void {
    if (viewMode === 'edit') {
      editorComponent?.focus();
    }
  }

  /**
   * Check if this editor has focus
   */
  export function hasFocus(): boolean {
    return editorComponent?.hasFocus() ?? false;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="journal-entry-editor"
  data-testid="journal-entry-editor"
  onfocusin={handleFocus}
  onmousedown={handleFocus}
  use:shortcut={{
    binding: 'save',
    handler: handleSaveClick,
    when: { check: () => isDirty }
  }}
>
  <header class="editor-toolbar" data-testid="journal-entry-toolbar">
    {#if toolbar}
      {@render toolbar()}
    {:else}
      <span class="placeholder">Journal Entry</span>
      {#if isDirty}
        <div class="toolbar-actions">
          <button
            class="view-toggle"
            onclick={handleSaveClick}
            data-testid="journal-entry-save"
          >
            Save
          </button>
          <button
            class="view-toggle"
            onclick={handleCancelClick}
            data-testid="journal-entry-cancel"
          >
            Cancel
          </button>
        </div>
      {:else}
        <div class="toolbar-actions">
          <button
            class="view-toggle"
            class:active={viewMode === 'edit'}
            onclick={() => (viewMode = 'edit')}
            data-testid="view-toggle-edit"
          >
            Edit
          </button>
          <button
            class="view-toggle"
            class:active={viewMode === 'view'}
            onclick={() => (viewMode = 'view')}
            data-testid="view-toggle-view"
          >
            View
          </button>
        </div>
      {/if}
    {/if}
  </header>

  <div class="editor-content">
    {#if viewMode === 'edit'}
      <CodeMirrorEditor bind:this={editorComponent} content={content} onchange={handleContentChange} />
    {:else}
      <MarkdownPreview content={content} />
    {/if}
  </div>
</div>

<style>
  .journal-entry-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 0;
    background: var(--editor-bg, #1e1e1e);
  }

  .editor-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    background: var(--toolbar-bg, #252526);
    border-bottom: 1px solid var(--border-color, #333);
    flex-shrink: 0;
    min-height: 42px;
  }

  .placeholder {
    color: var(--text-muted, #888);
    font-size: 0.9rem;
  }

  /* Toolbar button styles - :global for custom toolbar snippets */
  .editor-toolbar :global(.toolbar-actions) {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
    margin-left: auto;
  }

  .editor-toolbar :global(.view-toggle) {
    background: transparent;
    border: 1px solid var(--border-color, #333);
    color: var(--text-muted, #888);
    padding: 0.25rem 0.75rem;
    font-size: 0.8rem;
    cursor: pointer;
    border-radius: 3px;
    transition:
      background 0.15s,
      color 0.15s;
  }

  .editor-toolbar :global(.view-toggle:hover) {
    background: var(--hover-bg, #2a2a2a);
    color: var(--text-color, #e0e0e0);
  }

  .editor-toolbar :global(.view-toggle.active) {
    background: var(--accent-color, #0078d4);
    border-color: var(--accent-color, #0078d4);
    color: #fff;
  }

  .editor-toolbar :global(.view-toggle:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .editor-content {
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }
</style>
