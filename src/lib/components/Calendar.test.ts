import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import Calendar from './Calendar.svelte';

// Store options for inspection
let lastPikadayOptions: Record<string, unknown> | null = null;

// Mock Pikaday since it manipulates the DOM directly
// Using a class to satisfy the 'new' constructor call
vi.mock('pikaday', () => {
  class MockPikaday {
    el: HTMLElement;
    private currentDate: Date;
    private onSelectCallback?: (date: Date) => void;

    constructor(options: Record<string, unknown>) {
      lastPikadayOptions = options;
      this.el = document.createElement('div');
      this.el.className = 'pika-single';
      this.el.innerHTML = '<div class="pika-lendar">Mock Calendar</div>';
      this.currentDate = (options.defaultDate as Date) || new Date();
      this.onSelectCallback = options.onSelect as ((date: Date) => void) | undefined;
    }

    destroy() {}

    getDate(): Date {
      return this.currentDate;
    }

    setDate(date: Date) {
      this.currentDate = date;
      if (this.onSelectCallback) {
        this.onSelectCallback(date);
      }
    }

    gotoDate() {}
  }

  return { default: MockPikaday };
});

// Mock Pikaday CSS import
vi.mock('pikaday/css/pikaday.css', () => ({}));

describe('Calendar component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders calendar widget container', () => {
    render(Calendar);
    const container = screen.getByTestId('calendar-widget');
    expect(container).toBeTruthy();
  });

  it('renders Pikaday calendar element', () => {
    render(Calendar);
    const pikadayEl = document.querySelector('.pika-single');
    expect(pikadayEl).toBeTruthy();
  });

  it('calls onselect when date is selected via setDate', async () => {
    const onselect = vi.fn();
    const { component } = render(Calendar, { props: { onselect } });

    const testDate = new Date(2024, 11, 25);
    component.gotoDate(testDate);

    expect(onselect).toHaveBeenCalledWith(testDate);
  });

  it('getDate returns current selection', () => {
    const { component } = render(Calendar);
    const date = component.getDate();
    expect(date).toBeInstanceOf(Date);
  });

  it('navigateDays moves selection forward', () => {
    const onselect = vi.fn();
    const startDate = new Date(2024, 11, 25);
    const { component } = render(Calendar, {
      props: { selectedDate: startDate, onselect },
    });

    component.navigateDays(1);

    expect(onselect).toHaveBeenCalled();
    const calledDate = onselect.mock.calls[0][0];
    expect(calledDate.getDate()).toBe(26);
  });

  it('navigateDays moves selection backward', () => {
    const onselect = vi.fn();
    const startDate = new Date(2024, 11, 25);
    const { component } = render(Calendar, {
      props: { selectedDate: startDate, onselect },
    });

    component.navigateDays(-1);

    expect(onselect).toHaveBeenCalled();
    const calledDate = onselect.mock.calls[0][0];
    expect(calledDate.getDate()).toBe(24);
  });

  it('navigateDays handles week navigation', () => {
    const onselect = vi.fn();
    const startDate = new Date(2024, 11, 25);
    const { component } = render(Calendar, {
      props: { selectedDate: startDate, onselect },
    });

    component.navigateDays(7);

    expect(onselect).toHaveBeenCalled();
    const calledDate = onselect.mock.calls[0][0];
    expect(calledDate.getMonth()).toBe(0); // January (next month)
    expect(calledDate.getDate()).toBe(1);
  });

  it('gotoDate sets specific date', () => {
    const onselect = vi.fn();
    const { component } = render(Calendar, { props: { onselect } });

    const targetDate = new Date(2024, 5, 15);
    component.gotoDate(targetDate);

    expect(onselect).toHaveBeenCalledWith(targetDate);
  });

  it('uses default date when selectedDate prop is not provided', () => {
    render(Calendar);

    expect(lastPikadayOptions).not.toBeNull();
    expect(lastPikadayOptions!.defaultDate).toBeInstanceOf(Date);
    expect(lastPikadayOptions!.setDefaultDate).toBe(true);
  });

  it('uses provided selectedDate as default', () => {
    const customDate = new Date(2024, 6, 4);
    render(Calendar, { props: { selectedDate: customDate } });

    expect(lastPikadayOptions).not.toBeNull();
    expect(lastPikadayOptions!.defaultDate).toEqual(customDate);
  });
});
