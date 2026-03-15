# Vault Agent Daily Tasks Skill Package

This package defines the Codex-side workflow for the three supported vault commands:

- `schedule-daily-tasks`
- `morning-standup`
- `evening-review`

The app runtime provides:

- `GET /api/files/export` for bulk vault snapshots
- `POST /api/agent/context` for fresh date-specific context
- `POST /api/agent/journal/plan` for diff-first previews
- `POST /api/agent/journal/apply` for confirmed writes

Shared rules:

1. Prefer an export snapshot for broad vault context when it is available and fresh enough for the task.
2. Always fetch fresh command context before proposing writes.
3. Build proposals as journal-entry and task-item upserts/deletes rather than editing YAML by hand.
4. Always show the `plan` diff before `apply`.
5. Only call `apply` after explicit user confirmation.
6. If a command override exists under `.editor-agent/commands/`, treat it as higher priority than the bundled guidance.

Request notes:

- The runtime accepts an optional `dailyNotesFolder`. Pass it when the app is configured to use a non-default daily-notes directory.
- The runtime owns IDs, timestamps, and file writes for newly created records.
