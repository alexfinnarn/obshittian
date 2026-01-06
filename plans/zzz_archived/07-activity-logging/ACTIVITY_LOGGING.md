# Activity Logging

Add an activity logging system that tracks file operations and stores them in the vault for later analysis by humans and AI agents.

## Goals

1. Track file operations (open, save, create, rename, delete) with timestamps
2. Store activity logs in vault as JSONL files for portability
3. Enable on-demand report generation via slash commands
4. Create a foundation for future analytics and AI-assisted insights

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 01 | Core logger service and types | Completed |
| 02 | Integration hooks in existing services | Completed |
| 03 | Slash commands for report generation | Completed |

## Background

The user wants to understand their note-taking patterns over time and provide structured data for AI agents to analyze. File-based storage was chosen over database/API approaches because:
- Logs travel with the vault
- No additional infrastructure needed
- AI agents can read files directly
- Human-readable with standard tools

### User Choices
- **Storage**: Inside vault at `_reports/logs/`
- **Granularity**: Coarse (file operations only, ~10-50 events/day)
- **Reports**: On-demand via slash commands

## Deliverables

- `src/lib/services/activityLogger.ts` - Core logging service
- `src/lib/types/activity.ts` - TypeScript types for events
- Logging hooks in fileOpen.ts, fileSave.ts, fileOperations.ts, +page.svelte
- `.claude/commands/daily-report.md` - Daily report slash command
- `.claude/commands/weekly-report.md` - Weekly report slash command

## Future Work (Out of Scope)

- Automatic scheduled report generation
- Fine-grained tracking (edit sessions, character counts, idle detection)
- Log rotation/cleanup
- Dashboard UI for viewing activity
- Journal entry tracking
