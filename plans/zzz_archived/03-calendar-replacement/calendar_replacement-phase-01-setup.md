# Phase 01: Install and Basic Setup

**Status:** Completed
**Output:** Working calendar with basic date selection

## Objective

Replace Pikaday with Vanilla Calendar Pro and establish basic calendar rendering with date selection.

## Tasks

- [x] Install vanilla-calendar-pro package
- [x] Remove pikaday package and CSS import
- [x] Update Calendar.svelte to use Vanilla Calendar Pro
- [x] Implement basic initialization with dark theme
- [x] Implement date selection callback (`onClickDate`)
- [x] Expose `gotoDate()` and `navigateDays()` methods for keyboard navigation
- [x] Verify Cmd+Arrow shortcuts work without conflicts

## Implementation Details

### Installation

```bash
npm uninstall pikaday
npm install vanilla-calendar-pro
```

### Basic Calendar Setup

```typescript
import { Calendar } from 'vanilla-calendar-pro';
import 'vanilla-calendar-pro/styles/index.css';

const calendar = new Calendar(container, {
  selectedTheme: 'dark',
  firstWeekday: 0, // Sunday
  selectionDatesMode: 'single',
  selectedDates: [formatDate(selectedDate)], // 'YYYY-MM-DD'
  onClickDate: (self, event) => {
    const dateStr = self.selectedDates[0];
    if (dateStr) {
      const [year, month, day] = dateStr.split('-').map(Number);
      onselect?.(new Date(year, month - 1, day));
    }
  },
});
calendar.init();
```

### Programmatic Navigation

```typescript
export function gotoDate(date: Date): void {
  const dateStr = formatDateString(date);
  calendar.set({
    selectedDates: [dateStr],
    selectedMonth: date.getMonth(),
    selectedYear: date.getFullYear(),
  });
  calendar.update({ dates: true });
}

export function navigateDays(days: number): void {
  const current = getCurrentDate();
  const newDate = new Date(current);
  newDate.setDate(newDate.getDate() + days);
  gotoDate(newDate);
  onselect?.(newDate);
}
```

## Dependencies

- None (first phase)

## Acceptance Criteria

- [x] Pikaday removed from package.json
- [x] Vanilla Calendar Pro installed and imported
- [x] Calendar renders inline in sidebar with dark theme
- [x] Clicking a date triggers `onselect` callback
- [x] `gotoDate()` navigates to specified date
- [x] `navigateDays()` navigates relative to current selection
- [x] Cmd+Arrow shortcuts work correctly (no plain arrow key conflicts)
- [x] App builds without errors
