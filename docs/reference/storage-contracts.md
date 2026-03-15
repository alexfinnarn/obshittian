# Storage and Persistence Contracts

This document describes the vault-owned files and browser persistence the app currently depends on.

## Vault-Owned Files

### `.editor-config.json`

Purpose:

- stores vault-specific quick links
- stores vault-specific quick files
- stores daily-task definitions used by the journal UI

Current shape:

```json
{
  "quickLinks": [
    { "name": "Gmail", "url": "https://mail.google.com/mail/u/0/#inbox" }
  ],
  "quickFiles": [
    { "name": "Todo", "path": "01_Todo.md" }
  ],
  "dailyTasks": [
    {
      "id": "gym",
      "name": "Gym",
      "days": "daily"
    }
  ]
}
```

Notes:

- the file is optional
- if it is missing or invalid, the app falls back to defaults
- `dailyTasks` is part of the real contract and is consumed by the journal pane
- the task tag (e.g., `#dt/gym`) is derived from `id` at runtime

### `.editor-tags.yaml`

Purpose:

- stores the tag autocomplete vocabulary shared across files and journal entries

Current shape:

```yaml
version: 1
tags:
  - name: project
    count: 3
  - name: meeting
    count: 1
```

Notes:

- if the file does not exist, the app rebuilds vocabulary from the current tag index and writes the file
- this file is for autocomplete vocabulary, not the full tag index

### `.editor-agent/`

Purpose:

- stores the vault-local AI support contract installed through App Settings

Current shape:

```text
.editor-agent/
  contract.md
  config.json
  commands/
    README.md
```

`config.json` shape:

```json
{
  "version": 1,
  "templateVersion": 2,
  "installedAt": "2026-03-15T10:00:00.000Z",
  "updatedAt": "2026-03-15T10:00:00.000Z",
  "commands": {
    "schedule-daily-tasks": {
      "overridePath": ".editor-agent/commands/schedule-daily-tasks.md"
    },
    "morning-standup": {
      "overridePath": ".editor-agent/commands/morning-standup.md"
    },
    "evening-review": {
      "overridePath": ".editor-agent/commands/evening-review.md"
    }
  }
}
```

Notes:

- these files are installed only through explicit user actions
- `contract.md`, `config.json`, and `commands/README.md` are app-managed files
- command override files under `.editor-agent/commands/` are optional and user-owned
- override-file presence does not determine install state
- the installed contract documents the supported Codex commands and the agent runtime endpoints
- recurring-task templates remain separate under `templates/tags/dt/<task-id>/NN.md`

### Agent runtime API

Purpose:

- provides a stable app-owned contract for Codex commands to inspect date-specific context, preview diffs, and apply confirmed journal writes

Routes:

```text
POST /api/agent/context
POST /api/agent/journal/plan
POST /api/agent/journal/apply
```

Notes:

- `context` returns recurring-task definitions, current journal state for a date, and optional command-override content
- `plan` returns a proposed journal result plus a diff without writing files
- `apply` performs the same plan and writes it only when `confirm: true`
- the runtime accepts an optional `dailyNotesFolder` so Codex can target non-default journal directories when needed

### Daily journal YAML

Path pattern:

```text
{dailyNotesFolder}/YYYY/MM/YYYY-MM-DD.yaml
```

Current shape (version 3):

```yaml
version: 3
entries:
  - id: 2d5b7c1b-3f62-4eb5-9f2f-4b6d3d2e4a11
    text: Example note
    tags:
      - project
    order: 1
    createdAt: "2026-03-14T10:00:00.000Z"
    updatedAt: "2026-03-14T10:00:00.000Z"
taskItems:
  - id: a1d6cb0d-55d2-4f8a-a7e4-3f4cdb2d3c1b
    taskId: gym
    text: Warm up for 10 minutes
    status: pending
    tags:
      - "#dt/gym"
      - workout
    order: 1
    createdAt: "2026-03-14T10:05:00.000Z"
    updatedAt: "2026-03-14T10:05:00.000Z"
  - id: c3b2d1b8-e9c2-4a37-b33b-7d7d6929d0af
    taskId: gym
    text: Mobility routine
    status: completed
    tags:
      - "#dt/gym"
    order: 2
    createdAt: "2026-03-14T10:06:00.000Z"
    updatedAt: "2026-03-14T10:30:00.000Z"
```

Notes:

- the file is deleted when a day has zero entries AND zero task items
- missing files are treated as "no entries for this date"
- tags are normalized at load time so older entries without `tags` become `[]`
- task items store their own tags for search/indexing, but task completion is derived from task item status
- version 2 files are migrated to version 3 in memory with empty `taskItems` array

### Daily Markdown note

Path pattern:

```text
{dailyNotesFolder}/YYYY/MM/YYYY-MM-DD.md
```

Purpose:

- stores the Markdown daily note opened or created by the daily-note utilities

Notes:

- this is separate from the journal YAML file for the same date
- the app creates parent year/month folders as needed

### Daily task templates

Path pattern:

```text
templates/tags/dt/<task-id>/NN.md
```

Example:

```text
templates/tags/dt/gym/01.md
```

Purpose:

- provides template text for task-specific journal entries

Notes:

- task tabs in the journal pane can load these templates
- missing templates are a validation failure when task template validation is run

## Browser Persistence

### `vaultPath`

Purpose:

- last validated vault path used by the Vault Picker and auto-restore flow

Current behavior:

- manual open writes this key
- bootstrap may use it to revalidate and reopen the vault

### `editorSettings`

Purpose:

- stores user preferences loaded into the `settings` store

Current shape:

```json
{
  "autoOpenLastDirectory": true,
  "autoOpenTodayNote": true,
  "restoreLastOpenFile": true,
  "restorePaneWidth": true,
  "quickFilesLimit": 5,
  "shortcuts": {
    "save": { "key": "s", "modifiers": ["meta"] }
  },
  "dailyNotesFolder": "zzz_Daily Notes",
  "defaultQuickLinks": [],
  "defaultQuickFiles": []
}
```

Notes:

- this is user-local state, not vault-shared state
- some stored preferences describe intended behavior more broadly than current bootstrap actually uses

### `editorLeftPaneTabs`

Purpose:

- persists the open left-pane file list and active tab index

Current shape:

```json
{
  "tabs": [
    { "filePath": "README.md", "filename": "README.md" }
  ],
  "activeIndex": 0
}
```

Notes:

- only file paths and display names are persisted
- file contents are reloaded from disk during restore
- this is the active mechanism used for reopening editor tabs

### `editorTagIndex`

Purpose:

- caches the full tag index to avoid rescanning the vault on every load

Current shape:

```json
{
  "index": {
    "files": {
      "notes/todo.md": ["project"],
      "journal:2026-03-14#entry-id": ["project", "#dt/gym"]
    },
    "tags": {
      "project": ["notes/todo.md", "journal:2026-03-14#entry-id"]
    },
    "allTags": [
      { "tag": "project", "count": 2 }
    ]
  },
  "meta": {
    "fileCount": 2,
    "tagCount": 1,
    "lastIndexed": 1710420000000
  }
}
```

Notes:

- both Markdown files and journal entries are indexed
- journal entries use synthetic source keys prefixed with `journal:`
- if this cache is missing or invalid, the app rebuilds it from the vault

### `editorLastOpenFile`

Purpose:

- stores the path of the most recently active left-pane file

Current behavior:

- the app writes this key when the active tab changes
- current bootstrap does not use this key to reopen a file; tab restoration comes from `editorLeftPaneTabs`

### `editorPaneWidth`

Purpose:

- stores the left-pane width percentage

Current behavior:

- bootstrap restores this value if present

## Ownership Rules

- If multiple developers or devices should share it, it belongs in the vault
- If it is personal browser state, it belongs in localStorage
- If it is ephemeral session state, it should stay in memory and be recreated during bootstrap
