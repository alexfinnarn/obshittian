# Vault Agent Journal

This package documents the bundled Codex journal commands that use the app-owned runtime.

Commands:

- `morning-standup`
- `evening-review`

Runtime endpoints:

- `POST /api/agent/context`
- `POST /api/agent/journal/plan`
- `POST /api/agent/journal/apply`

Recommended flow:

1. Fetch fresh context for the target date.
2. Build journal-entry upserts or deletes.
3. Preview the diff with `plan`.
4. Apply only after explicit user confirmation.
