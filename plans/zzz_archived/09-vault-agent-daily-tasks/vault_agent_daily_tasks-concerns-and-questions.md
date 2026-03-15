# Vault Agent Daily Tasks: Clarifications Before Phase 03

**Created:** 2026-03-15  
**Context:** Follow-up review of Phase 03 (AI Support) after checking the active phase docs, storage contract, and current task-template behavior

---

## What This Review Clarified

The earlier concern review mixed together two different systems:

- recurring-task templates used by manual task-item creation
- AI support files installed under `.editor-agent/`

Those are separate concerns in the current app design and should remain separate in Phase 03.

---

## Confirmed Phase 03 Scope

Phase 03 is still about installing and managing vault-local AI support infrastructure:

- add `App Settings` entry at bottom of sidebar
- create modal-based settings surface
- add `AI Support` section showing install status
- install `.editor-agent/` only through explicit user actions
- support `Install`, `Upgrade`, and `Reinstall`
- create managed files: `contract.md`, `config.json`, `commands/README.md`
- reserve command override paths without creating them by default
- detect `not installed`, `installed`, `outdated`, and `invalid`

Still out of scope:

- command override editing
- command execution UI
- auto-install on vault open
- silent writes without confirmation
- redesigning the recurring-task template system

---

## Template System: Current Reality

Recurring-task templates are not missing from the app. The current contract is file-based:

```text
templates/tags/dt/<task-id>/NN.md
```

This already exists in the storage documentation and in the shipped Phase 02 behavior:

- manual task-item creation may seed `text` from the next numbered template file
- missing templates fall back to empty text
- AI/API-created task items are not template-dependent

That means the app does **not** currently need a new `dailyTasks[].template` field in `.editor-config.json` to continue Phase 03 work.

---

## Decisions

### 1. `.editor-agent/config.json` stays versioned

Keep both:

- `version`
- `templateVersion`

Reason:

- `version` protects the `.editor-agent/config.json` schema itself
- `templateVersion` supports explicit `installed` vs `outdated` detection for bundled AI-support files

Without persisted template version metadata, the planned `Upgrade` flow becomes ambiguous and harder to detect reliably.

### 2. `.editor-agent/config.json` does not own task-template data

Task templates remain outside `.editor-agent/`.

Phase 03 config should track:

- install metadata
- managed file versioning
- reserved command override locations

It should not duplicate or migrate recurring-task template behavior.

### 3. Phase 04 is not blocked by task-template redesign

Phase 04 AI commands may create task items without depending on templates, because Phase 02 already established that AI/API-created task items can persist provided content directly.

If AI commands later choose to read recurring-task templates as optional context, that is an enhancement, not a prerequisite for Phase 03 or a blocker for starting Phase 04.

---

## Clarified Distinctions

### Recurring-task definitions

Stored in `.editor-config.json`.

Purpose:

- define recurring task identity
- define display name
- define day visibility

### Recurring-task templates

Stored as numbered Markdown files under `templates/tags/dt/<task-id>/NN.md`.

Purpose:

- optionally seed manual task-item text in recurring task tabs

### AI support configuration

Stored under `.editor-agent/`.

Purpose:

- install a vault-local AI support contract
- track managed-file install status and version metadata
- reserve user-owned command override locations

### Command overrides

Stored, when created by the user, under `.editor-agent/commands/`.

Purpose:

- customize supported AI command behavior

These are not the same as recurring-task templates and should not be documented as the same system.

---

## What Needed Clarification Before Continuing

Only a small set of points needed to be settled:

1. Phase 03 should remain scoped to `.editor-agent/` install and status management.
2. `templateVersion` should remain in `.editor-agent/config.json` if `Upgrade` and `outdated` remain part of the design.
3. The phase docs should explicitly distinguish recurring-task templates from AI command overrides.
4. Phase 04 should not be described as blocked on a new inline template schema unless the product direction changes.

None of that requires reopening Phase 01 or Phase 02.

---

## Recommended Next Step

Proceed with Phase 03 implementation as planned, with one documentation guardrail:

- keep the `.editor-agent/` contract focused on AI support install/versioning
- keep recurring-task templates on the existing file-based path
- document the distinction clearly in the Phase 03 storage notes and implementation docs

---

## Action Items

- [x] Confirm Phase 03 remains scoped to `.editor-agent/` install/status work
- [x] Confirm `.editor-agent/config.json` keeps `version` and `templateVersion`
- [x] Confirm recurring-task templates stay outside `.editor-agent/`
- [x] Confirm Phase 04 is not blocked by adding `dailyTasks[].template`
- [ ] Reflect this distinction clearly in any future Phase 04 command docs
