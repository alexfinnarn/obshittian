# TODO_COMPONENT

Add a global Todo component to the right editor pane with Kanban-like status management. Todos are stored as vault content in `data/todos.json`.

## Goals

1. Create a TodoList component with add/edit/delete functionality
2. Implement Kanban-like status workflow (New → Backlog → Todo → In Progress → In Review → Complete)
3. Store todos as vault content at `data/todos.json`
4. Simplify daily note template (remove `- [ ]` placeholder)

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 01 | Types and Store | Completed |
| 02 | TodoList Component | Completed |
| 03 | App Integration | Completed |
| 04 | Testing | Completed |

## Background

The right pane currently shows daily notes. Adding a Todo component introduces the concept of panes being composed of multiple sections. The Todo component sits at fixed 150px height above the editor, providing a persistent global task list.

Todos are stored in `data/todos.json` within the vault (not at root) because they are user content, not application configuration. This keeps content separate from config files like `.editor-config.json`.

## Deliverables

- `src/lib/types/todos.ts` - Type definitions
- `src/lib/stores/todos.svelte.ts` - Todo store with file persistence
- `src/lib/components/TodoList.svelte` - UI component
- `src/lib/stores/todos.svelte.test.ts` - Unit tests (42 tests)
- `tests/e2e/todos.spec.ts` - E2E tests (20 tests)
- Modified `src/App.svelte` - Integration
- Modified `src/lib/utils/dailyNotes.ts` - Simplified template

## Data Format

**Location:** `{vault}/data/todos.json`

```json
{
  "todos": [
    {
      "id": "1703847600000abc123",
      "text": "Example task",
      "status": "todo",
      "createdAt": "2024-12-29T12:00:00.000Z",
      "updatedAt": "2024-12-29T12:00:00.000Z"
    }
  ],
  "version": 1
}
```

## Future Work (Out of Scope)

- Drag-and-drop reordering
- Due dates
- Todo filtering/search
- Multiple todo lists
- Integration with daily notes (linking todos to specific days)
