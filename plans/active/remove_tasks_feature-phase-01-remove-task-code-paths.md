# Phase 01: Remove Task UI, Data, Runtime, and AI Support

**Status:** Complete
**Output:** `/src/lib/components/`, `/src/lib/stores/`, `/src/lib/server/agentRuntime.ts`, `/src/lib/services/aiSupport.ts`, `/src/lib/types/`, `/templates/tags/dt/`

## Objective

Remove all task-specific code paths in a single pass: UI, client state, server runtime, and AI commands. Leave general-purpose systems (tags, journal entries, notes) untouched.

## Approach

Single-user app, so historical task data is not migrated:

- old `taskItems` entries in existing YAML should load without error, but they are dropped the next time that day is saved
- old `.editor-config.json` files with `dailyTasks` should load without error, but those definitions are dropped on the next config save
- old `#dt/<id>` tags render through the existing general tag system as ordinary tags
- no migration, no archive, no feature flag

## Tasks

### UI

- [x] Remove task tabs from the journal pane.
- [x] Remove task item creation and editing UI.
- [x] Remove the daily tasks configuration modal and its entry points.
- [x] Remove task progress indicators and task-specific empty states.
- [x] Delete task-only components once the journal pane no longer depends on them.

### Client state and types

- [x] Remove `dailyTasks` from `.editor-config.json` handling.
- [x] Remove `taskItems` from journal types and stores.
- [x] Remove task-only type and helper modules (including `dailyTasks` types/utilities) once no callers remain.
- [x] Remove task-specific tag helpers (anything that special-cases `#dt/`).
- [x] Leave general tag system (`TagInput`, `TagSearch`, tag vocabulary) alone.

### Runtime and AI

- [x] Remove `dailyTasks` and `taskItems` handling from the agent context route.
- [x] Remove task-aware planning/apply logic from the journal runtime.
- [x] Remove task-specific AI commands (e.g. `schedule-daily-tasks` and any others that only make sense with in-app tasks).

### Templates

- [x] Delete `templates/tags/dt/` entirely.

## Dependencies

- None. Scope and approach are locked in the overview plan.

## Acceptance Criteria

- [x] The journal pane is notes-only.
- [x] No active client-side or server-side task model remains.
- [x] Old YAML files with `taskItems` still load without error, but rewritten days no longer preserve `taskItems`.
- [x] Legacy `.editor-config.json` files with `dailyTasks` still load without error, but rewritten config no longer preserves `dailyTasks`.
- [x] Old `#dt/<id>` tags render as plain tags.
- [x] General tag system behavior is unchanged.
