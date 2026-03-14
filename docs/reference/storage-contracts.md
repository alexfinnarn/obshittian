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
      "tag": "#dt/gym",
      "targetCount": 1,
      "days": "daily"
    }
  ]
}
```

Notes:

- the file is optional
- if it is missing or invalid, the app falls back to defaults
- `dailyTasks` is part of the real contract and is consumed by the journal pane

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

### Daily journal YAML

Path pattern:

```text
{dailyNotesFolder}/YYYY/MM/YYYY-MM-DD.yaml
```

Current shape:

```yaml
version: 2
entries:
  - id: 2d5b7c1b-3f62-4eb5-9f2f-4b6d3d2e4a11
    text: Example note
    tags:
      - project
      - "#dt/gym"
    order: 1
    createdAt: "2026-03-14T10:00:00.000Z"
    updatedAt: "2026-03-14T10:00:00.000Z"
```

Notes:

- the file is deleted when a day has zero entries
- missing files are treated as “no entries for this date”
- tags are normalized at load time so older entries without `tags` become `[]`

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
