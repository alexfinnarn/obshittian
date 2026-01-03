# Phase 01: Types and Configuration

**Status:** Pending
**Output:** `src/lib/types/journal.ts`, updated `config.ts` and `settings.svelte.ts`

## Objective

Define the JournalEntry data model and add configurable entry types to the application configuration.

## Tasks

- [ ] Create `src/lib/types/journal.ts` with JournalEntry interface
- [ ] Add `createJournalEntry()` helper function
- [ ] Add `JournalData` interface for YAML file storage format
- [ ] Add `journalEntryTypes` to `EditorConfig` interface in `config.ts`
- [ ] Set default entry types to `['one', 'two', 'three']`
- [ ] Add `journalEntryTypes` to Settings interface in `settings.svelte.ts`

## Content Outline

### src/lib/types/journal.ts

```typescript
export interface JournalEntry {
  id: string;
  text: string;
  type: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface JournalData {
  entries: JournalEntry[];
  version: number;
}

export function createJournalEntry(
  text: string,
  type: string,
  order: number
): JournalEntry;
```

### config.ts additions

```typescript
// In EditorConfig interface:
journalEntryTypes: string[];

// In defaultConfig:
journalEntryTypes: ['one', 'two', 'three'],
```

### settings.svelte.ts additions

```typescript
// In Settings interface:
journalEntryTypes: string[];
```

## Dependencies

- None (this is the foundation phase)

## Acceptance Criteria

- [ ] `JournalEntry` interface includes all required fields (id, text, type, order, createdAt, updatedAt)
- [ ] `createJournalEntry()` generates UUID and ISO timestamps
- [ ] Default entry types are `['one', 'two', 'three']`
- [ ] TypeScript compiles without errors
- [ ] Entry types accessible from settings store
