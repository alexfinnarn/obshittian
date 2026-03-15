# Vault Agent and Daily Tasks

Add vault-installed AI support and upgrade daily tasks from template-driven journal tagging to recurring task definitions plus first-class per-day task items with status-aware journaling.

## Goals

1. Add vault-installed AI support under `.editor-agent/` with an app-managed install and upgrade flow.
2. Ship a Codex skill for `schedule-daily-tasks`, `morning-standup`, and `evening-review`.
3. Show recurring daily tasks on a date without requiring the user to click `Add Entry`.
4. Add explicit status to scheduled daily task items and leave room to extend that model to journal entries later.
5. Migrate existing vault data into the simplified model without preserving obsolete task-template fields.

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 01 | Journal and daily-task data model upgrade | Complete |
| 02 | Journal UI and task-slot interactions | Complete |
| 03 | AI Support configuration and vault template install | Pending |
| 04 | Codex skill package and command runtime | Pending |
| 05 | Testing, migration coverage, and documentation | Pending |

## Background

Current daily tasks are defined in `.editor-config.json` and treated as progress counters derived from tagged journal entries. That works for static templates, but it does not let recurring tasks appear on a date without a matching entry, and it gives the AI no stable vault-owned contract for scheduling day-specific work.

This plan keeps recurring daily task definitions in `.editor-config.json`, moves day-specific scheduled work into journal YAML task items, and treats tags as search and association metadata rather than progress input. The plan also adds a hidden `.editor-agent/` directory installed into the vault. The Codex skill will use an export snapshot for bulk context when available, then use the app API for freshness checks and writes. All command writes will be diff-first and require confirmation before apply.

## Deliverables

- Simplified daily task definition schema plus a versioned journal schema for per-day task items, with explicit migration rules for existing vault data
- Automatic recurring task visibility plus persistence for per-day task items in the journal UI
- New `AI Support` configuration surface in the app for installing and managing `.editor-agent/`
- Hidden vault template containing `contract.md`, `config.json`, and command override locations
- New Codex skill for scheduling daily tasks, morning standup, and evening review
- Tests covering migration, UI behavior, install flow, export compatibility, and skill validation

## Future Work (Out of Scope)

- In-app command palette or direct command execution UI
- Silent AI template installation on vault open
- Automatic write-through without showing a diff first
- Non-Codex agent integrations
