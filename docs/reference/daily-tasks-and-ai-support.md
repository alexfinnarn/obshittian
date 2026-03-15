# Daily Tasks And AI Support

This page summarizes the completed daily-tasks upgrade and the vault-local AI support/runtime that now sits on top of it.

## What Changed

The old model treated daily tasks as progress counters inferred from tagged journal entries.

The current model is:

- recurring task definitions live in `.editor-config.json`
- per-day work lives in journal YAML `taskItems`
- task completion is derived from task-item status, not tag counts
- AI support is installed explicitly into `.editor-agent/`
- Codex commands use an app-owned runtime for context, diff planning, and confirmed apply

## Current User-Facing Features

### Recurring daily tasks

- recurring tasks are configured in `.editor-config.json`
- recurring task tabs show date-specific task items
- manual task-item creation may seed text from `templates/tags/dt/<task-id>/NN.md`
- AI-created task items do not depend on those templates

### AI Support

- the sidebar has an `App Settings` entry
- `App Settings` contains an `AI Support` section
- users can explicitly `Install`, `Upgrade`, or `Reinstall` the vault-local AI support package
- install status reports `not installed`, `installed`, `outdated`, or `invalid`

### Codex command runtime

The app now exposes a stable runtime for:

- `schedule-daily-tasks`
- `morning-standup`
- `evening-review`

The runtime flow is:

1. fetch fresh date-specific context
2. build a proposal
3. preview a diff
4. apply only after explicit confirmation

## Important Boundaries

- recurring-task templates are separate from `.editor-agent/`
- command override files are optional, user-owned, and live under `.editor-agent/commands/`
- `.editor-agent/config.json` keeps both schema `version` and managed `templateVersion`
- the app owns YAML serialization, IDs, timestamps, and write/delete behavior for journal files

## Main Files

UI and install flow:

- `src/lib/components/Sidebar.svelte`
- `src/lib/components/AppSettingsModal.svelte`
- `src/lib/services/aiSupport.ts`
- `src/lib/stores/aiSupport.svelte.ts`

Runtime:

- `src/lib/server/agentRuntime.ts`
- `src/routes/api/agent/context/+server.ts`
- `src/routes/api/agent/journal/plan/+server.ts`
- `src/routes/api/agent/journal/apply/+server.ts`

Reference docs:

- `docs/reference/storage-contracts.md`
- `docs/reference/ai-command-runtime.md`
- `docs/skills/vault-agent-daily-tasks/`

## Verification Added

Targeted verification now covers:

- AI support status detection and install/upgrade/reinstall behavior
- agent runtime context, planning, confirmed apply, and stale-ID rejection
- bundled skill-package presence
- browser-backed App Settings install flow against a writable temporary vault

## Remaining Constraint

The server runtime cannot infer browser-local `dailyNotesFolder` changes by itself, so Codex callers should pass `dailyNotesFolder` when the vault uses a non-default journal directory.
