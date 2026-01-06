# Phase 03: Report Generation Commands

**Status:** Pending
**Output:** `.claude/commands/daily-report.md`, `.claude/commands/weekly-report.md`

## Objective

Create slash commands for generating activity reports from log data.

## Tasks

- [ ] Create `.claude/commands/daily-report.md` slash command
- [ ] Create `.claude/commands/weekly-report.md` slash command
- [ ] Define report output format with YAML frontmatter
- [ ] Test report generation with sample log data

## Content Outline

### Daily Report Command

`.claude/commands/daily-report.md`:
- Reads log file for specified date (default: today)
- Generates markdown report with:
  - Summary stats (files opened, saved, created)
  - Most active files
  - New files created
  - Chronological timeline
- Outputs to `_reports/daily/YYYY-MM-DD.md`

### Weekly Report Command

`.claude/commands/weekly-report.md`:
- Reads log files for last 7 days
- Generates markdown report with:
  - Week summary stats
  - Daily breakdown
  - Most active files across week
  - New files created
  - Day-over-day trends
- Outputs to `_reports/weekly/YYYY-Www.md`

### Report Format

```markdown
---
type: daily-report
date: 2026-01-04
generated: 2026-01-04T23:59:00Z
summary:
  files_opened: 12
  files_saved: 8
  files_created: 2
  files_renamed: 1
  files_deleted: 0
---

# Daily Activity Report: January 4, 2026

## Summary
- Opened 12 files
- Saved 8 files
- Created 2 new files

## Most Active Files
| File | Opens | Saves |
|------|-------|-------|
| notes/project-plan.md | 3 | 2 |
| journal/2026/01/2026-01-04.md | 2 | 4 |

## New Files Created
- notes/meeting-notes.md (10:45)
- ideas/new-feature.md (14:22)

## Timeline
| Time | Event | File |
|------|-------|------|
| 10:30 | opened | notes/todo.md |
| 10:31 | saved | notes/todo.md |
| 10:45 | created | notes/meeting-notes.md |
```

## Dependencies

- Phase 01 complete (can read log files)
- Phase 02 complete (logs are being generated)

## Acceptance Criteria

- [ ] /daily-report generates report for today
- [ ] /daily-report 2026-01-03 generates report for specific date
- [ ] /weekly-report generates last 7 days summary
- [ ] Reports include YAML frontmatter for AI parsing
- [ ] Reports are human-readable markdown
- [ ] Empty days handled gracefully
