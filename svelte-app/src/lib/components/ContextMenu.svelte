<script lang="ts">
  import { clickOutside } from '$lib/actions/clickOutside';

  export interface MenuItem {
    label: string;
    action: () => void;
    disabled?: boolean;
    separator?: boolean;
  }

  interface Props {
    visible?: boolean;
    x?: number;
    y?: number;
    items?: MenuItem[];
    onclose?: () => void;
  }

  let {
    visible = false,
    x = 0,
    y = 0,
    items = [],
    onclose,
  }: Props = $props();

  let menuElement: HTMLDivElement | undefined = $state();

  // Adjust position to keep menu within viewport
  function getAdjustedPosition(menuEl: HTMLDivElement | undefined) {
    if (!menuEl || typeof window === 'undefined') {
      return { left: x, top: y };
    }

    const rect = menuEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = x;
    let top = y;

    // Adjust horizontal position if menu would overflow right edge
    if (x + rect.width > viewportWidth) {
      left = viewportWidth - rect.width - 8;
    }

    // Adjust vertical position if menu would overflow bottom edge
    if (y + rect.height > viewportHeight) {
      top = viewportHeight - rect.height - 8;
    }

    // Ensure menu doesn't go off left or top edge
    left = Math.max(8, left);
    top = Math.max(8, top);

    return { left, top };
  }

  function handleItemClick(item: MenuItem) {
    if (item.disabled) return;
    item.action();
    onclose?.();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && visible && onclose) {
      event.preventDefault();
      onclose();
    }
  }

  // Calculate position based on menu element
  const position = $derived(getAdjustedPosition(menuElement));
</script>

<svelte:window onkeydown={handleKeydown} />

{#if visible}
  <div
    bind:this={menuElement}
    class="context-menu"
    style="left: {position.left}px; top: {position.top}px;"
    use:clickOutside={onclose ?? (() => {})}
    role="menu"
    data-testid="context-menu"
  >
    {#each items as item, i}
      {#if item.separator}
        <div class="separator" role="separator" data-testid="menu-separator-{i}"></div>
      {:else}
        <button
          class="menu-item"
          class:disabled={item.disabled}
          onclick={() => handleItemClick(item)}
          disabled={item.disabled}
          role="menuitem"
          data-testid="menu-item-{i}"
        >
          {item.label}
        </button>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .context-menu {
    position: fixed;
    background: var(--context-menu-bg, #2d2d2d);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    min-width: 160px;
    padding: 4px 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 1001;
  }

  .menu-item {
    display: block;
    width: 100%;
    padding: 8px 16px;
    text-align: left;
    background: none;
    border: none;
    color: var(--text-color, #fff);
    font-size: 0.875rem;
    cursor: pointer;
  }

  .menu-item:hover:not(.disabled) {
    background: var(--hover-bg, #3a3a3a);
  }

  .menu-item.disabled {
    color: var(--text-muted, #666);
    cursor: not-allowed;
  }

  .separator {
    height: 1px;
    background: var(--border-color, #444);
    margin: 4px 8px;
  }
</style>
