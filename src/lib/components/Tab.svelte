<script lang="ts">
  import type { Tab } from '$lib/types/tabs';

  interface Props {
    tab: Tab;
    isActive: boolean;
    onclose: () => void;
    onclick: () => void;
  }

  let { tab, isActive, onclose, onclick }: Props = $props();

  function handleClose(e: MouseEvent) {
    e.stopPropagation();
    onclose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onclick();
    }
  }
</script>

<div
  class="tab"
  class:active={isActive}
  onclick={onclick}
  onkeydown={handleKeydown}
  role="tab"
  tabindex="0"
  aria-selected={isActive}
  data-testid="tab-{tab.id}"
>
  <span class="tab-filename" title={tab.filePath}>{tab.filename}</span>
  {#if tab.isDirty}
    <span class="tab-unsaved" data-testid="tab-unsaved-{tab.id}">●</span>
  {/if}
  <button
    class="tab-close"
    onclick={handleClose}
    title="Close"
    aria-label="Close {tab.filename}"
    data-testid="tab-close-{tab.id}"
  >
    ×
  </button>
</div>

<style>
  .tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: var(--editor-bg, #1e1e1e);
    border: 1px solid var(--border-color, #333);
    border-bottom: none;
    border-radius: 4px 4px 0 0;
    cursor: pointer;
    max-width: 150px;
    min-width: 60px;
    flex-shrink: 0;
    transition: background 0.15s;
  }

  .tab:hover {
    background: var(--hover-bg, #333);
  }

  .tab:focus {
    outline: 1px solid var(--accent-color, #3794ff);
    outline-offset: -1px;
  }

  .tab.active {
    background: var(--toolbar-bg, #252526);
    border-color: var(--accent-color, #3794ff);
    border-bottom: 1px solid var(--toolbar-bg, #252526);
    margin-bottom: -1px;
  }

  .tab-filename {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.8em;
    color: var(--accent-color, #3794ff);
  }

  .tab.active .tab-filename {
    font-weight: 500;
  }

  .tab-unsaved {
    color: var(--warning-color, #eebb00);
    font-size: 0.7em;
    flex-shrink: 0;
  }

  .tab-close {
    opacity: 0;
    cursor: pointer;
    font-size: 1em;
    padding: 0 2px;
    line-height: 1;
    color: var(--text-muted, #888);
    flex-shrink: 0;
    transition:
      opacity 0.15s,
      color 0.15s;
    background: transparent;
    border: none;
  }

  .tab:hover .tab-close {
    opacity: 0.6;
  }

  .tab-close:hover {
    opacity: 1 !important;
    color: #ff6b6b;
  }
</style>
