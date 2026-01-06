# Weekly Activity Report

Generate a report of file activity for the past 7 days.

## Instructions

1. Determine the date range:
   - End date: today
   - Start date: 7 days ago (inclusive)

2. Read the vault path from `src/lib/config.ts` (`obsidianVaultPath`)

3. Look for activity log files at `{vault}/_reports/logs/YYYY-MM-DD.jsonl` for each day in the range

4. If no log files exist for the entire week, report that no activity was logged

5. Parse each JSONL file and combine all activities

6. Analyze the activities and generate statistics:
   - Total counts by event type across all days
   - Daily breakdown of activity
   - Most active files across the week
   - All new files created
   - Day-over-day trends (busiest day, quietest day)

7. Determine the ISO week number for the report filename (YYYY-Www format)

8. Create the report at `{vault}/_reports/weekly/YYYY-Www.md`

9. If the `_reports/weekly` folder doesn't exist, create it

## Output Format

```markdown
---
type: weekly-report
week: YYYY-Www
start_date: YYYY-MM-DD
end_date: YYYY-MM-DD
generated: ISO-timestamp
summary:
  files_opened: N
  files_saved: N
  files_created: N
  days_active: N
---

# Weekly Activity Report: Week N, Year

**Period:** Month Day - Month Day, Year

## Summary
- Opened N files across N days
- Saved N files
- Created N new files
- Most active day: DayName (N events)
- Quietest day: DayName (N events)

## Daily Breakdown
| Date | Opens | Saves | Created | Total |
|------|-------|-------|---------|-------|
| Mon Jan 1 | N | N | N | N |
| Tue Jan 2 | N | N | N | N |
(All 7 days, showing 0 for inactive days)

## Most Active Files
| File | Opens | Saves | Total |
|------|-------|-------|-------|
| path/to/file.md | N | N | N |
(Top 10 files by total activity)

## New Files Created
| Date | File |
|------|------|
| Jan 1 | path/to/new-file.md |
(All files created during the week)

## Activity by Day of Week
| Day | Events |
|-----|--------|
| Monday | N |
| Tuesday | N |
(Shows typical activity pattern)
```

## Notes

- Include days with zero activity in the daily breakdown for completeness
- Use abbreviated day names (Mon, Tue, etc.) in tables
- ISO week numbers: Week 1 is the week containing the first Thursday of the year
- If spanning two different weeks (e.g., year boundary), use the week of the end date
- Track renamed files under their final name
- Skip sections that would be entirely empty
