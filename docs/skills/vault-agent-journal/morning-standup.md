# `morning-standup`

Goal:

- create or update a date-specific standup entry grounded in the current journal state

Workflow:

1. Read `POST /api/agent/context` with `commandId: "morning-standup"`.
2. Inspect the current day’s `journal.entries` and any override content.
3. Propose `entryUpserts` or `entryDeleteIds` as needed.
4. Preview with `POST /api/agent/journal/plan`.
5. Apply with `POST /api/agent/journal/apply` only after confirmation.

Guidelines:

- prefer updating an existing standup entry when the user is refining it
- keep the output date-specific and grounded in the current journal state
- avoid deleting unrelated journal entries
