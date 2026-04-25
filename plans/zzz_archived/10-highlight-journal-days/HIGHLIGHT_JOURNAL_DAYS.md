# Highlight Journal Days

Make every day in the calendar selectable and visually highlight days that have a journal entry,
instead of disabling days that don't. Right now, users cannot set entries for days in the future
that they might want to make notes for.

The disabling of dates was only done since it provided a visual cue to which days had notes on
them.

## Goals

1. Allow opening the journal pane for any date by clicking it in the calendar.
2. Visually distinguish days that have an existing journal entry from days that do not.
3. Remove weekend-specific visual emphasis so it does not compete with journal-entry highlighting.
   Set `selectedWeekends: []` so weekend cells are not marked with `data-vc-date-weekend`.
4. Remove the `disableAllDates` / `enableDates` gating and the disabled-cell styling that
   currently doubles as both gate and visual hint.

## Phases

| Phase | Description                                                      | Status  |
|-------|------------------------------------------------------------------|---------|
| 01    | Drop date gating, mark entry days via `onCreateDateEls`, restyle | Completed |

## Background

Today the calendar uses `disableAllDates: true` plus an `enableDates` allow-list (today + next 7
days, plus any past date with a journal entry) to control which cells are clickable. The
`[data-vc-date-disabled]` styling — muted color, lower opacity, `cursor: not-allowed` — is what
visually separates "has entry" days from the rest, but only because every other past day is
disabled.

This conflates two things. The user wants to be able to open a note for any day (e.g. backfill
an old day, or open a future day), and the visual weight should come from "has entry," not from
"is enabled." Vanilla Calendar Pro exposes `onCreateDateEls(self, dateEl)`, a per-cell hook that
lets us tag entry days with a data attribute or class so CSS can target them directly.

`handleDateSelect` in `src/routes/+page.svelte:326` already just forwards the date to
`loadEntriesForDate(date)` — it does not depend on the date being "enabled" — so the downstream
behavior is unchanged when any day becomes clickable.

## Deliverables

- A calendar where every date is clickable.
- Days with journal entries carry a `data-has-journal-entry` attribute and a clear visual treatment.
- Removal of `disableAllDates`, `enableDates`, `getEnabledDates`, and the `$effect` that re-applies
  them.
- Updated component tests that assert the new marking behavior, arbitrary-date click behavior,
  and absence of the old enable-list gating.
- Updated CSS that no longer relies on `[data-vc-date-disabled]` to convey "no entry."
- Calendar configuration sets `selectedWeekends: []`, with tests confirming weekend cells are not
  marked or styled as a separate visual category.

## Out of Scope

- Any change to how entries are loaded, created, or saved when a day is selected.
- Any change to `getDatesWithEntries` or the journal store.
- Adding bounds on far-future or far-past dates — explicitly removing all gating per the design
  decision.
- Mobile-specific behavior changes (the existing `isMobile` switch to the journal view continues to
  work unchanged).
- Changes to the today indicator or selected-date styling.
