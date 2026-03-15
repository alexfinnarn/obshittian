# `schedule-daily-tasks`

Purpose:

- create or update task items for a target date based on the recurring tasks visible on that date

Workflow:

1. Read `POST /api/agent/context` with `commandId: "schedule-daily-tasks"`.
2. Inspect `dailyTasks`, existing `journal.taskItems`, and optional override content.
3. Propose `taskItemUpserts` for new or updated scheduled work.
4. Use `POST /api/agent/journal/plan` to generate the diff.
5. Present the summary and diff to the user.
6. Use `POST /api/agent/journal/apply` only after approval.

Guidance:

- Default new task items to `status: "pending"` unless the override says otherwise.
- Preserve existing task items unless the user clearly wants them replaced or removed.
- Use the task tag `#dt/<task-id>` in new task-item tags unless a stronger convention already exists.
- Do not assume recurring-task templates are required for AI-created task items.
