# Phase 05: Testing, Migration Coverage, and Documentation

**Status:** Complete  
**Output:** broader runtime/install verification, end-to-end install coverage, skill-package validation, runtime docs

## Objective

Strengthen confidence in the Phase 03 and Phase 04 contracts by expanding verification, documenting the runtime, and preserving the migration/runtime decisions that are easy to lose between conversations.

## Tasks

- [x] Add focused route tests for the agent runtime context/plan/apply flow
- [x] Add stale-ID rejection coverage for diff/apply requests
- [x] Add end-to-end UI coverage for the App Settings AI-support install flow
- [x] Add validation coverage for the bundled skill package docs
- [x] Document the AI command runtime and recommended command flow
- [x] Update developer-facing docs with the AI support/runtime architecture
- [x] Record the missing Phase 04 and Phase 05 plan docs so the active plan set stays complete

## Coverage Added

### Runtime tests

- `src/routes/api/agent/context/context.test.ts`
- `src/routes/api/agent/journal/runtime.test.ts`

These cover:

- fresh context lookup
- diff-first planning
- confirmed apply
- rejection of stale or invalid IDs

### Install-flow tests

- `tests/e2e/app-settings.spec.ts`

This covers:

- opening App Settings
- installing AI support into a real temporary vault
- verifying `.editor-agent/` files on disk after install

### Skill-package validation

- `tests/skills/vault-agent-daily-tasks.test.ts`

This keeps the bundled command docs aligned with the agent runtime endpoints.

## Documentation Added

- `docs/reference/ai-command-runtime.md`
- updates to `docs/reference/storage-contracts.md`
- updates to `docs/developer-guide.md`
- updates to `README.md`

## Remaining Risks

- the server runtime cannot infer browser-local `dailyNotesFolder` changes on its own, so callers still need to pass `dailyNotesFolder` when the vault uses a non-default journal directory
- command overrides are documented and discoverable, but there is still no in-app override editor or command execution UI

## Acceptance Criteria

- [x] Runtime routes are covered by targeted API tests
- [x] App Settings install flow is covered by end-to-end testing against a writable temporary vault
- [x] Runtime and skill-package docs describe the diff-first proposal/apply workflow
- [x] The active plan set includes explicit Phase 04 and Phase 05 docs
