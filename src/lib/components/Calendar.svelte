<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Calendar } from 'vanilla-calendar-pro';
  import 'vanilla-calendar-pro/styles/index.css';

  interface Props {
    /** Currently selected date */
    selectedDate?: Date;
    /** Callback when user selects a date */
    onselect?: (date: Date) => void;
    /** Array of "YYYY-MM-DD" strings for dates with journal entries */
    datesWithEntries?: string[];
  }

  let { selectedDate = new Date(), onselect, datesWithEntries = [] }: Props = $props();

  let container: HTMLDivElement;
  let calendar: Calendar | null = $state(null);

  /**
   * Format a Date object to 'YYYY-MM-DD' string
   */
  function formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get the list of enabled dates for the calendar.
   * Enabled: today + past dates with entries
   * Disabled: future dates + past dates without entries
   */
  function getEnabledDates(entries: string[]): string[] {
    const today = formatDateString(new Date());
    const enabled = new Set([today, ...entries]);
    return Array.from(enabled);
  }

  /**
   * Parse a 'YYYY-MM-DD' string to a Date object
   */
  function parseDateString(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  /**
   * Get the currently selected date from the calendar
   */
  function getCurrentDate(): Date {
    if (calendar && calendar.selectedDates && calendar.selectedDates.length > 0) {
      const dateValue = calendar.selectedDates[0];
      // selectedDates can be string | number | Date, handle accordingly
      if (typeof dateValue === 'string') {
        return parseDateString(dateValue);
      } else if (typeof dateValue === 'number') {
        return new Date(dateValue);
      } else {
        return dateValue;
      }
    }
    return new Date();
  }

  onMount(() => {
    const initialDateStr = formatDateString(selectedDate);
    const enabledDates = getEnabledDates(datesWithEntries);

    calendar = new Calendar(container, {
      selectedTheme: 'dark',
      firstWeekday: 0, // Sunday
      selectionDatesMode: 'single',
      selectedDates: [initialDateStr],
      selectedMonth: selectedDate.getMonth() as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11,
      selectedYear: selectedDate.getFullYear(),
      // Disable all dates by default, then enable specific ones
      disableAllDates: true,
      enableDates: enabledDates,
      onClickDate: (self, event) => {
        // Get the clicked date from the event target's data attribute
        const target = event?.target as HTMLElement;
        const dateBtn = target?.closest('[data-vc-date]') as HTMLElement;
        const dateStr = dateBtn?.dataset?.vcDate;

        if (dateStr) {
          const date = parseDateString(dateStr);
          onselect?.(date);
        }
      },
    });
    calendar.init();
  });

  onDestroy(() => {
    calendar?.destroy();
  });

  // Update calendar when datesWithEntries changes
  $effect(() => {
    if (calendar && datesWithEntries) {
      const enabledDates = getEnabledDates(datesWithEntries);
      calendar.set({ enableDates: enabledDates });
      calendar.update({ dates: true });
    }
  });

  /**
   * Navigate to a specific date (updates calendar view and selection).
   */
  export function gotoDate(date: Date): void {
    if (!calendar) return;

    const dateStr = formatDateString(date);
    calendar.set({
      selectedDates: [dateStr],
      selectedMonth: date.getMonth() as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11,
      selectedYear: date.getFullYear(),
    });
    calendar.update({ dates: true, month: true, year: true });
  }

  /**
   * Get the currently selected date.
   */
  export function getDate(): Date | null {
    return calendar ? getCurrentDate() : null;
  }
</script>

<div class="calendar" bind:this={container} data-testid="calendar-widget"></div>

<style>
  .calendar {
    padding: 0.5rem;
  }

  /* Vanilla Calendar Pro dark theme overrides */
  :global(.vc-calendar) {
    --vc-bg: var(--sidebar-bg, #1e1e1e);
    --vc-text-color: var(--text-color, #e8e8e8);
    --vc-text-disabled-color: var(--text-muted, #666);
    --vc-border-color: var(--border-color, #333);
    --vc-hover-bg: var(--hover-bg, #333);
    --vc-focus-bg: var(--hover-bg, #333);
    --vc-accent-color: var(--accent-color, #3794ff);

    background: var(--vc-bg) !important;
    border: none !important;
    font-family: inherit !important;
    width: 100% !important;
  }

  /* Calendar header (month/year navigation) */
  :global(.vc-header) {
    background: transparent !important;
  }

  :global(.vc-header__content) {
    color: var(--vc-text-color) !important;
  }

  :global(.vc-arrow) {
    background: var(--vc-hover-bg) !important;
    color: var(--vc-text-color) !important;
    border: none !important;
  }

  :global(.vc-arrow:hover) {
    background: var(--vc-focus-bg) !important;
  }

  /* Weekday headers */
  :global(.vc-week__day) {
    color: var(--text-muted, #888) !important;
    font-weight: normal !important;
  }

  /* Date cells */
  :global(.vc-dates__date) {
    color: var(--vc-text-color) !important;
  }

  :global(.vc-date) {
    background: transparent !important;
    color: var(--vc-text-color) !important;
    border-radius: 4px !important;
  }

  :global(.vc-date__btn[aria-disabled="true"]) {
      color: #e2e2e2 !important;
      opacity: 0.5 !important;
  }

  :global(.vc-date:hover) {
    background: var(--vc-hover-bg) !important;
    color: white !important;
  }

  /* Today */
  :global(.vc-date[data-vc-date-today]) {
    color: var(--vc-accent-color) !important;
    font-weight: bold !important;
  }

  /* Selected date */
  :global(.vc-date[data-vc-date-selected]) {
    background: var(--vc-accent-color) !important;
    color: white !important;
  }

  :global(.vc-date[data-vc-date-selected]:hover) {
    background: var(--vc-accent-color) !important;
  }

  /* Disabled dates */
  :global(.vc-date[data-vc-date-disabled]) {
    color: #6b7280 !important;
    opacity: 0.7;
    cursor: not-allowed;
  }

  /* Dates outside current month */
  :global(.vc-date[data-vc-date-outside]) {
    color: #6b7280 !important;
    opacity: 0.6;
  }

  /* Month/Year picker panels */
  :global(.vc-months__month),
  :global(.vc-years__year) {
    color: var(--vc-text-color) !important;
    background: transparent !important;
  }

  :global(.vc-months__month:hover),
  :global(.vc-years__year:hover) {
    background: var(--vc-hover-bg) !important;
  }

  :global(.vc-months__month[data-vc-months-month-selected]),
  :global(.vc-years__year[data-vc-years-year-selected]) {
    background: var(--vc-accent-color) !important;
    color: white !important;
  }
</style>
