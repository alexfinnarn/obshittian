# Calendar Replacement: Pikaday to Vanilla Calendar Pro

Replace the archived Pikaday library with the actively maintained Vanilla Calendar Pro for the calendar widget in the sidebar.

## Goals

1. Remove dependency on archived Pikaday library
2. Fix keyboard navigation bug (arrow keys triggering without Cmd modifier)
3. Enable date disabling for past dates without journal entries
4. Disable future dates (journaling is for capturing past/present, not planning)
5. Maintain dark theme consistency

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 01 | Install and basic setup | Completed |
| 02 | Date enable/disable logic | Completed |
| 03 | Testing, documentation, and cleanup | Completed |

## Background

The current calendar uses Pikaday, which is now archived on GitHub and no longer maintained. Additionally, there's a bug where Pikaday's built-in keyboard navigation intercepts plain arrow keys, conflicting with the app's Cmd+Arrow shortcuts for daily note navigation.

Vanilla Calendar Pro is a modern, actively maintained alternative with:
- No dependencies, ~13KB gzipped
- Built-in dark/light theme support
- `disableAllDates` + `enableDates` pattern for selective date enabling
- No conflicting keyboard handlers
- TypeScript support
- Accessibility features (ARIA labels, tabindex)

## Deliverables

- Updated `package.json` with vanilla-calendar-pro dependency
- Refactored `Calendar.svelte` component using Vanilla Calendar Pro
- Updated E2E tests for calendar functionality
- Removal of Pikaday dependency and CSS import
- Updated CLAUDE.md with new calendar library documentation

## Technical Approach

### Key API Mappings (Pikaday → Vanilla Calendar Pro)

| Feature | Pikaday | Vanilla Calendar Pro |
|---------|---------|---------------------|
| Date selection callback | `onSelect: (date) => {}` | `onClickDate: (self, event) => {}` |
| Set selected date | `picker.setDate(date)` | `calendar.set({ selectedDates: ['YYYY-MM-DD'] }); calendar.update()` |
| Get selected date | `picker.getDate()` | `calendar.selectedDates[0]` |
| Dark theme | CSS overrides | `selectedTheme: 'dark'` |
| Disable dates | Not built-in | `disableAllDates: true, enableDates: [...]` |
| First day of week | `firstDay: 0` | `firstWeekday: 0` |
| Inline display | `bound: false` | Default (no `inputMode`) |

### Date Enable/Disable Strategy

The enabled/disabled state serves as the visual indicator (no red dots needed):

- **Today**: Always enabled (journal entry point)
- **Past dates WITH entries**: Enabled (clickable for review)
- **Past dates WITHOUT entries**: Disabled (grayed out, not clickable)
- **Future dates**: Disabled (journaling captures past/present, not future)

### Keyboard Navigation

Keyboard navigation (Cmd+Arrow for day/week navigation) was removed during Phase 02 to simplify the implementation. Users must click calendar dates directly, which:
- Eliminates complexity around restricting navigation to enabled dates only
- Removes edge case handling for yesterday/today boundaries
- Encourages direct calendar interaction

## Future Work (Out of Scope)

- Date range selection
- Time picker functionality
- Multiple month display
