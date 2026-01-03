# Plans

This directory contains in-progress and archived plans for adding features and refactoring this
application.

## File Naming Convention

- **Main plan file**: `ALL_CAPS_WITH_UNDERSCORES.md` (e.g., `ARCHITECTURE_DOCS.md`)
- **Phase files**: `lowercase_main_name-phase-NN-description.md` (e.g., `architecture_docs-phase-01-services.md`)

```
plans/
├── README.md
├── zzz_archived/
│   └── README.md
├── MAIN_PLAN.md              # Main plan overview
├── main_plan-phase-01-start.md
├── main_plan-phase-02-middle.md
└── main_plan-phase-03-end.md
```

## Main Plan File Structure

The main plan file provides an overview and tracks progress across all phases.

```markdown
# Plan Name

Brief description of what this plan accomplishes.

## Goals

1. First goal
2. Second goal

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 01 | First phase description | Pending |
| 02 | Second phase description | Pending |

## Background

Context and rationale for this plan.

## Deliverables

- List of outputs (files, features, etc.)

## Future Work (Out of Scope)

Items explicitly excluded from this plan.
```

## Phase File Structure

Each phase file contains detailed tasks and acceptance criteria.

```markdown
# Phase NN: Phase Title

**Status:** Pending | In Progress | Completed
**Output:** `/path/to/deliverable`

## Objective

One sentence describing what this phase accomplishes.

## Tasks

- [ ] First task
- [ ] Second task
- [ ] Third task

## Content Outline

Detailed outline of what will be created/changed.

## Dependencies

- What needs to exist before this phase can start
- Other phases or external requirements

## Acceptance Criteria

- [ ] First criterion
- [ ] Second criterion
```

## Status Tracking

- Update phase file status: `Pending` → `In Progress` → `Completed`
- Check off tasks as they're completed: `- [ ]` → `- [x]`
- Update main plan phase table when status changes
- Check off acceptance criteria when verified

## Archiving

When all phases are complete:

1. Create a directory in `zzz_archived/` named after the plan (lowercase with hyphens)
2. Move all phase files into that directory
3. Optionally keep or remove the main plan file

See [zzz_archived/README.md](zzz_archived/README.md) for archive structure details.