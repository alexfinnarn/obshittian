# Phase 06: Remove Todo Code

**Status:** Pending
**Output:** Deleted files, clean codebase

## Objective

Remove all Todo-related code from the codebase since it's no longer used.

## Tasks

- [ ] Delete `src/lib/components/TodoList.svelte`
- [ ] Delete `src/lib/stores/todos.svelte.ts`
- [ ] Delete `src/lib/stores/todos.svelte.test.ts`
- [ ] Delete `src/lib/types/todos.ts`
- [ ] Delete `tests/e2e/todos.spec.ts`
- [ ] Search for any remaining todo references
- [ ] Remove any dead imports or unused code
- [ ] Verify build succeeds

## Files to Delete

| File | Reason |
|------|--------|
| `src/lib/components/TodoList.svelte` | UI component no longer needed |
| `src/lib/stores/todos.svelte.ts` | Store replaced by journal.svelte.ts |
| `src/lib/stores/todos.svelte.test.ts` | Tests for deleted store |
| `src/lib/types/todos.ts` | Types replaced by journal.ts |
| `tests/e2e/todos.spec.ts` | E2E tests for deleted component |

## Verification Steps

### 1. Search for Remaining References

```bash
# Search for "todo" in source files (case-insensitive)
grep -ri "todo" src/ --include="*.ts" --include="*.svelte"

# Check for imports
grep -r "from.*todos" src/
grep -r "TodoList" src/
```

### 2. Build Verification

```bash
npm run build
npm run check
```

### 3. Test Verification

```bash
npm run test:run
```

## Potential Remaining References

After deletion, search for and remove/update:

1. **Event Bus** - Check if any todo-related events exist in `eventBus.ts`
2. **Test Setup** - Check `test-setup.ts` for any todo-related mocks
3. **TypeScript Declarations** - Check `global.d.ts` for todo types
4. **Config** - Ensure no todo-related config in `config.ts`

## Data Cleanup Note

The `data/todos.json` file in user vaults will be orphaned. This is acceptable as:
- User has moved to external todo app
- File can be manually deleted by user if desired
- No migration needed per user request

## Dependencies

- Phase 05: App Integration (must be complete so app doesn't reference deleted files)

## Acceptance Criteria

- [ ] All 5 todo files deleted
- [ ] No TypeScript errors
- [ ] No import errors
- [ ] `npm run build` succeeds
- [ ] `npm run check` succeeds
- [ ] `npm run test:run` passes (remaining tests)
- [ ] No "todo" references in source code (except comments/docs if any)
