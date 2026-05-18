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
  const entryDateSet = $derived(new Set(datesWithEntries));

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

  function markJournalEntryDate(dateEl: HTMLElement): void {
    const dateStr = dateEl.dataset.vcDate;
    dateEl.toggleAttribute('data-has-journal-entry', !!dateStr && entryDateSet.has(dateStr));
  }

  onMount(() => {
    const initialDateStr = formatDateString(selectedDate);

    calendar = new Calendar(container, {
      selectedTheme: 'dark',
      firstWeekday: 0, // Sunday
      selectionDatesMode: 'single',
      selectedDates: [initialDateStr],
      selectedMonth: selectedDate.getMonth() as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11,
      selectedYear: selectedDate.getFullYear(),
      selectedWeekends: [],
      onCreateDateEls: (self, dateEl) => {
        markJournalEntryDate(dateEl);
      },
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
    if (calendar && entryDateSet) {
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

  /* Vanilla Calendar Pro Obsidian Twilight theme overrides */
  :global(.vc-calendar) {
    --vc-bg: transparent;
    --vc-text-color: var(--on-surface);
    --vc-text-disabled-color: var(--outline-variant);
    --vc-border-color: var(--border-default);
    --vc-hover-bg: var(--surface-container-highest);
    --vc-focus-bg: var(--surface-container-highest);
    --vc-accent-color: var(--primary-container);

    background: transparent !important;
    border: none !important;
    font-family: var(--font-ui) !important;
    width: 100% !important;
  }

  /* Calendar header (month/year navigation) */
  :global(.vc-header) {
    background: transparent !important;
    padding-bottom: 0.5rem;
  }

  :global(.vc-header__content) {
    color: var(--on-surface) !important;
    font-family: var(--font-ui) !important;
    font-weight: 600 !important;
    font-size: 1.1rem !important;
  }

  :global(.vc-arrow) {
    background: transparent !important;
    color: var(--on-surface-variant) !important;
    border: none !important;
    border-radius: var(--radius-default) !important;
  }

  :global(.vc-arrow:hover) {
    background: var(--surface-container-highest) !important;
    color: var(--on-surface) !important;
  }

  /* Weekday headers */
  :global(.vc-week__day) {
    color: var(--outline) !important;
    font-family: var(--font-mono) !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Date cells */
  :global(.vc-dates__date) {
    color: var(--on-surface) !important;
  }

  :global(.vc-date) {
    background: transparent !important;
    color: var(--on-surface) !important;
    border-radius: var(--radius-default) !important;
    font-family: var(--font-mono) !important;
    font-size: 13px !important;
  }

  :global(.vc-date:hover) {
    background: var(--surface-container-highest) !important;
    color: var(--on-surface) !important;
  }

  /* Has journal entry */
  :global(.vc-date[data-has-journal-entry] .vc-date__btn) {
    position: relative;
    color: var(--primary) !important;
    font-weight: 700 !important;
    background: var(--surface-container-high) !important;
    box-shadow: inset 0 0 0 1px var(--outline-variant);
  }

  :global(.vc-date[data-has-journal-entry] .vc-date__btn::after) {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 0.14rem;
    width: 4px;
    height: 4px;
    border-radius: var(--radius-full);
    background: var(--primary);
    transform: translateX(-50%);
  }

  /* Today */
  :global(.vc-date[data-vc-date-today] .vc-date__btn) {
    color: var(--primary) !important;
    font-weight: 700 !important;
    box-shadow: inset 0 0 0 1px var(--primary);
  }

  /* Selected date */
  :global(.vc-date[data-vc-date-selected]) {
    background: var(--primary-container) !important;
    color: var(--on-primary-container) !important;
  }

  :global(.vc-date[data-vc-date-selected] .vc-date__btn) {
    background: transparent !important;
    color: var(--on-primary-container) !important;
    font-weight: 700 !important;
    box-shadow: none !important;
  }

  :global(.vc-date[data-vc-date-selected][data-has-journal-entry] .vc-date__btn::after) {
    background: var(--on-primary-container);
  }

  :global(.vc-date[data-vc-date-selected]:hover) {
    background: var(--primary) !important;
  }

  /* Dates outside current month */
  :global(.vc-date[data-vc-date-outside]) {
    color: var(--outline-variant) !important;
    opacity: 0.5;
  }
  
  :global(.vc-date[data-vc-date-outside] .vc-date__btn) {
    color: var(--outline-variant) !important;
  }

  /* Month/Year picker panels */
  :global(.vc-months__month),
  :global(.vc-years__year) {
    color: var(--on-surface) !important;
    background: transparent !important;
    font-family: var(--font-ui) !important;
    border-radius: var(--radius-default) !important;
  }

  :global(.vc-months__month:hover),
  :global(.vc-years__year:hover) {
    background: var(--surface-container-highest) !important;
  }

  :global(.vc-months__month[data-vc-months-month-selected]),
  :global(.vc-years__year[data-vc-years-year-selected]) {
    background: var(--primary-container) !important;
    color: var(--on-primary-container) !important;
  }
</style>
