# Phase 02: Journal UI and Task-Item Interactions

**Status:** Complete
**Output:** `src/lib/components/JournalPane.svelte`, `src/lib/components/TaskItem.svelte`, focused journal/task interaction tests

## Objective

Move recurring daily tasks from the current tag-filtered journal-entry flow to a task-first journal UI built on `taskItems`, while keeping generic journal entries available in the `All` view.

## Tasks

- [x] Keep the `All` tab as the existing generic journal-entry view with the entry composer and entry list
- [x] Change recurring task tabs so they no longer filter journal entries and instead open a dedicated task-item view for the selected task/date
- [x] Show an explicit empty state for task tabs with no items and only create the first task item when the user or API asks for it
- [x] Support task-item add, edit, status change, and delete interactions within a recurring task tab
- [x] Keep task tab progress and visual state derived only from `taskItems`, not from tagged journal entries
- [x] Preserve template support only for manual task-item creation in recurring task tabs
- [x] Remove the old task-tab behavior that loads templates into the journal-entry composer
- [x] Add focused automated coverage for the new task-first journal behavior

## Content Outline

### Interaction Model

- The `All` tab remains the place for generic journal-entry creation and browsing.
- A recurring task tab becomes a task-item workspace for one task on one date.
- Task tabs do not show tagged journal entries in phase 2.
- Selecting a task tab no longer drives the journal-entry composer.

### Task-Item Behavior

- Task items are shown ordered by `order`, scoped to the selected task/date.
- A task tab with zero items shows an empty state plus an explicit `Add Task Item` action.
- New task items append to the end of the task's list.
- Each task item supports:
  - status changes among `pending`, `in-progress`, and `completed`
  - text editing
  - deletion
- Drag-reorder is out of scope for phase 2.

### Template Behavior

- Manual task-item creation in a recurring task tab may seed the new item's `text` from the next numbered template under `templates/tags/dt/<task-id>/NN.md`.
- If the expected template file does not exist, the app creates the task item with empty text instead of failing.
- AI/API-created task items are not template-dependent and should persist whatever content they provide.
- The old behavior of loading a template into the journal-entry composer when a task tab is selected is removed from the recurring-task flow.

### UI Structure

- `JournalPane` should have two clear modes:
  - `All` mode: journal-entry composer plus entry list
  - task mode: task-item actions plus task-item list
- `DailyTaskTabs` remains the tab and status shell, but it should not carry entry-centric assumptions in task mode.
- Add task-item-focused UI components only where they reduce complexity in `JournalPane`; avoid broad refactors outside the journal/task surface.

### Data and Compatibility

- No storage-schema changes are planned in phase 2.
- `JournalData.version` remains `3`.
- `DailyTaskItem` remains the persisted unit for recurring-task work on a date.
- Tagged journal entries remain valid metadata and search inputs, but they no longer drive task-tab progress or task-tab content.

## Risks and Edge Cases

- Templates may exist for some recurring tasks and not others; missing templates must not block task-item creation.
- Task tabs must handle zero items, mixed statuses, and deletion of the last item without falling back to journal-entry-based behavior.
- The `All` tab must continue to work for generic journal entries without inheriting task-mode UI assumptions.
- Existing tagged journal entries may still exist for recurring tasks, but phase 2 should not render them inside recurring task tabs.

## Acceptance Criteria

- [x] Selecting a recurring task tab shows task items for that task/date rather than tagged journal entries
- [x] The `All` tab still supports generic journal-entry creation and browsing
- [x] A recurring task with no items shows an empty task state and does not auto-create an item on open or date load
- [x] Users can add, edit, update status, and delete task items from a task tab
- [x] Task tab progress and visual state update from task-item status only
- [x] Manual task-item creation uses the next template when present and falls back to empty text when absent
- [x] AI/API-created task items can store provided content without requiring a template
- [x] Automated tests cover task-tab switching, first-item creation, status updates, and `All`-tab compatibility

## Implementation Notes

### Components Created

- **`src/lib/components/TaskItem.svelte`** - New component with:
  - Status indicator (click to cycle: pending → in-progress → completed)
  - Inline text editing mode
  - Delete with confirmation
  - Visual strikethrough for completed items

### Components Modified

- **`src/lib/components/JournalPane.svelte`** - Major refactor:
  - Added dual-mode support: `isTaskMode` derived from `activeTaskId`
  - Task mode: Shows task items for selected task, "Add Task Item" button, explicit empty state
  - All mode: Journal entry composer + entry list (unchanged behavior)
  - Template loading integrated into task-item creation flow
  - Removed: filtered entries by task tag, template-loaded entry composer

### Test Coverage Added

- **`src/lib/components/JournalPane.test.ts`**
  - Covers task-tab switching between `All` and task mode
  - Covers explicit empty state and first task-item creation on demand
  - Covers template numbering based on append order rather than current item count
- **`src/lib/components/TaskItem.test.ts`**
  - Covers task-item status updates
  - Covers failed-save behavior without dropping the user back out of edit mode

### Behavior Changes

1. Task tabs no longer filter journal entries by tag
2. Task items display in task tab (sorted by order)
3. "Add Task Item" button creates item with template content (or empty if no template)
4. Progress computed from task-item status (already implemented in DailyTaskTabs from Phase 1)

## Assumptions

- Phase 1 is the stable persistence contract for recurring-task data.
- Generic journal entries continue to live in the `All` tab.
- Recurring task tabs are task-item-first and do not embed tagged journal entries.
- Reordering task items is deferred until a later phase if it is still needed.
