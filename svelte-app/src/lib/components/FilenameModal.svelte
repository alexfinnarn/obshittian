<script lang="ts">
  import Modal from './Modal.svelte';

  interface Props {
    visible?: boolean;
    title?: string;
    defaultValue?: string;
    placeholder?: string;
    onconfirm?: (value: string) => void;
    oncancel?: () => void;
  }

  let {
    visible = false,
    title = '',
    defaultValue = '',
    placeholder = 'Enter name',
    onconfirm,
    oncancel,
  }: Props = $props();

  let inputValue = $state('');
  let inputElement: HTMLInputElement | undefined = $state();

  // Reset input value when modal opens with new default
  $effect(() => {
    if (visible) {
      // Capture defaultValue here inside the effect to make it reactive
      inputValue = defaultValue;
      // Focus input after DOM update
      queueMicrotask(() => {
        inputElement?.focus();
        inputElement?.select();
      });
    }
  });

  function handleConfirm() {
    const trimmed = inputValue.trim();
    if (trimmed) {
      onconfirm?.(trimmed);
    }
  }

  function handleCancel() {
    oncancel?.();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleConfirm();
    }
    // Escape is handled by Modal
  }
</script>

<Modal {visible} {title} onclose={handleCancel}>
  <input
    bind:this={inputElement}
    type="text"
    bind:value={inputValue}
    {placeholder}
    onkeydown={handleKeydown}
    class="filename-input"
    data-testid="filename-input"
  />

  {#snippet footer()}
    <button
      class="btn btn-secondary"
      onclick={handleCancel}
      data-testid="filename-cancel"
    >
      Cancel
    </button>
    <button
      class="btn btn-primary"
      onclick={handleConfirm}
      disabled={!inputValue.trim()}
      data-testid="filename-confirm"
    >
      Confirm
    </button>
  {/snippet}
</Modal>

<style>
  .filename-input {
    width: 100%;
    padding: 0.5rem;
    font-size: 1rem;
    background: var(--input-bg, #1e1e1e);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    color: var(--text-color, #fff);
  }

  .filename-input:focus {
    outline: none;
    border-color: var(--accent-color, #0078d4);
  }

  .btn {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    border-radius: 4px;
    cursor: pointer;
    border: none;
  }

  .btn-secondary {
    background: var(--button-secondary-bg, #3a3a3a);
    color: var(--text-color, #fff);
  }

  .btn-secondary:hover {
    background: var(--hover-bg, #4a4a4a);
  }

  .btn-primary {
    background: var(--accent-color, #0078d4);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-color-hover, #0066b8);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
