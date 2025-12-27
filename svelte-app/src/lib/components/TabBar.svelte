<script lang="ts">
  import Tab from './Tab.svelte';
  import type { Tab as TabType } from '$lib/types/tabs';
  import { tabsStore, getActiveTab, switchTab, removeTab } from '$lib/stores/tabs.svelte';

  interface Props {
    ontabchange?: (tab: TabType | null) => void;
  }

  let { ontabchange }: Props = $props();

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

<style>
  .tab-bar {
    display: flex;
    gap: 2px;
    overflow-x: auto;
    flex: 1;
    min-width: 0;
    align-items: center;
    padding: 0 0.5rem;
  }

  .tab-bar::-webkit-scrollbar {
    height: 4px;
  }

  .tab-bar::-webkit-scrollbar-track {
    background: transparent;
  }

  .tab-bar::-webkit-scrollbar-thumb {
    background: var(--border-color, #333);
    border-radius: 2px;
  }

  .no-file-open {
    color: var(--text-muted, #888);
    font-size: 0.85em;
    font-style: italic;
  }
</style>
