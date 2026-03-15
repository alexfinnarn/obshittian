# Phase 03: AI Support Configuration and Vault Template Install

**Status:** Complete
**Output:** `App Settings` sidebar entry, `AI Support` modal section, `.editor-agent/` install service, install/status tests, storage docs

## Objective

Add a vault-local `.editor-agent/` contract with an explicit install/upgrade flow, surfaced through a new bottom-of-sidebar `App Settings` entry, without yet adding command editing or command execution.

## Tasks

- [ ] Add a new `App Settings` entry at the bottom of the sidebar with a gear icon
- [ ] Implement a modal-based `App Settings` surface using existing modal patterns
- [ ] Add an `AI Support` section that shows install status, template version, and override-path status
- [ ] Install `.editor-agent/` into the vault only through explicit user actions
- [ ] Support manual `Install`, `Upgrade`, and `Reinstall` actions for managed AI-support files
- [ ] Keep command override files optional and out of scope for editing in phase 03
- [ ] Document the `.editor-agent/` storage contract and managed-vs-user-owned files
- [ ] Add unit/component coverage for install-state detection and manual install flows

## Content Outline

### UI Structure

- Add a new bottom-of-sidebar affordance for `App Settings`, separate from Quick Links and Quick Files.
- Opening `App Settings` should show a modal using the existing `Modal` component pattern.
- Phase 03 only needs one settings section inside that modal: `AI Support`.
- `AI Support` should present:
  - current state: `not installed`, `installed`, `outdated`, or `invalid`
  - installed template version when available
  - the presence of managed files
  - the reserved override locations for supported commands
  - explicit action buttons only: `Install`, `Upgrade`, `Reinstall`

### Install Model

- Installation is manual-action only in phase 03.
- The app must never auto-install or auto-upgrade on vault open.
- The app may inspect vault state on demand to compute status, but it should not write until the user clicks an action.
- `Upgrade` is available only when an installed template is older than the bundled template version.
- `Reinstall` is available when the install is invalid or partially missing.

### Managed Vault Contract

Phase 03 installs this hidden vault structure:

```text
.editor-agent/
  contract.md
  config.json
  commands/
    README.md
```

- `contract.md` is app-managed documentation for the vault-owned AI support contract.
- `config.json` is app-managed metadata used for status detection and future runtime integration.
- `commands/README.md` is app-managed documentation for supported override files.
- These override paths are reserved and shown in status, but not created by default:
  - `.editor-agent/commands/schedule-daily-tasks.md`
  - `.editor-agent/commands/morning-standup.md`
  - `.editor-agent/commands/evening-review.md`

### Managed File Semantics

- Managed files in phase 03 are only:
  - `.editor-agent/contract.md`
  - `.editor-agent/config.json`
  - `.editor-agent/commands/README.md`
- Override files are user-owned optional files and must not be overwritten by upgrade or reinstall.
- All template content should be bundled in source so install is deterministic and offline.
- Use a single app-owned template version constant for upgrade detection.

### Config Shape

`config.json` should persist this shape:

```json
{
  "version": 1,
  "templateVersion": 1,
  "installedAt": "ISO timestamp",
  "updatedAt": "ISO timestamp",
  "commands": {
    "schedule-daily-tasks": {
      "overridePath": ".editor-agent/commands/schedule-daily-tasks.md"
    },
    "morning-standup": {
      "overridePath": ".editor-agent/commands/morning-standup.md"
    },
    "evening-review": {
      "overridePath": ".editor-agent/commands/evening-review.md"
    }
  }
}
```

- `version` is the config schema version for `.editor-agent/config.json`.
- `templateVersion` is the bundled managed-template version.
- `installedAt` is written on first install and preserved by upgrade.
- `updatedAt` is rewritten whenever managed files are installed or upgraded.

### Status Detection Rules

- `not installed`: `.editor-agent/` or `config.json` is absent and no valid managed install is present.
- `installed`: all managed files exist and `config.json` is readable with the current template version.
- `outdated`: all managed files exist and `config.json.templateVersion` is lower than the bundled template version.
- `invalid`: managed files are partially missing, `config.json` is unreadable, or required keys are missing.
- Override-file presence should be reported independently and should not affect the install state.

### Application Structure

- Implement AI-support state and file-management logic in a dedicated service/store layer rather than extending `vaultConfig`.
- Reuse existing `fileService` operations; phase 03 should not require new server endpoints.
- Keep `.editor-config.json` unchanged.
- Keep the existing recurring-task template system unchanged. Phase 03 does not move or redefine task templates under `templates/tags/dt/<task-id>/NN.md`.
- No file-tree visibility changes are needed because hidden files are already suppressed from the UI.

## Dependencies

- Phase 03 depends on phase 01 and phase 02 only for the surrounding daily-task feature set and vault-config patterns.
- Phase 04 should consume the `.editor-agent/` contract, version metadata, and reserved override paths defined here.
- Phase 05 can broaden install-flow docs and end-to-end coverage but should not redefine the managed contract from phase 03.

## Risks and Edge Cases

- A vault may contain a partially created `.editor-agent/` directory from manual experimentation; phase 03 must report that as `invalid`, not silently trust it.
- Install and upgrade must preserve any optional command override files if they already exist.
- An unreadable or malformed `config.json` must not crash the settings modal.
- Recurring-task templates and AI command overrides are separate systems; phase 03 docs and UI copy should not imply that `.editor-agent/commands/` replaces `templates/tags/dt/<task-id>/NN.md`.
- `App Settings` should still open even when no AI support is installed, and the empty state should make the next action obvious.

## Acceptance Criteria

- [ ] Users can open `App Settings` from a bottom-of-sidebar gear entry
- [ ] `AI Support` reports `not installed`, `installed`, `outdated`, and `invalid` states correctly
- [ ] Clicking `Install` creates the managed `.editor-agent/` structure without creating override files
- [ ] Clicking `Upgrade` rewrites managed files to the latest bundled version while preserving user-owned override files
- [ ] Clicking `Reinstall` repairs invalid managed installs without overwriting optional override files
- [ ] `.editor-agent/config.json` stores version metadata and reserved override locations for the three supported commands
- [ ] Storage docs describe `.editor-agent/` and distinguish managed files from user-owned override paths
- [ ] Automated tests cover status detection and manual install/upgrade behavior

## Assumptions

- `App Settings` is introduced in phase 03, but only `AI Support` is in scope for its initial contents.
- Command override editing remains out of scope until phase 04 or later.
- Install and upgrade flows are explicit user actions only.
- Bundled template versioning is numeric and app-owned.
- AI/API-created task items remain allowed to persist provided content directly without depending on recurring-task templates.
