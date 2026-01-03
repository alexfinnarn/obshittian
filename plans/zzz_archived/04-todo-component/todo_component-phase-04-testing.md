# Phase 04: Testing

**Status:** Completed
**Output:** `src/lib/stores/todos.svelte.test.ts`, `tests/e2e/todos.spec.ts`

## Objective

Add unit tests for the todos store and E2E tests for the TodoList component.

## Tasks

- [x] Create `src/lib/stores/todos.svelte.test.ts`
- [x] Test addTodo, removeTodo, updateTodoText, updateTodoStatus
- [x] Test resetTodos
- [x] Test getter functions (getTodos, getTodosByStatus, etc.)
- [x] Test showCompleted localStorage persistence
- [x] Test rollback on save failure for all CRUD operations
- [x] Verify `src/lib/utils/dailyNotes.test.ts` already updated
- [x] Verify `src/lib/utils/sync.test.ts` already updated
- [x] Create `tests/e2e/todos.spec.ts` for E2E tests (20 tests)
- [x] Run full test suite to verify no regressions

## Dependencies

- Phase 01-03 complete

## Acceptance Criteria

- [x] All new store tests pass (42 tests)
- [x] Existing daily note tests pass (14 tests)
- [x] Existing sync tests pass (26 tests)
- [x] E2E tests pass (20 tests)
- [x] `npm run test:run` passes (500 tests)
- [x] `npm run check` passes
