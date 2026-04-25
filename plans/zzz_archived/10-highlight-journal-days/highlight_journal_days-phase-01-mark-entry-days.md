# Phase 01: Drop Gating, Mark Entry Days, Restyle

**Status:** Completed
**Output:** `src/lib/components/Calendar.svelte`, `src/lib/components/Calendar.test.ts`

## Objective

Replace the enable-list gating in the calendar with a per-cell marker for days that have a journal
entry, and restyle so "has entry" is the visually weighted state.

## Approach

Vanilla Calendar Pro's `onCreateDateEls(self, dateEl)` runs as each date cell is created. Read
`dateEl.dataset.vcDate` (the `YYYY-MM-DD` already exposed by the library and used in `onClickDate`),
check membership in a `Set<string>` built from `datesWithEntries`, and set a
`data-has-journal-entry` attribute on the cell when it matches. Use singular
`data-has-journal-entry` consistently because the marker describes the day state, not the entry
count.

Apply the marker idempotently with `toggleAttribute` (or equivalent explicit set/remove logic) so a
reused date cell cannot keep a stale marker after `datesWithEntries` changes.

The `Set` should be derived in a `$derived` from the `datesWithEntries` prop so it stays current.
When `datesWithEntries` changes, call `calendar.update({ dates: true })` to force the cells to be
re-created so the hook re-runs against the new set. This replaces the existing `$effect` that
re-applies `enableDates`.

`disableAllDates`, `enableDates`, and `getEnabledDates` are removed entirely. The `onClickDate`
handler stays as-is — it already extracts the date from the cell's `data-vc-date` and forwards it
via `onselect`.

Weekend styling should also be neutralized in the same calendar configuration change. Set
`selectedWeekends: []` in the Vanilla Calendar Pro options so weekend dates are not marked with
`data-vc-date-weekend` and do not receive the library's weekend-specific visual treatment. If the
library still emits a weekend marker after that option is applied, add a scoped style override that
keeps weekend cells visually equivalent to normal cells.

## Tasks

### Component

- [x] Remove `disableAllDates: true` and `enableDates: enabledDates` from the `Calendar` constructor
  options.
- [x] Delete the `getEnabledDates` helper.
- [x] Build a reactive `Set<string>` of entry dates from the `datesWithEntries` prop.
- [x] Add an `onCreateDateEls` option that toggles `data-has-journal-entry` on cells based on
  whether `data-vc-date` is in the set.
- [x] Set `selectedWeekends: []` in the calendar options so weekend dates are not marked as a
  separate visual category.
- [x] Replace the existing `$effect` (which re-applied `enableDates`) with one that calls
  `calendar.update({ dates: true })` whenever the entry set changes, so the hook re-runs.

### Styling

- [x] Remove the `[data-vc-date-disabled]` block in `Calendar.svelte`'s `<style>` (no day will be
  disabled anymore).
- [x] Remove the `:global(.vc-date__btn[aria-disabled="true"])` block for the same reason.
- [x] Add a `:global(.vc-date[data-has-journal-entry])` rule that gives entry days clear visual
  weight. Prefer a small dot or underline on `.vc-date__btn` via `::after`, using
  `var(--vc-accent-color)`, so the entry highlight does not compete with selected or today text
  styling.
- [x] Ensure weekend cells have the same visual weight as ordinary cells. Prefer configuration-only
  removal via `selectedWeekends: []`; add a scoped CSS neutralization only if the library still
  renders weekend-specific styling.
- [x] Verify the today, selected, and outside-month styles still read correctly when a cell also has
  `data-has-journal-entry`.

### Tests

- [x] Remove the four tests that assert the old gating behavior: "configures calendar with
  disableAllDates and enableDates", "enables today and next 7 days even without entries", "enables
  the correct date range (today through 7 days ahead)", and "combines future week with past dates
  that have entries".
- [x] Assert that `disableAllDates` and `enableDates` are not set in the options passed to the
  underlying calendar.
- [x] Assert that `selectedWeekends` is set to an empty array in the options passed to the
  underlying calendar.
- [x] Assert that `onCreateDateEls` is provided in the options.
- [x] Add a focused test that calls the captured `onCreateDateEls` with a synthetic `dateEl` whose
  `data-vc-date` is in `datesWithEntries`, and asserts `data-has-journal-entry` is set on it.
- [x] Add the inverse test: a `dateEl` whose `data-vc-date` is not in `datesWithEntries` does not
  get the attribute.
- [x] Add a stale-marker test: a synthetic `dateEl` that already has `data-has-journal-entry` but
  whose `data-vc-date` is not in `datesWithEntries` has the attribute removed.
- [x] Add a behavior test that simulates clicking an arbitrary date and asserts `onselect` receives
  that date, confirming date selection is not limited to entry days or the old today-plus-seven
  range.
- [x] Extend the mock in `Calendar.test.ts` to capture `onCreateDateEls` so the marker tests can
  drive it directly.
- [x] Update the mock `update` method to accept an options argument and track calls if needed, since
  the replacement `$effect` may call `calendar.update({ dates: true })` after mount and after
  `datesWithEntries` changes.

## Dependencies

- None. `vanilla-calendar-pro` already exposes `onCreateDateEls` (confirmed in
  `node_modules/vanilla-calendar-pro/options.d.ts`).

## Acceptance Criteria

- [x] Clicking any date in the calendar — past, present, or future, with or without an entry —
  invokes `onselect` and loads the journal pane for that date.
- [x] Days listed in `datesWithEntries` carry `data-has-journal-entry` and render with the new
  highlight style.
- [x] Stale `data-has-journal-entry` markers are removed when a cell date is not in
  `datesWithEntries`.
- [x] Days not in `datesWithEntries` render as plain, fully-enabled cells (no muted color, no
  `cursor: not-allowed`).
- [x] Weekend dates render with the same visual weight as ordinary non-entry dates and are not a
  separate visual category.
- [x] When `datesWithEntries` changes, the highlight set updates without reloading the page.
- [x] No reference to `disableAllDates`, `enableDates`, or `getEnabledDates` remains in
  `Calendar.svelte` or `Calendar.test.ts`.
- [x] `npm run test:run` passes.
- [x] `npm run check` passes.
