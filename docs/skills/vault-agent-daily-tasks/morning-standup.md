# `morning-standup`

Purpose:

- prepare or update a date-specific morning standup entry for the active day

Workflow:

1. Read `POST /api/agent/context` with `commandId: "morning-standup"`.
2. Inspect the current day’s `journal.entries`, `journal.taskItems`, and optional override content.
3. Draft a standup entry as an `entryUpsert`, or update an existing standup entry when the intent is clear.
4. Use `POST /api/agent/journal/plan` to produce the diff.
5. Present the proposed entry and diff to the user.
6. Use `POST /api/agent/journal/apply` only after approval.

Guidance:

- Keep the output date-specific and grounded in the current task-item state.
- Prefer updating a clearly matching existing standup entry over creating duplicates.
- Avoid changing task-item status unless the user explicitly asks for it.
