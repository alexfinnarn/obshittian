# Phase 07: Testing

**Status:** Pending
**Output:** `src/lib/stores/journal.svelte.test.ts`, `tests/e2e/journal.spec.ts`

## Objective

Create comprehensive unit and E2E tests for the journal functionality.

## Tasks

- [ ] Create `src/lib/stores/journal.svelte.test.ts`
- [ ] Create `tests/e2e/journal.spec.ts`
- [ ] Test all CRUD operations
- [ ] Test file I/O with mocks
- [ ] Test rollback on save failure
- [ ] Test date switching
- [ ] Test calendar indicators
- [ ] Run full test suite

## Unit Tests: journal.svelte.test.ts

### Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  journalStore,
  getEntries,
  addEntry,
  removeEntry,
  updateEntryText,
  updateEntryType,
  updateEntryOrder,
  loadEntriesForDate,
  saveEntries,
  resetJournal,
} from './journal.svelte';

describe('journal store', () => {
  beforeEach(() => {
    resetJournal();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have empty entries array');
    it('should have null selected date');
    it('should not be loading');
  });

  describe('addEntry', () => {
    it('should add entry with correct fields');
    it('should auto-increment order');
    it('should set created/updated timestamps');
    it('should auto-save after adding');
    it('should update datesWithEntries on first entry');
    it('should rollback on save failure');
  });

  describe('removeEntry', () => {
    it('should remove entry by id');
    it('should auto-save after removing');
    it('should update datesWithEntries when last entry removed');
    it('should rollback on save failure');
  });

  describe('updateEntryText', () => {
    it('should update text and updatedAt');
    it('should not change createdAt');
    it('should rollback on save failure');
  });

  describe('updateEntryType', () => {
    it('should update type');
    it('should rollback on save failure');
  });

  describe('updateEntryOrder', () => {
    it('should update order');
    it('should rollback on save failure');
  });

  describe('loadEntriesForDate', () => {
    it('should load entries from file');
    it('should set selected date');
    it('should return empty array for non-existent file');
    it('should handle file read errors');
  });

  describe('saveEntries', () => {
    it('should write entries to YAML file');
    it('should create directory structure if needed');
    it('should not create file if no entries');
    it('should return false on error');
  });
});
```

### Mock Setup

```typescript
function setupSuccessfulSaveMocks() {
  const mockWritable = {
    write: vi.fn(),
    close: vi.fn(),
  };
  const yamlContent = `version: 1
entries: []
`;
  const mockFileHandle = {
    createWritable: vi.fn().mockResolvedValue(mockWritable),
    getFile: vi.fn().mockResolvedValue(new Blob([yamlContent])),
  };
  // ... setup vault mock with directory structure
}

function setupFailedSaveMocks() {
  // Return mock that throws on createWritable
}
```

## E2E Tests: journal.spec.ts

### Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Journal', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app with test vault
  });

  test('displays empty state when no entries', async ({ page }) => {
    // Click on a date with no entries
    // Verify empty state message is shown
  });

  test('adds new entry via input field', async ({ page }) => {
    // Type in input field
    // Select type from dropdown
    // Click Add button
    // Verify entry appears in list
  });

  test('adds entry with Enter key', async ({ page }) => {
    // Type in input field
    // Press Enter
    // Verify entry appears
  });

  test('edits entry text', async ({ page }) => {
    // Add an entry
    // Click on entry to edit
    // Modify text
    // Click Save or blur
    // Verify text updated
  });

  test('changes entry type', async ({ page }) => {
    // Add an entry
    // Edit entry
    // Change type dropdown
    // Save
    // Verify type changed
  });

  test('changes entry order', async ({ page }) => {
    // Add multiple entries
    // Edit entry order
    // Verify order changed
  });

  test('deletes entry with confirmation', async ({ page }) => {
    // Add an entry
    // Click delete
    // Confirm dialog
    // Verify entry removed
  });

  test('navigates dates with calendar', async ({ page }) => {
    // Add entry to one date
    // Click different date in calendar
    // Verify entries change
  });

  test('shows calendar indicator for dates with entries', async ({ page }) => {
    // Add entry to a date
    // Verify red dot appears on that date
  });

  test('persists entries after page reload', async ({ page }) => {
    // Add entry
    // Reload page
    // Navigate to same date
    // Verify entry still exists
  });
});
```

## Test Data

Create test fixtures in `tests/data/testing-files/`:

```
tests/data/testing-files/
└── zzz_Daily Notes/
    └── 2025/
        └── 01/
            └── 2025-01-15.yaml  # Sample journal file for testing
```

Sample fixture:
```yaml
version: 1
entries:
  - id: test-entry-1
    text: |
      Test entry for E2E
    type: one
    order: 1
    createdAt: 2025-01-15T10:00:00.000Z
    updatedAt: 2025-01-15T10:00:00.000Z
```

## Dependencies

- Phase 01-06: All implementation must be complete
- Existing test infrastructure (Vitest, Playwright)

## Acceptance Criteria

- [ ] Unit tests cover all store functions
- [ ] Unit tests verify rollback behavior
- [ ] E2E tests cover all user workflows
- [ ] E2E tests verify persistence
- [ ] `npm run test:run` passes
- [ ] `npm run test:e2e` passes
- [ ] No flaky tests
