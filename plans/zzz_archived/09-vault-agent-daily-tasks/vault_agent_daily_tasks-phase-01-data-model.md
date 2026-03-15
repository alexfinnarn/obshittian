# Phase 01: Journal and Daily-Task Data Model Upgrade

**Status:** Complete
**Output:** `src/lib/types/journal.ts`, `src/lib/types/dailyTasks.ts`, `src/lib/stores/journal.svelte.ts`, `src/lib/utils/tags.ts`, `docs/reference/storage-contracts.md`

## Objective

Introduce first-class per-day daily task items with status-based progress while providing a one-time migration path for existing journal files, vault config, exports, and tag search behavior.

## Tasks

- [x] Define the phase-1 status vocabulary as `pending`, `in-progress`, and `completed`
- [x] Add a first-class `DailyTaskItem` type for day-specific scheduled work owned by a recurring daily task definition
- [x] Upgrade journal YAML from `version: 2` to `version: 3` with a new `taskItems` collection
- [x] Keep daily task definitions in `.editor-config.json` as recurring visibility and grouping rules
- [x] Simplify daily task definitions to the minimum required fields and derive task tags from task IDs
- [x] Update journal load/save rules so task items can persist on a day with zero journal entries
- [x] Define task-tab completion and visual state from item statuses rather than tagged-entry counts
- [x] Extend tag indexing to include persisted task item tags without using tags for completion or progress
- [x] Update storage-contract documentation and migration coverage for the new journal format

## Content Outline

### Core Model Decisions

- Recurring daily tasks remain defined in `.editor-config.json`. They control visibility on a date and provide a stable task identity via `id`.
- Day-specific scheduled work is represented by `taskItems` in the journal YAML, not by counting journal entries with `#dt/...` tags.
- Tags remain metadata for search, filtering, and association across files, journal entries, and task items. Tags are not used for progress or completion logic.
- Generic journal entries remain unchanged in phase 1. Status is added only to `DailyTaskItem` in this phase.

### Daily Task Definition Shape

Phase 1 simplifies the vault contract to the fields the new model actually needs:

```json
{
  "dailyTasks": [
    {
      "id": "gym",
      "name": "Gym",
      "days": "daily"
    }
  ]
}
```

- `id`, `name`, and `days` are the stored recurring-task fields in phase 1.
- The associated task tag such as `#dt/gym` is derived from `id` when needed for search or association.
- Old template-era fields such as `targetCount` are dropped from the stored config on migration.

### Journal YAML Version 3

```yaml
version: 3
entries:
  - id: 2d5b7c1b-3f62-4eb5-9f2f-4b6d3d2e4a11
    text: Example note
    tags:
      - project
    order: 1
    createdAt: "2026-03-14T10:00:00.000Z"
    updatedAt: "2026-03-14T10:00:00.000Z"
taskItems:
  - id: a1d6cb0d-55d2-4f8a-a7e4-3f4cdb2d3c1b
    taskId: gym
    text: Warm up for 10 minutes
    status: pending
    tags:
      - "#dt/gym"
      - workout
    order: 1
    createdAt: "2026-03-14T10:05:00.000Z"
    updatedAt: "2026-03-14T10:05:00.000Z"
  - id: c3b2d1b8-e9c2-4a37-b33b-7d7d6929d0af
    taskId: gym
    text: Mobility routine
    status: in-progress
    tags:
      - "#dt/gym"
    order: 2
    createdAt: "2026-03-14T10:06:00.000Z"
    updatedAt: "2026-03-14T10:30:00.000Z"
```

Planned type additions:

```typescript
export type DailyTaskItemStatus = 'pending' | 'in-progress' | 'completed';

export interface DailyTaskItem {
  id: string;
  taskId: string;
  text: string;
  status: DailyTaskItemStatus;
  tags: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface JournalData {
  version: 3;
  entries: JournalEntry[];
  taskItems: DailyTaskItem[];
}
```

- `taskId` points to the recurring task definition in `.editor-config.json`.
- `order` is scoped within a task group for the selected date.
- `tags` on `taskItems` are indexed and searchable, but do not affect progress.
- The associated task tag such as `#dt/gym` is derived from `taskId` and should remain available on task items for search compatibility, either by storage or normalization.

### Persistence Rules

- Recurring tasks are synthesized from config on each date and do not require a YAML file by themselves.
- A journal YAML file is written when that date has at least one journal entry or at least one persisted task item.
- A date with visible recurring tasks but no entries and no task items should still have no YAML file.
- A date with zero journal entries but one or more task items must retain its YAML file.
- File deletion only happens when both `entries` and `taskItems` are empty.

### Migration Rules

- Existing `version: 2` journal files load as `version: 3` in memory with `taskItems: []`.
- Existing entries without `tags` still normalize to `[]`.
- Existing daily task definitions are migrated into the simplified phase-1 shape on load or next save.
- Legacy task-template fields such as `targetCount` are not preserved after migration.

### Derived UI Behavior Required by This Model

- Daily task tabs stop using tagged journal-entry counts for `0/n` progress.
- Tab state is derived from persisted task items for that task and date.
- No task items means a neutral state while the task remains visible from config.
- At least one `in-progress` item means the task is in progress.
- One or more items with all items `completed` means the task is completed.
- Any remaining non-empty item set defaults to pending.
- Associated journal entries may still carry the task tag, but they are not counted toward task completion.

### Tag Indexing Behavior

- Tag scanning continues to index journal entry tags.
- Tag scanning also indexes `taskItems[].tags` using distinct synthetic source keys so task items do not collide with journal entries.
- Searching for a task tag such as `#dt/gym` should continue to surface related journal entries and task items.
- Tag counts remain search metadata only. They do not drive task completion or progress.

## Dependencies

- This phase locks the storage contract needed by phase 2 before UI work starts.
- The existing journal and task UI still assumes tag-count behavior and will be updated in phase 2 to consume `taskItems`.
- Per-task configurable status vocabularies and status on generic journal entries are deferred. Phase 1 uses the fixed starting set `pending`, `in-progress`, and `completed`.

## Risks and Edge Cases

- Opening and saving an older vault will rewrite `.editor-config.json` into the simplified task-definition shape.
- Tag indexing currently assumes journal entries are the only YAML-owned tagged records. Task items need distinct source keys to avoid collisions.
- Save and delete behavior must handle a date with `entries: []` and `taskItems.length > 0`, which is not possible in the current implementation.
- Mixed vaults will exist during rollout: older YAML files, older config files, and dates with only entries, only task items, or both.

## Acceptance Criteria

- [x] `version: 2` journal YAML loads without data loss and normalizes to `taskItems: []`
- [x] `version: 3` journal YAML can persist task items for a date even when `entries` is empty
- [x] Dates with only synthesized recurring tasks and no persisted state still do not create empty YAML files
- [x] Daily task progress and completion logic no longer depends on config counters or counts of `#dt/...` journal entries
- [x] Task item tags are indexed and searchable without affecting task progress
- [x] Existing `.editor-config.json` daily task definitions can be migrated into the simplified phase-1 shape
- [x] Storage contract documentation includes the version-3 journal schema and the new save/delete rules
- [x] Phase 2 can build the new task UI without reopening unresolved schema questions
