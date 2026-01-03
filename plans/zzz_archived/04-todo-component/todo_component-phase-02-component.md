# Phase 02: TodoList Component

**Status:** Completed
**Output:** `src/lib/components/TodoList.svelte`

## Objective

Create the TodoList UI component with inline editing and status management.

## Tasks

- [x] Create `src/lib/components/TodoList.svelte`
- [x] Implement add todo input with Enter key support
- [x] Implement status select dropdown for each todo
- [x] Implement inline text editing (double-click to edit)
- [x] Implement delete button (visible on hover)
- [x] Add "Show completed" toggle (with localStorage persistence)
- [x] Style for fixed 150px height with scrollable todo list

## Content Outline

**Component structure:**
```
.todo-list (150px fixed height)
├── .todo-header (title + show completed toggle)
├── .todo-input-row (text input + add button)
└── .todo-items (scrollable)
    └── .todo-item (repeated)
        ├── .todo-text (or edit input)
        ├── status select
        └── delete button
```

**Features:**
- New todo defaults to "new" status
- Double-click text to edit inline
- Escape cancels edit, Enter saves
- Status dropdown shows all 6 options with labels
- Delete button appears on row hover
- Completed todos have strikethrough styling

## Dependencies

- Phase 01 complete (types and store)

## Acceptance Criteria

- [x] Can add new todos with text input
- [x] Can change todo status via dropdown
- [x] Can edit todo text via double-click
- [x] Can delete todos (with confirmation prompt)
- [x] Completed todos hidden by default, toggle to show
- [x] Component is exactly 150px height
- [x] Todo list scrolls when items exceed available space
- [x] Shows "No todos yet" when empty
