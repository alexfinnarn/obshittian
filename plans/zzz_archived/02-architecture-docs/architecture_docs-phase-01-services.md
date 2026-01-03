# Phase 01: Services Documentation

**Status:** Completed
**Output:** `/docs/architecture/services.md`

## Objective

Document the service layer pattern, existing services, and guidelines for when to create new services.

## Tasks

- [x] Create `/docs/architecture/` directory
- [x] Document service layer purpose and responsibilities
- [x] Document `fileOpen.ts` service (functions, dependencies, usage)
- [x] Document `fileSave.ts` service (functions, dependencies, usage)
- [x] Define "service vs utility" decision criteria
- [x] Document service patterns (async operations, error handling, event emission)
- [x] List potential future services with rationale

## Content Outline

### 1. What is a Service?

Services orchestrate complex operations that:
- Coordinate multiple stores or utilities
- Have side effects (file I/O, events, persistence)
- Require error handling and user feedback
- Would otherwise duplicate logic across components

### 2. Existing Services

#### fileOpen.ts
- `loadFile(relativePath)` - Load file content and handles
- `openFileInTabs(path, openInNewTab)` - Open in left pane tabs
- `openFileInSinglePane(path, pane)` - Open in specified pane
- `openDailyNote(date)` - Create/open daily note in right pane

#### fileSave.ts
- `saveFile(pane)` - Main save dispatcher
- Internal: `saveLeftPane()`, `saveRightPane()`
- Internal: `maybeUpgradeDailyNoteSync()`, `processSyncAfterSave()`

### 3. Service vs Utility Decision Tree

```
Is it a pure function with no side effects?
  → YES: Put in utils/
  → NO: Continue...

Does it coordinate multiple stores or emit events?
  → YES: Put in services/
  → NO: Continue...

Is it used by multiple components with identical logic?
  → YES: Put in services/
  → NO: Keep in component or utils/
```

### 4. Service Patterns

- Async/await with try/catch
- Event emission after successful operations
- Store updates for state changes
- Console logging for debugging (errors only)

### 5. Future Service Candidates

| Service | Source | Rationale |
|---------|--------|-----------|
| fileOperationsService | FileTree.svelte | Create/rename/delete with events |
| keyboardService | App.svelte | Shortcut dispatch logic |
| errorService | Scattered | Centralized error handling |

## Dependencies

- Read existing service files
- Understand store interactions
- Review component usage patterns

## Acceptance Criteria

- [x] Documentation explains service purpose clearly
- [x] Existing services fully documented
- [x] Decision criteria helps developers choose layer
- [x] Examples show correct patterns
