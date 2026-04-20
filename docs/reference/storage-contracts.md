# Storage and Persistence Contracts

This document describes the vault-owned files and browser persistence the app currently depends on.

## Vault-Owned Files

### `.editor-config.json`

Purpose:

- stores vault-specific quick links
- stores vault-specific quick files

Current shape:

```json
{
  "quickLinks": [
    { "name": "Gmail", "url": "https://mail.google.com/mail/u/0/#inbox" }
  ],
  "quickFiles": [
    { "name": "Todo", "path": "01_Todo.md" }
  ]
}
```

Notes:

- the file is optional
- if it is missing or invalid, the app falls back to defaults
- legacy `dailyTasks` fields are ignored on load and dropped on the next save

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
  "templateVersion": 3,
  "installedAt": "2026-03-15T10:00:00.000Z",
  "updatedAt": "2026-03-15T10:00:00.000Z",
  "commands": {
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

### Agent Runtime API

Purpose:

- provides a stable app-owned contract for Codex commands to inspect date-specific context, preview diffs, and apply confirmed journal writes

Routes:

```text
POST /api/agent/context
POST /api/agent/journal/plan
POST /api/agent/journal/apply
```

Notes:

- `context` returns current journal state for a date and optional command-override content
- `plan` returns a proposed journal result plus a diff without writing files
- `apply` performs the same plan and writes it only when `confirm: true`
- the runtime accepts an optional `dailyNotesFolder` so Codex can target non-default journal directories when needed

### Daily Journal YAML

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
    createdAt: "2026-03-14T10:00:00.000Z"
    updatedAt: "2026-03-14T10:00:00.000Z"
```

Notes:

- the file is deleted when a day has zero entries
- missing files are treated as "no entries for this date"
- tags are normalized at load time so older entries without `tags` become `[]`
- legacy entry `order` values are ignored on load and omitted from new writes
- legacy `taskItems` fields are tolerated on read and dropped on the next write

### Daily Markdown Note

Path pattern:

```text
{dailyNotesFolder}/YYYY/MM/YYYY-MM-DD.md
```

Purpose:

- stores the Markdown daily note opened or created by the daily-note utilities

Notes:

- this is separate from the journal YAML file for the same date
- the app creates parent year/month folders as needed

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

### `editorLeftPaneTabs`

Purpose:

- stores the open left-pane tabs and active index between browser sessions

### `editorPaneWidth`

Purpose:

- stores the left/right pane split position

### `editorCollapsedPane`

Purpose:

- stores which pane is collapsed, if any
