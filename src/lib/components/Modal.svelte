<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { Snippet } from 'svelte';
  import { blockShortcuts } from '$lib/stores/shortcuts.svelte';

  interface Props {
    visible?: boolean;
    title?: string;
    onclose?: () => void;
    children?: Snippet;
    footer?: Snippet;
  }

  let {
    visible = false,
    title = '',
    onclose,
    children,
    footer,
  }: Props = $props();

  // Track the unblock function outside of $effect to avoid reactivity issues
  let currentUnblock: (() => void) | null = null;

  // Block shortcuts when modal becomes visible
  $effect.pre(() => {
    const wasBlocked = currentUnblock !== null;
    const shouldBlock = visible;

    if (shouldBlock && !wasBlocked) {
      currentUnblock = blockShortcuts('modal');
    } else if (!shouldBlock && wasBlocked) {
      currentUnblock?.();
      currentUnblock = null;
    }
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && visible && onclose) {
      event.preventDefault();
      onclose();
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    // Only close if clicking directly on backdrop, not children
    if (event.target === event.currentTarget && onclose) {
      onclose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if visible}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="modal-backdrop"
    transition:fade={{ duration: 150 }}
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
    data-testid="modal-backdrop"
  >
    <div class="modal" data-testid="modal">
      <header class="modal-header">
        <h2 id="modal-title">{title}</h2>
        <button
          class="modal-close"
          onclick={onclose}
          aria-label="Close modal"
          data-testid="modal-close"
        >
          &times;
        </button>
      </header>

      <div class="modal-content" data-testid="modal-content">
        {#if children}
          {@render children()}
        {/if}
      </div>

      {#if footer}
        <footer class="modal-footer" data-testid="modal-footer">
          {@render footer()}
        </footer>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: var(--modal-bg, #2d2d2d);
    border: 1px solid var(--border-color, #444);
    border-radius: 8px;
    width: 90vw;
    max-width: 500px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  }

  /* Desktop: allow wider modals */
  @media (min-width: 768px) {
    .modal {
      width: auto;
      min-width: 400px;
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--border-color, #444);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--text-color, #fff);
  }

  .modal-close {
    background: none;
    border: none;
    color: var(--text-muted, #888);
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    width: 44px;
    height: 44px;
    min-width: 44px; /* Touch target */
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .modal-close:hover {
    color: var(--text-color, #fff);
    background: var(--hover-bg, #3a3a3a);
  }

  .modal-content {
    padding: 1rem;
    overflow-y: auto;
    flex: 1;
  }

  .modal-footer {
    padding: 1rem;
    border-top: 1px solid var(--border-color, #444);
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }
</style>
