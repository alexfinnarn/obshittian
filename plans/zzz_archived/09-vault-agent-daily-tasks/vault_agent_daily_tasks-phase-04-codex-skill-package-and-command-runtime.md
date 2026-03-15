# Phase 04: Codex Skill Package and Command Runtime

**Status:** Complete  
**Output:** agent runtime API routes, bundled command-package docs, diff-first journal proposal/apply flow, runtime tests

## Objective

Provide an app-owned runtime contract for Codex daily-task commands and ship the bundled command-package guidance for `schedule-daily-tasks`, `morning-standup`, and `evening-review`.

## Tasks

- [x] Add a stable `POST /api/agent/context` endpoint for date-specific command context
- [x] Add a diff-first `POST /api/agent/journal/plan` endpoint for journal proposals
- [x] Add a confirmed-write `POST /api/agent/journal/apply` endpoint
- [x] Keep IDs, timestamps, ordering, and YAML serialization app-owned
- [x] Support command override lookup from `.editor-agent/commands/`
- [x] Ship bundled command-package docs for the three supported commands
- [x] Cover the runtime with focused API tests
- [ ] Broaden command-package validation and end-to-end coverage in phase 05

## Runtime Contract

### Context

- `POST /api/agent/context` accepts a date plus optional `commandId` and `dailyNotesFolder`
- the response includes recurring task definitions, current journal state, journal path, optional override content, and AI-support install metadata

### Journal Planning

- `POST /api/agent/journal/plan` accepts journal-entry upserts/deletes and task-item upserts/deletes
- planning is in-memory only and returns:
  - current journal data
  - proposed journal data
  - summary counts
  - text diff

### Journal Apply

- `POST /api/agent/journal/apply` uses the same proposal shape but requires `confirm: true`
- writes are only performed after explicit confirmation
- empty proposed journal state deletes the YAML file for that date

## Proposal Shape

- entry upserts may create or update journal entries
- task-item upserts may create or update task items
- delete arrays remove existing records by ID
- unknown existing IDs are rejected as bad requests to avoid stale-state writes

## Command Package

Bundled docs live under:

```text
docs/skills/vault-agent-daily-tasks/
```

Files:

- `README.md`
- `schedule-daily-tasks.md`
- `morning-standup.md`
- `evening-review.md`

These docs define the shared Codex workflow:

1. Read fresh command context
2. Build a proposal
3. Preview the diff
4. Ask for confirmation
5. Apply only after approval

## Dependencies

- Phase 04 consumes the `.editor-agent/` contract and override-path reservations from phase 03
- Phase 05 should extend runtime documentation, skill validation, and end-to-end coverage without redefining the proposal contract

## Risks and Edge Cases

- server-side runtime does not automatically know browser-local `dailyNotesFolder` changes, so the API accepts an optional `dailyNotesFolder`
- command overrides remain optional and must not be assumed to exist
- stale command context can produce unknown-ID errors during apply; this should be surfaced as a request error, not hidden

## Acceptance Criteria

- [x] Codex commands can fetch date-specific context from the app without reading vault files directly
- [x] Codex commands can preview journal/task-item changes as a diff before apply
- [x] Journal writes require explicit confirmation through the apply endpoint
- [x] Bundled command-package docs exist for the three supported commands
- [x] Runtime tests cover context, planning, confirmed apply, and stale-ID rejection
