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
    padding: 8px 12px;
    background: transparent;
    border: none;
    border-right: 1px solid var(--border-color, #333);
    border-radius: 0;
    cursor: pointer;
    max-width: 150px;
    min-width: 80px;
    flex-shrink: 0;
    transition: background 0.15s;
    box-shadow: inset 0 2px 0 transparent;
    position: relative;
  }

  .tab:hover {
    background: var(--hover-bg, #333);
  }

  .tab:focus-visible {
    outline: 2px solid var(--accent-color, #3794ff);
    outline-offset: -2px;
    z-index: 1;
  }
  
  .tab:focus {
    outline: none;
  }

  .tab.active {
    background: var(--editor-bg, #1e1e1e);
    box-shadow: inset 0 2px 0 var(--accent-color, #3794ff);
  }
  
  .tab.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--editor-bg, #1e1e1e);
  }

  .tab-filename {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.85em;
    color: var(--text-muted, #888);
  }

  .tab.active .tab-filename {
    font-weight: 500;
    color: var(--text-primary, #e0e0e0);
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
    color: var(--error);
  }
</style>
