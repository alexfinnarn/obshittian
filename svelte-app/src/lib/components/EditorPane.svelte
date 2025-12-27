<script lang="ts">
  import CodeMirrorEditor from './CodeMirrorEditor.svelte';
  import MarkdownPreview from './MarkdownPreview.svelte';
  import TabBar from './TabBar.svelte';
  import { emit } from '$lib/utils/eventBus';
  import { setFocusedPane, type PaneId } from '$lib/stores/editor.svelte';
  import { tabsStore, getActiveTab } from '$lib/stores/tabs.svelte';
  import type { Tab } from '$lib/types/tabs';

  interface Props {
    pane: PaneId;
    /** Display mode: 'single' for right pane, 'tabs' for left pane */
    mode?: 'single' | 'tabs';
    /** Filename (used in single mode) */
    filename?: string;
    /** Content (used in single mode) */
    content?: string;
    /** Dirty state (used in single mode) */
    isDirty?: boolean;
    /** Content change callback */
    oncontentchange?: (content: string) => void;
  }

  let {
    pane,
    mode = 'single',
    filename = '',
    content = '',
    isDirty = false,
    oncontentchange,
  }: Props = $props();

  // View mode: 'edit' | 'view'
  let viewMode = $state<'edit' | 'view'>('edit');

  // Reference to editor component for focus tracking
  let editorComponent: CodeMirrorEditor | null = $state(null);

  // Derive effective values based on mode
  // In tabs mode, these come from the active tab
  // In single mode, these come from props
  const effectiveContent = $derived(
    mode === 'tabs' ? (getActiveTab()?.editorContent ?? '') : content
  );
  const effectiveFilename = $derived(
    mode === 'tabs' ? (getActiveTab()?.filename ?? '') : filename
  );
  const effectiveIsDirty = $derived(
    mode === 'tabs' ? (getActiveTab()?.isDirty ?? false) : isDirty
  );
  const hasFile = $derived(
    mode === 'tabs' ? tabsStore.tabs.length > 0 : !!filename
  );

  function handleContentChange(newContent: string) {
    oncontentchange?.(newContent);
  }

  function handleSave() {
    emit('file:save', { pane });
  }

  function handleFocus() {
    setFocusedPane(pane);
  }

  function handleTabChange(tab: Tab | null) {
    // When switching tabs, we could emit an event or notify parent
    // For now, the content derivation handles this automatically
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
  data-testid="editor-pane-{pane}"
  onfocusin={handleFocus}
  onmousedown={handleFocus}
>
  <header class="pane-toolbar" data-testid="pane-toolbar-{pane}">
    {#if mode === 'tabs'}
      <TabBar ontabchange={handleTabChange} />
    {:else}
      <span class="filename" data-testid="pane-filename-{pane}">
        {effectiveFilename || 'No file open'}
        {#if effectiveIsDirty}
          <span class="unsaved-indicator" data-testid="unsaved-indicator-{pane}">●</span>
        {/if}
      </span>
    {/if}

    <div class="toolbar-actions">
      <button
        class="view-toggle"
        class:active={viewMode === 'edit'}
        onclick={() => (viewMode = 'edit')}
        data-testid="view-toggle-edit-{pane}"
      >
        Edit
      </button>
      <button
        class="view-toggle"
        class:active={viewMode === 'view'}
        onclick={() => (viewMode = 'view')}
        data-testid="view-toggle-view-{pane}"
      >
        View
      </button>
    </div>
  </header>

  <div class="pane-content">
    {#if viewMode === 'edit'}
      <CodeMirrorEditor bind:this={editorComponent} content={effectiveContent} onchange={handleContentChange} />
    {:else}
      <MarkdownPreview content={effectiveContent} />
    {/if}
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
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    background: var(--toolbar-bg, #252526);
    border-bottom: 1px solid var(--border-color, #333);
    flex-shrink: 0;
    min-height: 42px;
  }

  .filename {
    color: var(--text-color, #e0e0e0);
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .unsaved-indicator {
    color: var(--warning-color, #e8a300);
    margin-left: 0.5rem;
  }

  .toolbar-actions {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
    margin-left: 0.5rem;
  }

  .view-toggle {
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

  .view-toggle:hover {
    background: var(--hover-bg, #2a2a2a);
    color: var(--text-color, #e0e0e0);
  }

  .view-toggle.active {
    background: var(--accent-color, #0078d4);
    border-color: var(--accent-color, #0078d4);
    color: #fff;
  }

  .pane-content {
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }
</style>
