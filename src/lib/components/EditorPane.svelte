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
    /** Content change callback */
    oncontentchange?: (content: string) => void;
    /** Save callback */
    onsave?: () => void;
    /** Cancel callback (revert changes) */
    oncancel?: () => void;
  }

  let {
    initialViewMode = 'edit',
    oncontentchange,
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
    <TabBar ontabchange={handleTabChange} onsave={handleSaveClick} oncancel={handleCancelClick} />
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

  .pane-content {
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }
</style>
