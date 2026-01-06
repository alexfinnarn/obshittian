# Daily Activity Report

Generate a report of file activity for a specific date.

## Instructions

1. Determine the target date:
   - If no argument provided, use today's date
   - If argument provided (e.g., `/daily-report 2026-01-04`), use that date

2. Read the vault path from `src/lib/config.ts` (`obsidianVaultPath`)

3. Look for the activity log file at `{vault}/_reports/logs/YYYY-MM-DD.jsonl`

4. If the log file doesn't exist, report that no activity was logged for that date

5. Parse the JSONL file (each line is a JSON object with `ts`, `event`, and `data` fields)

6. Analyze the activities and generate statistics:
   - Count by event type (file.opened, file.saved, file.created, file.renamed, file.deleted)
   - Find most active files (by open + save count)
   - List new files created
   - Build chronological timeline

7. Create the report at `{vault}/_reports/daily/YYYY-MM-DD.md`

8. If the `_reports/daily` folder doesn't exist, create it

## Output Format

```markdown
---
type: daily-report
date: YYYY-MM-DD
generated: ISO-timestamp
summary:
  files_opened: N
  files_saved: N
  files_created: N
  files_renamed: N
  files_deleted: N
---

# Daily Activity Report: Month Day, Year

## Summary
- Opened N files
- Saved N files
- Created N new files
(Skip zero counts)

## Most Active Files
| File | Opens | Saves |
|------|-------|-------|
| path/to/file.md | N | N |
(Top 5 files by total activity, skip if no activity)

## New Files Created
- path/to/new-file.md (HH:MM)
(Skip section if none created)

## Timeline
| Time | Event | File |
|------|-------|------|
| HH:MM | opened | path/to/file.md |
| HH:MM | saved | path/to/file.md |
(Chronological list of all events)
```

## Event Types

- `file.opened` - File was opened (data: path, pane, source)
- `file.saved` - File was saved (data: path, pane, sizeBytes)
- `file.created` - File or folder created (data: path, kind)
- `file.renamed` - File or folder renamed (data: oldPath, newPath)
- `file.deleted` - File or folder deleted (data: path, kind)
- `vault.opened` - Vault was opened (data: path, source)
- `dailynote.opened` - Daily note opened (data: date, wasCreated)

## Notes

- Times should be displayed in local timezone (extract from ISO timestamp)
- Skip sections that have no data
- If a file was renamed, track activity under the new name
- Vault and dailynote events can be mentioned in timeline but don't count in file stats
