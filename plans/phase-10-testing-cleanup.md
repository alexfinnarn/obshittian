# Phase 10: Testing & Cleanup

## Goal
Final integration testing with Playwright E2E tests, add missing data-testid attributes, verify all functionality works end-to-end, and clean up documentation.

## Prerequisites
- Phase 9 complete (Sync & Persistence)

## Tasks

### 10.1 Configure Playwright for Svelte App

Create `svelte-app/playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

Add scripts to `svelte-app/package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed"
  }
}
```

### 10.2 Add Missing data-testid Attributes

The vanilla JS E2E tests use specific test IDs. Add matching IDs to Svelte components:

**App.svelte:**
- `data-testid="app-container"` (already exists)
- `data-testid="app-loading"` (already exists)
- `data-testid="editor-area"` (already exists)
- `data-testid="left-pane"` (already exists)
- `data-testid="right-pane"` (already exists)

**Sidebar.svelte:**
- `data-testid="sidebar"`
- `data-testid="calendar-container"`
- `data-testid="file-tree"`

**VaultPicker.svelte:**
- `data-testid="vault-picker"` (already exists)
- `data-testid="open-folder-btn"` (already exists)
- `data-testid="restore-folder-btn"` (already exists)

**QuickLinks.svelte:**
- `data-testid="quick-links"`
- `data-testid="btn-configure-quick-links"`
- `data-testid="quick-links-modal"`
- `data-testid="btn-add-link"`
- `data-testid="btn-quick-links-save"`
- `data-testid="btn-quick-links-cancel"`
- `data-testid="modal-close"`

**QuickFiles.svelte:**
- `data-testid="quick-files"`
- `data-testid="btn-configure-quick-files"`
- `data-testid="quick-files-modal"`
- `data-testid="btn-add-file"`
- `data-testid="btn-quick-files-save"`
- `data-testid="btn-quick-files-cancel"`
- `data-testid="quick-files-modal-close"`

**EditorPane.svelte:**
- `data-testid="{pane}-editor"` (left-editor, right-editor)
- `data-testid="{pane}-preview"` (left-preview, right-preview)
- `data-testid="{pane}-btn-edit"`
- `data-testid="{pane}-btn-view"`
- `data-testid="{pane}-filename"` (for single mode)
- `data-testid="{pane}-tab-bar"` (for tabs mode)

**TabBar.svelte:**
- `data-testid="tab-bar"`

**PaneResizer.svelte:**
- `data-testid="pane-resizer"`

**ContextMenu.svelte:**
- `data-testid="context-menu"`

### 10.3 Create E2E Test Suite

Create `svelte-app/tests/e2e/app.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Markdown Editor - Svelte', () => {
  test.describe('Vault Picker', () => {
    test('should show vault picker when no vault is open', async ({ page }) => {
      // Clear IndexedDB first
      await page.goto('/');
      await page.evaluate(async () => {
        const dbs = await indexedDB.databases();
        for (const db of dbs) {
          if (db.name) indexedDB.deleteDatabase(db.name);
        }
      });
      await page.reload();

      await expect(page.getByTestId('vault-picker')).toBeVisible();
      await expect(page.getByTestId('open-folder-btn')).toBeVisible();
    });

    test('should show restore button when saved handle exists', async ({ page }) => {
      await page.goto('/');

      // Simulate saving a directory handle to IndexedDB
      await page.evaluate(async () => {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open('mdEditorDB', 1);
          request.onerror = () => reject(request.error);
          request.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('handles')) {
              db.createObjectStore('handles');
            }
          };
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction('handles', 'readwrite');
            const store = tx.objectStore('handles');
            store.put({ name: 'test-folder', kind: 'directory' }, 'rootDir');
            tx.oncomplete = () => resolve(undefined);
            tx.onerror = () => reject(tx.error);
          };
        });
      });

      await page.reload();

      await expect(page.getByTestId('restore-folder-btn')).toBeVisible();
    });
  });

  // Note: Tests that require an open vault cannot run without File System Access API
  // user interaction. The following tests are documented for manual verification.

  test.describe('UI Elements (requires open vault)', () => {
    test.skip('should display sidebar elements', async ({ page }) => {
      // This test requires manually opening a folder
      await expect(page.getByTestId('sidebar')).toBeVisible();
      await expect(page.getByTestId('calendar-container')).toBeVisible();
      await expect(page.getByTestId('file-tree')).toBeVisible();
    });

    test.skip('should display editor panes', async ({ page }) => {
      await expect(page.getByTestId('left-pane')).toBeVisible();
      await expect(page.getByTestId('right-pane')).toBeVisible();
      await expect(page.getByTestId('pane-resizer')).toBeVisible();
    });
  });
});

test.describe('View Toggle', () => {
  // These tests require vault to be open
  test.skip('should toggle left pane view modes', async ({ page }) => {
    const leftEditor = page.getByTestId('left-editor');
    const leftPreview = page.getByTestId('left-preview');
    const editBtn = page.getByTestId('left-btn-edit');
    const viewBtn = page.getByTestId('left-btn-view');

    await expect(editBtn).toHaveClass(/active/);

    await viewBtn.click();
    await expect(viewBtn).toHaveClass(/active/);
    await expect(leftPreview).toBeVisible();
  });
});

test.describe('Editor Features', () => {
  // Helper to get editor content from CodeMirror DOM
  const getEditorContent = async (page: any, pane = 'left') => {
    return await page.evaluate((p: string) => {
      const editor = document.querySelector(`[data-testid="${p}-editor"]`);
      if (!editor) return '';
      const lines = editor.querySelectorAll('.cm-line');
      return Array.from(lines).map((line: Element) => line.textContent).join('\n');
    }, pane);
  };

  test.skip('should indent with Tab key', async ({ page }) => {
    const leftEditor = page.getByTestId('left-editor');
    const cmContent = leftEditor.locator('.cm-content');

    await cmContent.click();
    await page.keyboard.type('hello');
    await page.keyboard.press('Tab');
    await page.keyboard.type('world');

    const content = await getEditorContent(page, 'left');
    expect(content).toContain('hello');
    expect(content).toContain('world');
  });

  test.skip('should auto-close brackets', async ({ page }) => {
    const leftEditor = page.getByTestId('left-editor');
    const cmContent = leftEditor.locator('.cm-content');

    await cmContent.click();
    await page.keyboard.type('test(');

    const content = await getEditorContent(page, 'left');
    expect(content).toBe('test()');
  });
});
```

### 10.4 Update Components with Test IDs

Review each component and add any missing test IDs per 10.2.

### 10.5 Run Full Test Suite

```bash
cd svelte-app

# Run unit tests
npm run test:run

# Run type check
npm run check

# Run E2E tests
npm run test:e2e
```

### 10.6 Documentation Review

**Update CLAUDE.md:**
- Ensure all new components are documented
- Verify file structure is accurate
- Update any changed behavior descriptions

**Update README.md (if user-facing features changed):**
- Document Svelte app usage
- Note any changed keyboard shortcuts
- Document vault picker flow

### 10.7 Code Cleanup

1. **Remove unused imports** - Check all files for unused imports
2. **Remove console.log statements** - Keep only error/warning logs
3. **Remove TODO comments** - Address or remove stale TODOs
4. **Verify TypeScript strict mode** - Ensure no `any` types where avoidable

### 10.8 Verify Integration Points

Manual verification checklist:

- [ ] App loads and shows VaultPicker when no vault saved
- [ ] Auto-restore works when vault was previously opened
- [ ] Open Folder button opens file picker
- [ ] Restore button requests permission and opens vault
- [ ] Sidebar shows Calendar, QuickLinks, QuickFiles, SidebarTabs
- [ ] Calendar date click opens daily note in right pane
- [ ] Cmd+Arrow keys navigate days/weeks in calendar
- [ ] Files tab shows file tree
- [ ] File click opens in left pane (tabs)
- [ ] Right-click shows context menu (New File, New Folder, Rename, Delete)
- [ ] "Open in Tab" respects 5-tab limit
- [ ] Search tab shows tag search
- [ ] Tag search works with fuzzy matching
- [ ] Click tag shows files with that tag
- [ ] Click file from search opens in left pane
- [ ] Edit/View toggle works for both panes
- [ ] Cmd+E toggles view mode for focused pane
- [ ] Cmd+S saves focused pane
- [ ] Cmd+W closes current tab (left pane)
- [ ] Cmd+Tab navigates between tabs
- [ ] Tabs persist across page reload
- [ ] Last open file restores on load
- [ ] Pane resizer works
- [ ] Pane width persists across reload
- [ ] Daily note auto-upgrades from `sync: delete` to `sync: temporary` when edited
- [ ] Sync exports markdown to sync directory
- [ ] Temporary exports cleanup works

### 10.9 Performance Check

1. Run Lighthouse audit on built app
2. Check bundle size: `npm run build && ls -la dist/assets/`
3. Verify no obvious memory leaks during extended use

## File Structure After Phase 10

```
svelte-app/
├── playwright.config.ts     # NEW
├── tests/
│   └── e2e/
│       └── app.spec.ts      # NEW
└── (existing structure)
```

## Success Criteria

- [ ] All 426+ unit tests pass
- [ ] `npm run check` passes (no TypeScript errors)
- [ ] E2E tests run without errors
- [ ] Manual integration checklist complete
- [ ] Documentation is up to date
- [ ] No console errors in production build
- [ ] Bundle size is reasonable (< 500KB gzipped)

## Notes

### E2E Testing Limitations

The File System Access API requires user interaction for `showDirectoryPicker()` and `requestPermission()`. This means:

1. **Cannot fully automate vault opening** - Tests that require an open vault are marked as `test.skip` with documentation for manual testing
2. **Can test VaultPicker UI** - The picker itself can be tested
3. **Can test IndexedDB mocking** - We can simulate stored handles to test restore button visibility
4. **Unit tests cover most logic** - The 426 unit tests cover the core functionality thoroughly

### Alternative Testing Approaches

For more complete E2E testing, consider:

1. **Mock the File System Access API** at the browser level using Playwright's route interception
2. **Use a test vault fixture** with pre-configured permissions (complex to set up)
3. **Create a test mode** that uses in-memory file system instead of real FS API

The current approach prioritizes unit test coverage with manual E2E verification for file system features.

(Session notes will be added during implementation)
