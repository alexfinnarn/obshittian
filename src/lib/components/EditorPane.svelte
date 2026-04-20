<script lang="ts">
  /**
   * EditorPane - Left pane editor with tabs
   *
   * This component is specifically for the left pane file editor with tab support.
   * For journal entries, use JournalEntryEditor instead.
   */
  import { onDestroy, untrack } from 'svelte';
  import CodeMirrorEditor from './CodeMirrorEditor.svelte';
  import MarkdownPreview from './MarkdownPreview.svelte';
  import TabBar from './TabBar.svelte';
  import { on, type AppEvents } from '$lib/utils/eventBus';
  import { setFocusedPane } from '$lib/stores/editor.svelte';
  import { tabsStore, getActiveTab } from '$lib/stores/tabs.svelte';
  import type { Tab } from '$lib/types/tabs';
  import { shortcut } from '$lib/actions/shortcut';

  interface Props {
    /** Initial view mode: 'edit' or 'view' */
    initialViewMode?: 'edit' | 'view';
    /** Whether the pane can currently collapse */
    cancollapse?: boolean;
    /** Content change callback */
    oncontentchange?: (content: string) => void;
    /** Collapse callback */
    oncollapse?: () => void;
    /** Save callback */
    onsave?: () => void;
    /** Cancel callback (revert changes) */
    oncancel?: () => void;
  }

  let {
    initialViewMode = 'edit',
    cancollapse = true,
    oncontentchange,
    oncollapse,
    onsave,
    oncancel,
  }: Props = $props();

  // View mode: 'edit' | 'view'
  // Capture initial value only - viewMode is managed internally after mount
  let viewMode = $state<'edit' | 'view'>(untrack(() => initialViewMode));

  // Reference to editor component for focus tracking
  let editorComponent: CodeMirrorEditor | null = $state(null);

  // Listen for pane:toggleView events for left pane
  const unsubscribeToggleView = on('pane:toggleView', (data: AppEvents['pane:toggleView']) => {
    if (data.pane === 'left') {
      toggleViewMode();
    }
  });

  onDestroy(() => {
    unsubscribeToggleView();
  });

  // Derive values from active tab
  const effectiveContent = $derived(getActiveTab()?.editorContent ?? '');
  const effectiveIsDirty = $derived(getActiveTab()?.isDirty ?? false);

  function handleContentChange(newContent: string) {
    oncontentchange?.(newContent);
  }

  function handleSaveClick() {
    onsave?.();
  }

  function handleCollapseClick() {
    oncollapse?.();
  }

  function handleCancelClick() {
    oncancel?.();
  }

  function handleFocus() {
    setFocusedPane('left');
  }

  function handleTabChange(tab: Tab | null) {
    // When switching tabs, the content derivation handles this automatically
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
   * Check if this pane's editor has focus
   */
  export function hasFocus(): boolean {
    return editorComponent?.hasFocus() ?? false;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="editor-pane"
  data-testid="editor-pane-left"
  onfocusin={handleFocus}
  onmousedown={handleFocus}
  use:shortcut={{
    binding: 'save',
    handler: handleSaveClick,
    when: { check: () => effectiveIsDirty }
  }}
>
  <header class="pane-toolbar" data-testid="pane-toolbar-left">
    <div class="pane-toolbar-start">
      {#if oncollapse}
        <button
          class="pane-collapse-button"
          onclick={handleCollapseClick}
          aria-label="Collapse files pane"
          title="Collapse files pane"
          data-testid="collapse-left-pane"
          disabled={!cancollapse}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6"></path>
          </svg>
        </button>
      {/if}
      <TabBar ontabchange={handleTabChange} onsave={handleSaveClick} oncancel={handleCancelClick} />
    </div>
    <div class="view-toggle-group">
      <button
        class="view-toggle"
        class:active={viewMode === 'edit'}
        onclick={() => (viewMode = 'edit')}
        aria-label="Edit mode"
        data-testid="editor-view-toggle-edit"
      >
        Edit
      </button>
      <button
        class="view-toggle"
        class:active={viewMode === 'view'}
        onclick={() => (viewMode = 'view')}
        aria-label="View mode"
        data-testid="editor-view-toggle-view"
      >
        View
      </button>
    </div>
  </header>

  <div class="pane-content">
    <div
      class="pane-content-shell"
      class:writing-shell={viewMode === 'edit'}
      class:reading-shell={viewMode === 'view'}
    >
      {#if viewMode === 'edit'}
        <CodeMirrorEditor bind:this={editorComponent} content={effectiveContent} onchange={handleContentChange} />
      {:else}
        <MarkdownPreview content={effectiveContent} />
      {/if}
    </div>
  </div>
</div>

<style>
  .editor-pane {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 0;
    background: var(--editor-bg, #1e1e1e);
  }

  .pane-toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--toolbar-bg, #252526);
    border-bottom: 1px solid var(--border-color, #333);
    flex-shrink: 0;
    min-height: 42px;
  }

  .pane-content {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
  }

  .pane-content-shell {
    flex: 1;
    width: min(100%, var(--content-measure));
    min-width: 0;
    height: 100%;
    margin-inline: auto;
  }

  .pane-content-shell.reading-shell {
    --content-measure: 72ch;
  }

  .pane-content-shell.writing-shell {
    --content-measure: 84ch;
  }

  .pane-toolbar-start {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }

  .pane-collapse-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border: 1px solid var(--border-color, #333);
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted, #888);
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  .pane-collapse-button:hover:not(:disabled) {
    background: var(--hover-bg, #2a2a2a);
    color: var(--text-color, #e0e0e0);
  }

  .pane-collapse-button:disabled {
    opacity: 0.45;
    cursor: default;
  }

  .view-toggle-group {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
    margin-left: auto;
    padding-left: 0.5rem;
  }

  .view-toggle {
    background: transparent;
    border: 1px solid var(--border-color, #333);
    color: var(--text-muted, #888);
    padding: 0.25rem 0.75rem;
    font-size: 0.8rem;
    cursor: pointer;
    border-radius: 3px;
    transition: background 0.15s, color 0.15s;
    min-height: 32px;
  }

  .view-toggle:hover {
    background: var(--hover-bg, #2a2a2a);
    color: var(--text-color, #e0e0e0);
  }

  .view-toggle.active {
    background: var(--accent-color, #0078d4);
    border-color: var(--accent-color, #0078d4);
    color: #fff;
  }

  /* Mobile: larger touch targets */
  @media (max-width: 767px) {
    .view-toggle {
      min-height: 44px;
      padding: 0.5rem 1rem;
    }
  }
</style>
