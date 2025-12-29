# Architecture Documentation Plan

This plan creates foundational documentation for the editor's architecture, focusing on three key areas: services, state management, and events.

## Goals

1. Document the service layer pattern and existing services
2. Explain state management with Svelte 5 stores
3. Document the event bus system and event flows
4. Identify opportunities for service extraction (future work)

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 01 | Services documentation | Completed |
| 02 | State management documentation | Completed |
| 03 | Events documentation | Completed |

## Background

The codebase recently introduced a `services/` directory with `fileOpen.ts` and `fileSave.ts` to consolidate file operation logic that was previously scattered across components. This pattern worked well and revealed other areas where similar extraction could help.

### Current Architecture Layers

```
┌─────────────────────────────────────────────┐
│  Components (UI + event handlers)           │
├─────────────────────────────────────────────┤
│  Services (orchestration, side effects)     │
├─────────────────────────────────────────────┤
│  Stores (reactive state)                    │
├─────────────────────────────────────────────┤
│  Utilities (pure functions)                 │
└─────────────────────────────────────────────┘
```

### Key Questions to Address

- When should logic be a service vs utility vs component method?
- How do services interact with stores and events?
- What patterns should new services follow?

## Deliverables

- `/docs/architecture/services.md`
- `/docs/architecture/state-management.md`
- `/docs/architecture/events.md`

## Future Work (Out of Scope)

After documentation is complete, these services could be extracted:

1. **fileOperationsService** - Create/rename/delete from FileTree
2. **keyboardService** - Shortcut handling from App.svelte
3. **errorService** - Centralized error handling
4. **tagIndexService** - Wrap tags.ts coordination logic
