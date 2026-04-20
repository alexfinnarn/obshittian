# Phase 02: Clean Up Docs, Tests, and Fixtures

**Status:** Complete
**Output:** `/README.md`, `/docs/`, `/tests/`, `/tests/data/testing-files/`

## Objective

Align documentation, tests, and fixtures with the simplified notes-and-journal product.

## Tasks

- [x] Remove task-specific docs and planning artifacts that are no longer relevant.
- [x] Rewrite storage/runtime docs to exclude task structures.
- [x] Remove task-specific unit and E2E tests.
- [x] Update README and architecture docs to describe a notes-and-journal app only.
- [x] Remove or update fixtures that only exist to exercise task behavior (e.g. `tests/data/testing-files/zzz_Daily Notes/2024/12/2024-12-25.yaml`).
- [x] Run final verification: typecheck, focused tests, and a repo grep for task-only references outside archived plans.

## Dependencies

- Phase 01 complete.

## Acceptance Criteria

- [x] Docs match shipped behavior.
- [x] No obsolete task-only tests remain.
- [x] No orphaned task fixtures or templates remain.
- [x] The repository describes a notes-and-journal product consistently.
- [x] Verification confirms task-only runtime/docs references are gone outside intentional historical records.
