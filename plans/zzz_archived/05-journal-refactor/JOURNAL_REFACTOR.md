# Journal Refactor

Replace the Daily Notes markdown editor and Todo component with a new Interstitial Journal system. Journal entries are stored as YAML files per day with metadata (type, order, timestamps). YAML is preferred over JSON for human-readability and natural multiline text support. The right pane becomes a dedicated Journal component, and the calendar shows indicators for days with entries.

## Goals

1. Enable Interstitial Journaling with timestamped entries throughout the day
2. Store entries as structured YAML data (human-readable, multiline-friendly)
3. Support configurable entry types for categorization
4. Show calendar indicators for days with journal entries
5. Remove unused Todo component code

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 01 | Types and Configuration | Pending |
| 02 | Journal Store | Pending |
| 03 | Journal Components | Pending |
| 04 | Calendar Integration | Pending |
| 05 | App Integration | Pending |
| 06 | Remove Todo Code | Pending |
| 07 | Testing | Pending |
| 08 | Documentation | Pending |

## Background

The current Daily Notes system creates markdown files on navigation, resulting in empty files when browsing dates. The user wants to adopt "Interstitial Journaling" where entries are made throughout the day with metadata tracking.

The Todo component is being replaced by an external application, so its code should be removed. However, its patterns (Svelte 5 runes store, file persistence, CRUD with rollback) will be adapted for the new Journal system. YAML is used instead of JSON for better readability of multiline journal text.

## Data Model

```typescript
interface JournalEntry {
  id: string;           // UUID
  text: string;         // Entry content (supports markdown)
  type: string;         // Configurable type (e.g., "one", "two", "three")
  order: number;        // For manual reordering
  createdAt: string;    // ISO timestamp
  updatedAt: string;    // ISO timestamp
}

interface JournalData {
  entries: JournalEntry[];
  version: number;
}
```

**Storage Path:** `{dailyNotesFolder}/YYYY/MM/YYYY-MM-DD.yaml`

**Example File:**
```yaml
version: 1
entries:
  - id: abc123
    text: |
      This is a journal entry.
      It can have multiple lines naturally.
    type: one
    order: 1
    createdAt: 2025-12-29T10:00:00Z
    updatedAt: 2025-12-29T10:00:00Z
```

## Deliverables

- `src/lib/types/journal.ts` - Entry interface and helpers
- `src/lib/stores/journal.svelte.ts` - State management and persistence
- `src/lib/components/JournalPane.svelte` - Main journal UI
- `src/lib/components/JournalEntry.svelte` - Individual entry component
- Updated `Calendar.svelte` with date indicators
- Updated `App.svelte` with new right pane structure
- Unit and E2E tests for journal functionality
- Updated `CLAUDE.md` documentation

## Future Work (Out of Scope)

- Migration of existing `.md` daily notes to YAML format
- Drag-and-drop reordering (using manual order numbers instead)
- Tag extraction from journal entries
- Search across journal entries
