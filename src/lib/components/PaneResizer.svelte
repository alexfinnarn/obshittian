<script lang="ts">
  import { savePaneWidth, getPaneWidth } from '$lib/utils/filesystem';

  interface Props {
    /** Callback when width changes, receives left pane width percentage (0-100) */
    onresize?: (leftWidthPercent: number) => void;
  }

  let { onresize }: Props = $props();

  let isDragging = $state(false);

  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;

    // Get the editor area (parent of this component)
    const editorArea = (e.target as HTMLElement).closest('.editor-area') as HTMLElement | null;
    if (!editorArea) return;

    const rect = editorArea.getBoundingClientRect();
    const leftWidth = ((e.clientX - rect.left) / rect.width) * 100;

    // Clamp between 20% and 80%
    const clampedWidth = Math.max(20, Math.min(80, leftWidth));

    onresize?.(clampedWidth);
  }

  function handleMouseUp() {
    if (isDragging) {
      isDragging = false;
    }
  }
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="pane-divider"
  class:dragging={isDragging}
  onmousedown={handleMouseDown}
  role="separator"
  aria-orientation="vertical"
  aria-label="Resize panes"
  tabindex="0"
  data-testid="pane-divider"
></div>

<style>
  .pane-divider {
    width: 4px;
    background: var(--border-color, #333);
    cursor: col-resize;
    flex-shrink: 0;
    transition: background 0.15s;
  }

  .pane-divider:hover,
  .pane-divider.dragging {
    background: var(--accent-color, #0078d4);
  }

  .pane-divider:focus {
    outline: none;
    background: var(--accent-color, #0078d4);
  }
</style>
