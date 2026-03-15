# `evening-review`

Purpose:

- prepare or update a date-specific evening review entry based on the current day’s work

Workflow:

1. Read `POST /api/agent/context` with `commandId: "evening-review"`.
2. Inspect the current day’s `journal.entries`, `journal.taskItems`, and optional override content.
3. Draft an evening review as an `entryUpsert`, or update an existing review entry when the intent is clear.
4. Use `POST /api/agent/journal/plan` to preview the diff.
5. Present the proposed review and diff to the user.
6. Use `POST /api/agent/journal/apply` only after approval.

Guidance:

- Base the review on actual task-item status and recorded journal content.
- Avoid inferring completion where the journal state does not support it.
- Prefer additive edits to destructive rewrites unless the user asks for replacement.
