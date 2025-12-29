# Phase 03: Events Documentation

**Status:** Completed
**Output:** `/docs/architecture/events.md`

## Objective

Document the event bus system, all event types, typical flows, and guidelines for when to use events vs direct function calls.

## Tasks

- [x] Document eventBus.ts API and usage
- [x] Catalog all event types with payloads
- [x] Diagram typical event flows (file open, save, delete)
- [x] Define when to use events vs direct calls
- [x] Document event subscription patterns and cleanup

## Content Outline

### 1. Event Bus Overview

The event bus provides decoupled communication between components using a typed publish/subscribe pattern.

```typescript
import { on, emit } from '$lib/utils/eventBus';

// Subscribe (returns unsubscribe function)
const unsubscribe = on('file:open', (data) => {
  console.log('Opening:', data.relativePath);
});

// Emit
emit('file:open', { relativePath: 'notes/todo.md' });

// Cleanup
unsubscribe();
```

### 2. Event Catalog

| Event | Payload | Emitted By | Handled By |
|-------|---------|------------|------------|
| `file:open` | `{ relativePath, openInNewTab? }` | FileTree, QuickFiles | App.svelte |
| `file:save` | `{ pane }` | Keyboard handler | App.svelte |
| `file:created` | `{ relativePath }` | fileOpen service | App.svelte (tag index) |
| `file:renamed` | `{ oldPath, newPath }` | FileTree | App.svelte (tag index) |
| `file:deleted` | `{ relativePath }` | FileTree | App.svelte (tag index) |
| `dailynote:open` | `{ date }` | Calendar | App.svelte |
| `tree:refresh` | `void` | After file ops | FileTree |
| `modal:open` | `{ type, data? }` | Components | App.svelte |
| `modal:close` | `void` | Modal | App.svelte |
| `tags:reindex` | `void` | User action | App.svelte |

### 3. Event Flow Diagrams

#### File Open Flow
```
FileTree (click)
    │
    ▼
emit('file:open', { relativePath })
    │
    ▼
App.svelte (on 'file:open')
    │
    ▼
openFileInTabs(path)  [service]
    │
    ├── loadFile(path)  [service]
    │       │
    │       ▼
    │   readFileContent()  [utility]
    │
    ├── addTab()  [store]
    │
    └── emit('file:created') if new
            │
            ▼
        App.svelte (on 'file:created')
            │
            ▼
        updateFileInIndex()  [utility]
```

#### File Save Flow
```
Keyboard (Cmd+S)
    │
    ▼
emit('file:save', { pane })
    │
    ▼
App.svelte (on 'file:save')
    │
    ▼
saveFile(pane)  [service]
    │
    ├── Get content from store (tabs or editor)
    ├── maybeUpgradeDailyNoteSync()
    ├── writeToFile()
    ├── markClean() in store
    ├── updateFileInIndex()
    └── processSyncAfterSave()
```

#### File Delete Flow
```
FileTree (context menu → Delete)
    │
    ▼
confirm() dialog
    │
    ▼
deleteEntry()  [utility]
    │
    ▼
emit('file:deleted', { relativePath })
    │
    ▼
App.svelte (on 'file:deleted')
    │
    ├── removeFileFromIndex()  [utility]
    │
    └── emit('tree:refresh')
            │
            ▼
        FileTree (on 'tree:refresh')
            │
            ▼
        loadEntries()
```

### 4. When to Use Events

**Use events when:**
- Communication crosses component boundaries
- Multiple unrelated components need to react
- The emitter shouldn't know about handlers
- Decoupling improves testability

**Use direct calls when:**
- Parent-child component communication (use props/callbacks)
- Service-to-service coordination
- The caller needs the result immediately
- There's only one handler

### 5. Subscription Patterns

```typescript
// In Svelte component (onMount + cleanup)
import { onMount } from 'svelte';

onMount(() => {
  const unsubscribe = on('file:open', handleFileOpen);
  return unsubscribe; // Cleanup on unmount
});

// Multiple subscriptions
onMount(() => {
  const unsub1 = on('file:open', handler1);
  const unsub2 = on('file:save', handler2);
  return () => {
    unsub1();
    unsub2();
  };
});
```

### 6. Type Safety

Events are typed via the `AppEvents` interface in eventBus.ts:

```typescript
interface AppEvents {
  'file:open': { relativePath: string; openInNewTab?: boolean };
  'file:save': { pane: 'left' | 'right' };
  // ... etc
}
```

Adding a new event requires updating this interface.

## Dependencies

- Read eventBus.ts implementation
- Trace event usage in components and services
- Review App.svelte event subscriptions

## Acceptance Criteria

- [x] All events cataloged with types
- [x] Flow diagrams show typical operations
- [x] Clear guidance on events vs direct calls
- [x] Subscription/cleanup patterns documented
