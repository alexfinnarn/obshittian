# Remove Tasks Feature

Remove the app's in-app recurring task system and re-center the product on local notes and daily journaling.

## Goals

1. Remove all user-facing task management from the app.
2. Remove task-specific storage, runtime, and AI-support paths.
3. Simplify the journal pane into a notes-first experience.
4. Leave the repo smaller, clearer, and easier to maintain.

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 01 | Remove task UI, data models, runtime, and AI support | Complete |
| 02 | Clean up docs, tests, and fixtures | Complete |

## Background

The current in-app tasks feature spans:

- recurring task definitions in `.editor-config.json`
- per-day `taskItems` in journal YAML
- task-specific tags such as `#dt/<task-id>`
- task tabs, progress state, and task item editing UI
- task template loading from `templates/tags/dt/<task-id>/NN.md`
- task-aware agent runtime and AI-support command packaging

The proposed boundary is:

- Google Calendar owns time and recurrence
- Google Tasks owns actionable scheduled work
- this app owns notes, journaling, and local file-based context

## Approach

This is a single-user app, so historical task data does not need to be migrated or preserved. Old `taskItems` entries in existing YAML files should be tolerated on read so legacy files still open without error, but those fields will not be preserved once that day is rewritten by the simplified journal model. Old `dailyTasks` config can likewise disappear on the next `.editor-config.json` save after the task model is removed. Old `#dt/<id>` tags in note bodies will render as ordinary tags via the existing general-purpose tag system: no special handling, no styling, no autocomplete boost.

## Deliverables

- a notes-only journal pane with no task tabs or task-item UI
- removal of `dailyTasks`, `taskItems`, and task-specific runtime/AI logic
- removal of `templates/tags/dt/` task templates
- updated docs and tests that describe the simplified product honestly

## Out of Scope

- migrating existing `taskItems` into a supported format — legacy data may remain until a day is rewritten
- integrating Google Tasks into this app
- syncing Google Tasks into the local vault
- building a replacement in-app scheduling system
- redesigning the journal beyond what is needed to remove task functionality
- changes to the general tag system (`TagInput`, `TagSearch`, tag vocabulary) — tags remain a first-class feature
