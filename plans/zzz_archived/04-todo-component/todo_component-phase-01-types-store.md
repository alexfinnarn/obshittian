# Phase 01: Types and Store

**Status:** Completed
**Output:** `src/lib/types/todos.ts`, `src/lib/stores/todos.svelte.ts`

## Objective

Create type definitions and a Svelte 5 store for managing todos with file persistence.

## Tasks

- [x] Create `src/lib/types/todos.ts` with Todo interface and status types
- [x] Create `src/lib/stores/todos.svelte.ts` following vaultConfig pattern
- [x] Implement CRUD operations: addTodo, removeTodo, updateTodoText, updateTodoStatus
- [x] Implement persistence: loadTodos, saveTodos to `data/todos.json`
- [x] Create `data/` directory if it doesn't exist on first save

## Content Outline

**Types (`src/lib/types/todos.ts`):**
```typescript
export type TodoStatus = 'new' | 'backlog' | 'todo' | 'in-progress' | 'in-review' | 'complete';

export interface Todo {
  id: string;
  text: string;
  status: TodoStatus;
  createdAt: string;
  updatedAt: string;
}

export const TODO_STATUS_LABELS: Record<TodoStatus, string>;
export const TODO_STATUS_ORDER: TodoStatus[];
export function createTodo(text: string, status?: TodoStatus): Todo;
```

**Store (`src/lib/stores/todos.svelte.ts`):**
- `todosStore` - Reactive state with `todos: Todo[]`, `isLoading: boolean`
- `getTodos()`, `getTodosByStatus(status)`, `getActiveTodos()`, `getCompletedTodos()`
- `addTodo(text, status?)`, `removeTodo(id)`, `updateTodoText(id, text)`, `updateTodoStatus(id, status)`
- `loadTodos(rootDirHandle?)`, `saveTodos(rootDirHandle?)`
- `resetTodos()`

## Dependencies

None - this is the foundation phase.

## Acceptance Criteria

- [x] TodoStatus type includes all 6 statuses
- [x] Todo interface has id, text, status, createdAt, updatedAt
- [x] Store operations are reactive via Svelte 5 runes
- [x] File persistence creates `data/` directory if needed
- [x] Graceful handling when file doesn't exist (creates file with empty array)
