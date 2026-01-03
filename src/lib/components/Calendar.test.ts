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
    update: () => void;
    simulateDateClick: () => void;
  } | null,
}));

// Mock Vanilla Calendar Pro since it manipulates the DOM directly
vi.mock('vanilla-calendar-pro', () => {
  class MockVanillaCalendar {
    selectedDates: string[];
    selectedMonth: number;
    selectedYear: number;
    private container: HTMLElement;
    private onClickDateCallback?: (self: MockVanillaCalendar) => void;

    constructor(container: HTMLElement, options: Record<string, unknown>) {
      mockState.lastCalendarOptions = options;
      this.container = container;
      this.selectedDates = (options.selectedDates as string[]) || [];
      this.selectedMonth = (options.selectedMonth as number) ?? new Date().getMonth();
      this.selectedYear = (options.selectedYear as number) ?? new Date().getFullYear();
      this.onClickDateCallback = options.onClickDate as ((self: MockVanillaCalendar) => void) | undefined;
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

    update() {
      // No-op in mock
    }

    // Helper for tests to simulate date click
    simulateDateClick() {
      if (this.onClickDateCallback) {
        this.onClickDateCallback(this);
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

  it('configures calendar with disableAllDates and enableDates', () => {
    const datesWithEntries = ['2024-12-20', '2024-12-22'];
    render(Calendar, { props: { datesWithEntries } });

    expect(mockState.lastCalendarOptions).not.toBeNull();
    expect(mockState.lastCalendarOptions!.disableAllDates).toBe(true);
    expect(mockState.lastCalendarOptions!.enableDates).toBeDefined();
    // Should include today and dates with entries
    const enableDates = mockState.lastCalendarOptions!.enableDates as string[];
    expect(enableDates).toContain('2024-12-20');
    expect(enableDates).toContain('2024-12-22');
  });

  it('enables today even without entries', () => {
    render(Calendar, { props: { datesWithEntries: [] } });

    expect(mockState.lastCalendarOptions).not.toBeNull();
    const enableDates = mockState.lastCalendarOptions!.enableDates as string[];
    // Today should always be enabled
    expect(enableDates.length).toBe(1);
  });
});
