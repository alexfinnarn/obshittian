import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import Calendar from './Calendar.svelte';

// Use vi.hoisted to ensure mockState is available to the mock factory
const mockState = vi.hoisted(() => ({
  lastCalendarOptions: null as Record<string, unknown> | null,
  mockCalendarInstance: null as {
    selectedDates: string[];
    selectedMonth: number;
    selectedYear: number;
    set: (options: Record<string, unknown>) => void;
    update: (options?: Record<string, unknown>) => void;
    updateCalls: Array<Record<string, unknown> | undefined>;
    simulateDateClick: (dateStr: string) => void;
  } | null,
}));

// Mock Vanilla Calendar Pro since it manipulates the DOM directly
vi.mock('vanilla-calendar-pro', () => {
  class MockVanillaCalendar {
    selectedDates: string[];
    selectedMonth: number;
    selectedYear: number;
    updateCalls: Array<Record<string, unknown> | undefined> = [];
    private container: HTMLElement;
    private onClickDateCallback?: (self: MockVanillaCalendar, event: MouseEvent) => void;

    constructor(container: HTMLElement, options: Record<string, unknown>) {
      mockState.lastCalendarOptions = options;
      this.container = container;
      this.selectedDates = (options.selectedDates as string[]) || [];
      this.selectedMonth = (options.selectedMonth as number) ?? new Date().getMonth();
      this.selectedYear = (options.selectedYear as number) ?? new Date().getFullYear();
      this.onClickDateCallback = options.onClickDate as
        | ((self: MockVanillaCalendar, event: MouseEvent) => void)
        | undefined;
      mockState.mockCalendarInstance = this as unknown as typeof mockState.mockCalendarInstance;
    }

    init() {
      // Create mock calendar DOM
      const calendarEl = document.createElement('div');
      calendarEl.className = 'vc-calendar';
      calendarEl.innerHTML = '<div class="vc-dates">Mock Calendar</div>';
      this.container.appendChild(calendarEl);
    }

    destroy() {
      // Don't actually manipulate DOM in tests to avoid happy-dom issues
    }

    set(options: Record<string, unknown>) {
      if (options.selectedDates) {
        this.selectedDates = options.selectedDates as string[];
      }
      if (options.selectedMonth !== undefined) {
        this.selectedMonth = options.selectedMonth as number;
      }
      if (options.selectedYear !== undefined) {
        this.selectedYear = options.selectedYear as number;
      }
    }

    update(options?: Record<string, unknown>) {
      this.updateCalls.push(options);
    }

    // Helper for tests to simulate date click
    simulateDateClick(dateStr: string) {
      if (this.onClickDateCallback) {
        const dateEl = document.createElement('div');
        dateEl.dataset.vcDate = dateStr;
        const button = document.createElement('button');
        dateEl.appendChild(button);
        this.onClickDateCallback(this, { target: button } as unknown as MouseEvent);
      }
    }
  }

  return {
    Calendar: MockVanillaCalendar,
  };
});

// Mock Vanilla Calendar Pro CSS import
vi.mock('vanilla-calendar-pro/styles/index.css', () => ({}));

describe('Calendar component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.lastCalendarOptions = null;
    mockState.mockCalendarInstance = null;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders calendar widget container', () => {
    render(Calendar);
    const container = screen.getByTestId('calendar-widget');
    expect(container).toBeTruthy();
  });

  it('renders Vanilla Calendar Pro element', () => {
    render(Calendar);
    const calendarEl = document.querySelector('.vc-calendar');
    expect(calendarEl).toBeTruthy();
  });

  it('getDate returns current selection', () => {
    const startDate = new Date(2024, 11, 25);
    const { component } = render(Calendar, {
      props: { selectedDate: startDate },
    });
    const date = component.getDate();
    expect(date).toBeInstanceOf(Date);
    expect(date?.getDate()).toBe(25);
  });

  it('gotoDate updates calendar selection', () => {
    const startDate = new Date(2024, 11, 25);
    const { component } = render(Calendar, {
      props: { selectedDate: startDate },
    });

    const targetDate = new Date(2024, 5, 15);
    component.gotoDate(targetDate);

    // Verify the mock calendar was updated
    expect(mockState.mockCalendarInstance?.selectedDates).toContain('2024-06-15');
    expect(mockState.mockCalendarInstance?.selectedMonth).toBe(5);
    expect(mockState.mockCalendarInstance?.selectedYear).toBe(2024);
  });

  it('uses default date when selectedDate prop is not provided', () => {
    render(Calendar);

    expect(mockState.lastCalendarOptions).not.toBeNull();
    expect(mockState.lastCalendarOptions!.selectedDates).toBeDefined();
    expect(mockState.lastCalendarOptions!.selectedTheme).toBe('dark');
  });

  it('uses provided selectedDate as initial date', () => {
    const customDate = new Date(2024, 6, 4);
    render(Calendar, { props: { selectedDate: customDate } });

    expect(mockState.lastCalendarOptions).not.toBeNull();
    expect(mockState.lastCalendarOptions!.selectedDates).toContain('2024-07-04');
    expect(mockState.lastCalendarOptions!.selectedMonth).toBe(6);
    expect(mockState.lastCalendarOptions!.selectedYear).toBe(2024);
  });

  it('does not configure date gating', () => {
    const datesWithEntries = ['2024-12-20', '2024-12-22'];
    render(Calendar, { props: { datesWithEntries } });

    expect(mockState.lastCalendarOptions).not.toBeNull();
    expect(mockState.lastCalendarOptions).not.toHaveProperty('disableAllDates');
    expect(mockState.lastCalendarOptions).not.toHaveProperty('enableDates');
  });

  it('configures weekends without separate visual marking', () => {
    render(Calendar);

    expect(mockState.lastCalendarOptions).not.toBeNull();
    expect(mockState.lastCalendarOptions!.selectedWeekends).toEqual([]);
  });

  it('provides a date creation hook for journal entry markers', () => {
    render(Calendar);

    expect(mockState.lastCalendarOptions).not.toBeNull();
    expect(mockState.lastCalendarOptions!.onCreateDateEls).toEqual(expect.any(Function));
  });

  it('marks dates with journal entries', () => {
    render(Calendar, { props: { datesWithEntries: ['2024-12-20'] } });

    const dateEl = document.createElement('div');
    dateEl.dataset.vcDate = '2024-12-20';
    const onCreateDateEls = mockState.lastCalendarOptions!.onCreateDateEls as (
      self: unknown,
      dateEl: HTMLElement
    ) => void;

    onCreateDateEls(mockState.mockCalendarInstance, dateEl);

    expect(dateEl.hasAttribute('data-has-journal-entry')).toBe(true);
  });

  it('does not mark dates without journal entries', () => {
    render(Calendar, { props: { datesWithEntries: ['2024-12-20'] } });

    const dateEl = document.createElement('div');
    dateEl.dataset.vcDate = '2024-12-21';
    const onCreateDateEls = mockState.lastCalendarOptions!.onCreateDateEls as (
      self: unknown,
      dateEl: HTMLElement
    ) => void;

    onCreateDateEls(mockState.mockCalendarInstance, dateEl);

    expect(dateEl.hasAttribute('data-has-journal-entry')).toBe(false);
  });

  it('removes stale journal entry markers', () => {
    render(Calendar, { props: { datesWithEntries: ['2024-12-20'] } });

    const dateEl = document.createElement('div');
    dateEl.dataset.vcDate = '2024-12-21';
    dateEl.setAttribute('data-has-journal-entry', '');
    const onCreateDateEls = mockState.lastCalendarOptions!.onCreateDateEls as (
      self: unknown,
      dateEl: HTMLElement
    ) => void;

    onCreateDateEls(mockState.mockCalendarInstance, dateEl);

    expect(dateEl.hasAttribute('data-has-journal-entry')).toBe(false);
  });

  it('selects an arbitrary clicked date', () => {
    const onselect = vi.fn();
    render(Calendar, { props: { onselect } });

    mockState.mockCalendarInstance?.simulateDateClick('2030-04-15');

    expect(onselect).toHaveBeenCalledWith(new Date(2030, 3, 15));
  });
});
