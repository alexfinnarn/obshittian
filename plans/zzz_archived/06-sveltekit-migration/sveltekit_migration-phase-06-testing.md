# Phase 06: Testing Infrastructure

**Status:** Pending
**Output:** Updated test suite working with new architecture

## Objective

Update testing infrastructure to work with SvelteKit and the new file service abstraction.

## Tasks

- [ ] Update Vitest config for SvelteKit
- [ ] Create `mockFileService` fixture for unit tests
- [ ] Update all store tests to use mock file service
- [ ] Update all component tests to use mock file service
- [ ] Remove all `FileSystemDirectoryHandle` mocks
- [ ] Update E2E tests for new vault picker flow
- [ ] Add API route tests using SvelteKit testing utilities
- [ ] Update `test-setup.ts` to remove browser API mocks
- [ ] Verify all existing tests pass with new architecture
- [ ] Add new tests for API routes

## Test Setup Changes

```typescript
// src/test-setup.ts (simplified)
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { createMockFileService } from '$lib/services/mockFileService';

// No more FileSystemDirectoryHandle mocks!
// No more showDirectoryPicker mocks!

// Simple file service mock
beforeEach(() => {
  // Reset file service to mock for each test
  vi.mock('$lib/services/fileService', () => ({
    fileService: createMockFileService({
      'test.md': '# Test\n\nContent here',
      'folder/nested.md': '# Nested file',
    })
  }));
});
```

## Store Test Example

```typescript
// BEFORE
describe('tabs store', () => {
  it('adds a tab', () => {
    const mockHandle = { name: 'test.md' } as FileSystemFileHandle;
    const mockDirHandle = {} as FileSystemDirectoryHandle;
    addTab(createTab(mockHandle, mockDirHandle, 'content', 'test.md'));
    // ...
  });
});

// AFTER
describe('tabs store', () => {
  it('adds a tab', () => {
    addTab(createTab('test.md', 'content'));
    expect(tabsStore.tabs[0].filePath).toBe('test.md');
    // ...
  });
});
```

## Component Test Example

```typescript
// BEFORE
describe('FileTree', () => {
  it('loads entries', async () => {
    const mockDirHandle = createMockDirectoryHandle([
      { name: 'file1.md', kind: 'file' },
      { name: 'folder', kind: 'directory' },
    ]);
    // Complex mock setup...
  });
});

// AFTER
describe('FileTree', () => {
  it('loads entries', async () => {
    // fileService is already mocked in test-setup
    render(FileTree);
    await waitFor(() => {
      expect(screen.getByText('test.md')).toBeInTheDocument();
    });
  });
});
```

## API Route Testing

```typescript
// src/routes/api/files/read/+server.test.ts
import { describe, it, expect, vi } from 'vitest';
import { POST } from './+server';

// Mock fs module
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn().mockResolvedValue('file content'),
    stat: vi.fn().mockResolvedValue({ isFile: () => true }),
  }
}));

describe('POST /api/files/read', () => {
  it('returns file content', async () => {
    const request = new Request('http://localhost/api/files/read', {
      method: 'POST',
      body: JSON.stringify({ path: '/vault/test.md' })
    });

    const response = await POST({ request });
    const data = await response.json();

    expect(data.content).toBe('file content');
  });

  it('returns 404 for missing file', async () => {
    // ...
  });
});
```

## E2E Test Updates

```typescript
// tests/e2e/vault-picker.spec.ts
test('opens vault with valid path', async ({ page }) => {
  await page.goto('/');

  // New flow: enter path instead of clicking picker
  const pathInput = page.getByPlaceholder('/Users/you/Documents/notes');
  await pathInput.fill('/tmp/test-vault');

  await page.getByRole('button', { name: 'Open Vault' }).click();

  // Should navigate to editor
  await expect(page.getByTestId('file-tree')).toBeVisible();
});

test('shows error for invalid path', async ({ page }) => {
  await page.goto('/');

  const pathInput = page.getByPlaceholder('/Users/you/Documents/notes');
  await pathInput.fill('/nonexistent/path');

  await page.getByRole('button', { name: 'Open Vault' }).click();

  await expect(page.getByText('Directory does not exist')).toBeVisible();
});
```

## Files to Update

| File | Changes |
|------|---------|
| `vite.config.ts` | Update for SvelteKit testing |
| `src/test-setup.ts` | Remove browser API mocks, add file service mock |
| `src/lib/stores/*.test.ts` | Use mock file service |
| `src/lib/components/*.test.ts` | Use mock file service |
| `src/lib/utils/*.test.ts` | Use mock file service |
| `tests/e2e/*.spec.ts` | Update for new vault picker flow |

## Dependencies

- Phase 05 complete (all components use fileService)

## Acceptance Criteria

- [ ] All unit tests pass (`npm run test:run`)
- [ ] All E2E tests pass (`npm run test:e2e`)
- [ ] No `FileSystemDirectoryHandle` mocks in test code
- [ ] API routes have test coverage
- [ ] Mock file service is easy to configure per test
- [ ] Test setup is simpler than before
- [ ] CI pipeline passes
