# Phase 02: Journal Store

**Status:** Pending
**Output:** `src/lib/stores/journal.svelte.ts`

## Objective

Create the Svelte 5 runes-based store for managing journal entries with file persistence and date tracking.

## Tasks

- [ ] Create `src/lib/stores/journal.svelte.ts`
- [ ] Implement reactive state with `$state` rune
- [ ] Add getter functions for entries and selected date
- [ ] Implement CRUD operations with auto-save
- [ ] Add rollback on save failure (matching Todo pattern)
- [ ] Implement `loadEntriesForDate(date)` for file I/O
- [ ] Implement `saveEntries()` for file persistence
- [ ] Implement `scanDatesWithEntries()` for calendar indicators
- [ ] Add `datesWithEntries` Set for tracking dates with files

## Content Outline

### State Structure

```typescript
interface JournalState {
  selectedDate: Date | null;
  entries: JournalEntry[];
  isLoading: boolean;
  datesWithEntries: Set<string>;  // Format: "YYYY-MM-DD"
}

export const journalStore = $state<JournalState>({
  selectedDate: null,
  entries: [],
  isLoading: false,
  datesWithEntries: new Set(),
});
```

### Getter Functions

```typescript
export function getEntries(): JournalEntry[];
export function getSelectedDate(): Date | null;
export function getSelectedDateString(): string | null;  // "YYYY-MM-DD"
export function hasEntriesForDate(dateStr: string): boolean;
export function getDatesWithEntries(): string[];
```

### CRUD Operations

```typescript
export async function addEntry(text: string, type: string): Promise<boolean>;
export async function removeEntry(id: string): Promise<boolean>;
export async function updateEntryText(id: string, text: string): Promise<boolean>;
export async function updateEntryType(id: string, type: string): Promise<boolean>;
export async function updateEntryOrder(id: string, order: number): Promise<boolean>;
```

### File I/O

```typescript
export async function loadEntriesForDate(date: Date): Promise<JournalEntry[]>;
export async function saveEntries(): Promise<boolean>;
export async function scanDatesWithEntries(): Promise<void>;
```

### File Path Logic

Reuse `formatDailyNotePath()` from `dailyNotes.ts` but with `.yaml` extension:
- Path: `{dailyNotesFolder}/YYYY/MM/YYYY-MM-DD.yaml`
- Directory structure created automatically if missing
- Use `js-yaml` library for parsing/serializing (already used for frontmatter)

### YAML Serialization

```typescript
import yaml from 'js-yaml';

// Reading
const content = await file.text();
const data = yaml.load(content) as JournalData;

// Writing (use literal block style for multiline text)
const yamlStr = yaml.dump(data, {
  lineWidth: -1,  // No line wrapping
  quotingType: '"',
  forceQuotes: false,
});
```

### Key Behaviors

1. **File creation:** Only create file when first entry is saved (not on date selection)
2. **Rollback:** Store old state before mutation, restore if save fails
3. **Date tracking:** Update `datesWithEntries` when adding first entry or removing last entry
4. **Order assignment:** Auto-increment order for new entries

## Dependencies

- Phase 01: Types and Configuration (JournalEntry interface)
- Existing: `vault.svelte.ts` for rootDirHandle
- Existing: `dailyNotes.ts` for path formatting (can reuse or adapt)
- Existing: `filesystem.ts` for `getOrCreateDirectory()`

## Acceptance Criteria

- [ ] Store uses Svelte 5 `$state` rune pattern
- [ ] Loading entries for a date updates `selectedDate` and `entries`
- [ ] Adding entry auto-saves and updates `datesWithEntries`
- [ ] Removing last entry from a date removes it from `datesWithEntries`
- [ ] Save failure triggers rollback to previous state
- [ ] `scanDatesWithEntries()` correctly identifies all dates with YAML files
- [ ] Files only created when first entry is saved
