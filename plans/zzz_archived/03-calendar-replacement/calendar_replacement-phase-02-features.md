# Phase 02: Date Enable/Disable Logic

**Status:** Completed
**Output:** Calendar with smart date enabling based on journal entries

## Objective

Implement date enable/disable logic where only today and past dates with entries are clickable. Future dates and past dates without entries are disabled.

## Tasks

- [x] Implement date enabling logic based on `datesWithEntries` prop
- [x] Disable all future dates (except today)
- [x] Apply dark theme CSS customizations to match existing design
- [x] Update `$effect` to sync `datesWithEntries` prop with calendar
- [x] Style disabled dates to be visually distinct (grayed out)
- [x] Remove keyboard navigation (simplified UX - click-only interaction)

## Implementation Details

### Date Enable/Disable Logic

The enabled state serves as the visual indicator - no separate red dots needed.

```typescript
function getEnabledDates(datesWithEntries: string[]): string[] {
  const today = formatDateString(new Date());

  // Enable today + all past dates that have entries
  const enabled = new Set([today, ...datesWithEntries]);

  return Array.from(enabled);
}

new Calendar(container, {
  disableAllDates: true,
  enableDates: getEnabledDates(datesWithEntries),
  // ... other options
});
```

### Updating Calendar When Props Change

```typescript
$effect(() => {
  if (calendar && datesWithEntries) {
    const enabledDates = getEnabledDates(datesWithEntries);
    calendar.set({ enableDates: enabledDates });
    calendar.update({ dates: true });
  }
});
```

### Dark Theme CSS

Vanilla Calendar Pro supports CSS custom properties. We'll override these to match the existing sidebar theme:

```css
:global(.vc-calendar) {
  --vc-bg: var(--sidebar-bg, #1e1e1e);
  --vc-text-color: var(--text-color, #d4d4d4);
  --vc-text-disabled-color: var(--text-muted, #666);
  --vc-accent-color: var(--accent-color, #3794ff);
  --vc-hover-bg: var(--hover-bg, #333);
}
```

### Disabled Date Styling

Disabled dates should be visually subdued:

```css
:global([data-vc-disabled]) {
  opacity: 0.4;
  cursor: not-allowed;
}
```

## Dependencies

- Phase 01 completed (basic calendar working)

## Acceptance Criteria

- [x] Today is always enabled and clickable
- [x] Past dates with journal entries are enabled and clickable
- [x] Past dates without entries are disabled (grayed out, not clickable)
- [x] Future dates are disabled (grayed out, not clickable)
- [x] Calendar updates correctly when `datesWithEntries` prop changes
- [x] Clicking disabled dates does nothing (silent/no-op)
- [x] Dark theme matches existing sidebar design aesthetic
- [x] Selected date is clearly highlighted
