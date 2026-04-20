# `evening-review`

Goal:

- create or update a date-specific review entry grounded in the current journal state

Workflow:

1. Read `POST /api/agent/context` with `commandId: "evening-review"`.
2. Inspect the current day’s `journal.entries` and any override content.
3. Propose `entryUpserts` or `entryDeleteIds` as needed.
4. Preview with `POST /api/agent/journal/plan`.
5. Apply with `POST /api/agent/journal/apply` only after confirmation.

Guidelines:

- base the review on actual journal content for that date
- prefer updating an existing review entry instead of duplicating it
- avoid deleting unrelated journal entries
