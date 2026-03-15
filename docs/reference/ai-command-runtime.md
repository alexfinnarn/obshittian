# AI Command Runtime

This document describes the app-owned runtime contract used by Codex daily-task commands.

## Goals

- provide fresh date-specific context without requiring Codex to parse vault files directly
- provide diff-first planning before any journal write
- keep file writes, IDs, timestamps, and YAML serialization owned by the app

## Endpoints

### `POST /api/agent/context`

Request:

```json
{
  "date": "2026-03-15",
  "commandId": "schedule-daily-tasks",
  "dailyNotesFolder": "zzz_Daily Notes"
}
```

Response includes:

- recurring daily-task definitions with `visibleOnDate` and `taskTag`
- current journal `entries` and `taskItems` for the date
- the journal YAML path for that date
- optional override content for the requested command
- installed AI-support template version when available

### `POST /api/agent/journal/plan`

Request:

```json
{
  "date": "2026-03-15",
  "dailyNotesFolder": "zzz_Daily Notes",
  "entryUpserts": [
    {
      "text": "## Morning Standup",
      "tags": ["standup"]
    }
  ],
  "taskItemUpserts": [
    {
      "taskId": "gym",
      "text": "Warm up",
      "status": "pending"
    }
  ]
}
```

Behavior:

- loads the current journal state for the date
- applies the requested upserts/deletes in memory
- assigns IDs, timestamps, and default order values for new records
- returns `currentData`, `proposedData`, `summary`, and a text diff
- does not write to disk

### `POST /api/agent/journal/apply`

Same request shape as `plan`, plus:

```json
{
  "confirm": true
}
```

Behavior:

- recomputes the plan from the submitted request
- writes the proposed YAML only when `confirm` is explicitly `true`
- deletes the YAML file when the proposed result has zero entries and zero task items

## Proposal Model

Entry upserts:

- omit `id` to create a new journal entry
- provide `id` to update an existing journal entry
- provide `entryDeleteIds` to delete existing journal entries

Task-item upserts:

- omit `id` to create a new task item
- provide `id` to update an existing task item
- provide `taskItemDeleteIds` to delete existing task items

Rules:

- unknown existing IDs are rejected as `400 BAD_REQUEST`
- task-item status must be `pending`, `in-progress`, or `completed`
- new task items default to `#dt/<task-id>` tags when no explicit tags are provided

## Recommended Command Flow

1. Optionally download `GET /api/files/export` for broad vault context.
2. Fetch `POST /api/agent/context` for the target date and command.
3. Build a proposal using upserts/deletes.
4. Call `POST /api/agent/journal/plan`.
5. Show the summary and diff to the user.
6. Call `POST /api/agent/journal/apply` only after explicit confirmation.
