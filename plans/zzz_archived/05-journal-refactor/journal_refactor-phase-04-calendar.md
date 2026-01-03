# Phase 04: Calendar Integration

**Status:** Pending
**Output:** Updated `Calendar.svelte`, updated `Sidebar.svelte`

## Objective

Add visual indicators (red dots) to the calendar for days that have journal entries.

## Tasks

- [ ] Add `datesWithEntries` prop to `Calendar.svelte`
- [ ] Configure Pikaday with `events` option
- [ ] Add CSS for red dot indicator on `.has-event` class
- [ ] Update `Sidebar.svelte` to pass dates to Calendar
- [ ] Ensure indicators update when entries are added/removed

## Content Outline

### Calendar.svelte Changes

```svelte
<script lang="ts">
  // Add prop for dates with entries
  let { onselect, datesWithEntries = [] } = $props<{
    onselect: (date: Date) => void;
    datesWithEntries?: string[];  // Array of "YYYY-MM-DD" strings
  }>();

  // Convert to Date strings for Pikaday events format
  $effect(() => {
    if (picker) {
      // Pikaday expects: ['Sat Dec 28 2024', 'Sun Dec 29 2024', ...]
      const eventDates = datesWithEntries.map(dateStr => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day).toDateString();
      });
      picker.config({ events: eventDates });
      picker.draw();
    }
  });
</script>
```

### Pikaday Configuration

```typescript
picker = new Pikaday({
  // ... existing options
  events: [],  // Will be updated via effect
});
```

### CSS for Red Dot

```css
/* Position button relatively for absolute dot */
:global(.pika-button) {
  position: relative;
}

/* Red dot indicator for days with entries */
:global(.has-event .pika-button)::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #f44;
}

/* Ensure dot doesn't interfere with selection styling */
:global(.is-selected.has-event .pika-button)::after {
  background: #fff;  /* White dot on selected blue background */
}
```

### Sidebar.svelte Changes

```svelte
<script lang="ts">
  import { getDatesWithEntries } from '$lib/stores/journal.svelte';
</script>

<Calendar
  onselect={handleDateSelect}
  datesWithEntries={getDatesWithEntries()}
/>
```

### Reactivity Flow

1. User adds first entry to a date
2. Store's `saveEntries()` succeeds
3. Store updates `datesWithEntries` Set
4. `getDatesWithEntries()` returns updated array
5. Sidebar passes to Calendar via prop
6. Calendar's `$effect` runs, updates Pikaday events
7. Pikaday redraws with `.has-event` class on that date's cell
8. CSS shows red dot

## Dependencies

- Phase 02: Journal Store (`getDatesWithEntries()` function)
- Existing: Pikaday library (already configured)

## Acceptance Criteria

- [ ] Calendar shows red dot for dates with entries
- [ ] Red dot appears when first entry is added to a date
- [ ] Red dot disappears when last entry is removed from a date
- [ ] Red dot visible on non-selected dates
- [ ] Red dot styling works on selected date (white on blue)
- [ ] Dots persist across calendar month navigation
- [ ] Initial load shows dots for all existing journal files
