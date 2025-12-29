<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Pikaday from 'pikaday';
  import 'pikaday/css/pikaday.css';

  interface Props {
    /** Currently selected date */
    selectedDate?: Date;
    /** Callback when user selects a date */
    onselect?: (date: Date) => void;
  }

  let { selectedDate = new Date(), onselect }: Props = $props();

  let container: HTMLDivElement;
  let picker: Pikaday | null = $state(null);

  // Store reference to remove Pikaday's keyboard handler
  let pikadayKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  onMount(() => {
    picker = new Pikaday({
      bound: false,
      defaultDate: selectedDate,
      setDefaultDate: true,
      firstDay: 0, // Sunday
      onSelect: (date: Date) => {
        onselect?.(date);
      },
    });
    container.appendChild(picker.el);

    // Disable Pikaday's built-in keyboard navigation
    // We handle keyboard nav in App.svelte with Cmd+Arrow shortcuts
    // Pikaday stores its handler as _onKeyChange and registers it on document
    const pickerAny = picker as unknown as { _onKeyChange?: (e: KeyboardEvent) => void };
    if (pickerAny._onKeyChange) {
      pikadayKeyHandler = pickerAny._onKeyChange;
      document.removeEventListener('keydown', pikadayKeyHandler, true);
    }
  });

  onDestroy(() => {
    picker?.destroy();
  });

  /**
   * Navigate to a specific date (updates calendar view and selection).
   */
  export function gotoDate(date: Date): void {
    picker?.setDate(date);
  }

  /**
   * Get the currently selected date.
   */
  export function getDate(): Date | null {
    return picker?.getDate() ?? null;
  }

  /**
   * Navigate by number of days relative to current selection.
   * Also triggers the onselect callback.
   */
  export function navigateDays(days: number): void {
    const current = picker?.getDate() ?? new Date();
    const newDate = new Date(current);
    newDate.setDate(newDate.getDate() + days);
    picker?.setDate(newDate);
    // Pikaday's setDate triggers onSelect, so the callback will be called
  }
</script>

<div class="calendar" bind:this={container} data-testid="calendar-widget"></div>

<style>
  .calendar {
    padding: 0.5rem;
  }

  /* Pikaday dark theme overrides */
  :global(.pika-single) {
    background: var(--sidebar-bg, #1e1e1e) !important;
    border: none !important;
    color: var(--text-color, #d4d4d4) !important;
    font-family: inherit !important;
    width: 100% !important;
  }

  :global(.pika-single .pika-lendar) {
    width: 100% !important;
    float: none !important;
    margin: 0 !important;
  }

  :global(.pika-title) {
    background: transparent !important;
  }

  :global(.pika-label) {
    color: var(--text-color, #d4d4d4) !important;
    background: transparent !important;
  }

  :global(.pika-prev),
  :global(.pika-next) {
    background-color: var(--hover-bg, #333) !important;
  }

  :global(.pika-table th) {
    color: var(--text-muted, #888) !important;
    font-weight: normal !important;
  }

  :global(.pika-table td) {
    color: var(--text-color, #d4d4d4) !important;
  }

  :global(.pika-table td.is-today .pika-button) {
    color: var(--accent-color, #3794ff) !important;
    font-weight: bold !important;
  }

  :global(.pika-table td.is-selected .pika-button) {
    background: var(--accent-color, #3794ff) !important;
    color: white !important;
    box-shadow: none !important;
  }

  :global(.pika-button) {
    background: transparent !important;
    color: var(--text-color, #d4d4d4) !important;
    border-radius: 4px !important;
  }

  :global(.pika-button:hover) {
    background: var(--hover-bg, #333) !important;
    color: white !important;
  }

  :global(.is-disabled .pika-button) {
    color: var(--text-muted, #888) !important;
    opacity: 0.5;
  }
</style>
