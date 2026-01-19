<script lang="ts">
  import Tab from './Tab.svelte';
  import type { Tab as TabType } from '$lib/types/tabs';
  import { tabsStore, getActiveTab, switchTab, removeTab } from '$lib/stores/tabs.svelte';

  interface Props {
    ontabchange?: (tab: TabType | null) => void;
    onsave?: () => void;
    oncancel?: () => void;
  }

  let { ontabchange, onsave, oncancel }: Props = $props();

  const activeTab = $derived(getActiveTab());

  function handleTabClick(index: number) {
    switchTab(index);
    ontabchange?.(getActiveTab());
  }

  function handleTabClose(index: number) {
    if (removeTab(index)) {
      ontabchange?.(getActiveTab());
    }
  }
</script>

<div class="tab-bar" role="tablist" data-testid="tab-bar">
  <div class="tabs-container">
    {#if tabsStore.tabs.length === 0}
      <span class="no-file-open">No file open</span>
    {:else}
      {#each tabsStore.tabs as tab, index (tab.id)}
        <Tab
          {tab}
          isActive={index === tabsStore.activeTabIndex}
          onclick={() => handleTabClick(index)}
          onclose={() => handleTabClose(index)}
        />
      {/each}
    {/if}
  </div>
  {#if activeTab?.isDirty}
    <div class="tab-actions">
      <button class="tab-action-btn" onclick={onsave} data-testid="tab-save">Save</button>
      <button class="tab-action-btn" onclick={oncancel} data-testid="tab-cancel">Cancel</button>
    </div>
  {/if}
</div>

<style>
  .tab-bar {
    display: flex;
    flex: 1;
    min-width: 0;
    align-items: center;
    padding: 0 0.5rem;
  }

  .tabs-container {
    display: flex;
    gap: 2px;
    flex: 1;
    min-width: 0;
    overflow-x: auto;
    align-items: center;
  }

  .tab-actions {
    display: flex;
    gap: 4px;
    margin-left: 8px;
    flex-shrink: 0;
  }

  .tab-action-btn {
    background: transparent;
    border: 1px solid var(--border-color, #333);
    color: var(--text-muted, #888);
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    cursor: pointer;
    border-radius: 3px;
    transition: background 0.15s, color 0.15s;
  }

  .tab-action-btn:hover {
    background: var(--hover-bg, #2a2a2a);
    color: var(--text-color, #e0e0e0);
  }

  .no-file-open {
    color: var(--text-muted, #888);
    font-size: 0.85em;
    font-style: italic;
  }
</style>
