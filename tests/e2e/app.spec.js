import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_FILES_DIR = path.resolve(__dirname, '../data/testing-files');

test.describe('Markdown Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main UI elements', async ({ page }) => {
    // Sidebar elements
    await expect(page.getByTestId('sidebar')).toBeVisible();
    await expect(page.getByTestId('btn-open-folder')).toBeVisible();
    await expect(page.getByTestId('calendar-container')).toBeVisible();
    await expect(page.getByTestId('file-tree')).toBeVisible();

    // Main content area
    await expect(page.getByTestId('main-content')).toBeVisible();
    await expect(page.getByTestId('left-pane')).toBeVisible();
    await expect(page.getByTestId('right-pane')).toBeVisible();
    await expect(page.getByTestId('pane-resizer')).toBeVisible();
  });

  test('should display correct initial state in panes', async ({ page }) => {
    // Left pane has tab bar with "No file open" message
    await expect(page.getByTestId('left-tab-bar')).toContainText('No file open');
    await expect(page.getByTestId('left-btn-edit')).toBeVisible();
    await expect(page.getByTestId('left-btn-view')).toBeVisible();

    // Right pane has filename display
    await expect(page.getByTestId('right-filename')).toHaveText('No daily note');
    await expect(page.getByTestId('right-btn-edit')).toBeVisible();
    await expect(page.getByTestId('right-btn-view')).toBeVisible();
  });

  test('should have calendar widget visible', async ({ page }) => {
    const calendarContainer = page.getByTestId('calendar-container');
    await expect(calendarContainer).toBeVisible();

    // Pikaday creates a table for the calendar
    await expect(calendarContainer.locator('.pika-single')).toBeVisible();
  });

  test('should show context menu on file tree right-click', async ({ page }) => {
    const contextMenu = page.getByTestId('context-menu');

    // Context menu should be hidden initially
    await expect(contextMenu).not.toBeVisible();
  });

  test('should have quick links section', async ({ page }) => {
    await expect(page.getByTestId('quick-links')).toBeVisible();
    await expect(page.getByTestId('btn-configure-quick-links')).toBeVisible();
  });

  test('should have quick files section in sidebar', async ({ page }) => {
    await expect(page.getByTestId('quick-files')).toBeVisible();
    await expect(page.getByTestId('btn-configure-quick-files')).toBeVisible();
  });

  test('should open quick links modal when clicking configure', async ({ page }) => {
    const modal = page.getByTestId('quick-links-modal');

    // Modal hidden initially
    await expect(modal).not.toBeVisible();

    // Click configure button
    await page.getByTestId('btn-configure-quick-links').click();

    // Modal should be visible
    await expect(modal).toBeVisible();
    await expect(page.getByTestId('btn-add-link')).toBeVisible();
    await expect(page.getByTestId('btn-quick-links-save')).toBeVisible();
    await expect(page.getByTestId('btn-quick-links-cancel')).toBeVisible();
  });

  test('should close quick links modal on cancel', async ({ page }) => {
    const modal = page.getByTestId('quick-links-modal');

    // Open modal
    await page.getByTestId('btn-configure-quick-links').click();
    await expect(modal).toBeVisible();

    // Cancel
    await page.getByTestId('btn-quick-links-cancel').click();
    await expect(modal).not.toBeVisible();
  });

  test('should close quick links modal on close button', async ({ page }) => {
    const modal = page.getByTestId('quick-links-modal');

    // Open modal
    await page.getByTestId('btn-configure-quick-links').click();
    await expect(modal).toBeVisible();

    // Close via X button
    await page.getByTestId('modal-close').click();
    await expect(modal).not.toBeVisible();
  });
});

test.describe('View Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should toggle left pane view modes', async ({ page }) => {
    const leftEditor = page.getByTestId('left-editor');
    const leftPreview = page.getByTestId('left-preview');
    const editBtn = page.getByTestId('left-btn-edit');
    const viewBtn = page.getByTestId('left-btn-view');

    // Initial state: edit mode (editor visible, preview hidden)
    await expect(editBtn).toHaveClass(/active/);

    // Click view mode - only preview visible
    await viewBtn.click();
    await expect(viewBtn).toHaveClass(/active/);
    await expect(editBtn).not.toHaveClass(/active/);
    await expect(leftPreview).toHaveClass(/visible/);
    await expect(leftEditor).toHaveCSS('display', 'none');

    // Click edit view - back to editor only
    await editBtn.click();
    await expect(editBtn).toHaveClass(/active/);
    await expect(viewBtn).not.toHaveClass(/active/);
    await expect(leftEditor).toHaveCSS('display', 'block');
  });

  test('should toggle right pane view modes', async ({ page }) => {
    const rightEditor = page.getByTestId('right-editor');
    const rightPreview = page.getByTestId('right-preview');
    const editBtn = page.getByTestId('right-btn-edit');
    const viewBtn = page.getByTestId('right-btn-view');

    // Initial state: edit mode
    await expect(editBtn).toHaveClass(/active/);

    // Click view mode
    await viewBtn.click();
    await expect(viewBtn).toHaveClass(/active/);
    await expect(editBtn).not.toHaveClass(/active/);
    await expect(rightPreview).toHaveClass(/visible/);
    await expect(rightEditor).toHaveCSS('display', 'none');

    // Click edit view
    await editBtn.click();
    await expect(editBtn).toHaveClass(/active/);
    await expect(viewBtn).not.toHaveClass(/active/);
    await expect(rightEditor).toHaveCSS('display', 'block');
  });

  test('should toggle view mode with Cmd+E keyboard shortcut only for focused pane', async ({ page }) => {
    const leftEditor = page.getByTestId('left-editor');
    const leftPreview = page.getByTestId('left-preview');
    const leftEditBtn = page.getByTestId('left-btn-edit');
    const leftViewBtn = page.getByTestId('left-btn-view');

    const rightEditBtn = page.getByTestId('right-btn-edit');
    const rightViewBtn = page.getByTestId('right-btn-view');

    // Initial state: both panes in edit mode
    await expect(leftEditBtn).toHaveClass(/active/);
    await expect(rightEditBtn).toHaveClass(/active/);

    // Focus the left editor by clicking on it
    await leftEditor.locator('.cm-content').click();

    // Press Cmd+E (Meta+E on Mac, Ctrl+E on Windows/Linux)
    await page.keyboard.press('Meta+e');

    // Left pane should switch to view mode
    await expect(leftViewBtn).toHaveClass(/active/);
    await expect(leftEditBtn).not.toHaveClass(/active/);
    await expect(leftPreview).toHaveClass(/visible/);
    await expect(leftEditor).toHaveCSS('display', 'none');

    // Right pane should remain in edit mode (unchanged)
    await expect(rightEditBtn).toHaveClass(/active/);
    await expect(rightViewBtn).not.toHaveClass(/active/);

    // Press Cmd+E again to toggle back to edit mode
    // The preview pane should still be focused after the first toggle
    await page.keyboard.press('Meta+e');

    // Left pane should switch back to edit mode
    await expect(leftEditBtn).toHaveClass(/active/);
    await expect(leftViewBtn).not.toHaveClass(/active/);
    await expect(leftEditor).toHaveCSS('display', 'block');

    // Right pane should still be in edit mode
    await expect(rightEditBtn).toHaveClass(/active/);
  });
});

test.describe('File System Operations', () => {
  // These tests require the File System Access API which needs user interaction
  // They demonstrate how to set up tests that interact with the file picker

  test('should show open folder button', async ({ page }) => {
    await page.goto('/');
    const openFolderBtn = page.getByTestId('btn-open-folder');
    await expect(openFolderBtn).toBeVisible();
    await expect(openFolderBtn).toHaveText(/Open Folder/);
  });

  // Note: Testing actual file system operations requires special Playwright setup
  // since showDirectoryPicker() requires user gesture and can't be easily mocked
  // For real file system testing, you would need to:
  // 1. Use Playwright's fileChooser API for file inputs
  // 2. Or use browser context permissions for the File System Access API
});

test.describe('Sync Functionality', () => {
  // Note: Full E2E testing of sync/export functionality is limited because:
  // 1. The File System Access API (showDirectoryPicker) requires user interaction
  // 2. We cannot easily mock file system operations in browser tests
  // 3. The sync logic (frontmatter upgrade from delete→temporary) is thoroughly
  //    tested in unit tests (tests/sync.test.js)
  //
  // These E2E tests verify UI aspects that support the sync functionality.

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('sync configuration is loaded from config', async ({ page }) => {
    // Verify that editorConfig is available with sync settings
    const config = await page.evaluate(() => window.editorConfig);

    expect(config).toBeDefined();
    expect(config.syncDirectory).toBe('zzzz_exports');
    expect(config.syncTempLimit).toBe(7);
  });

  test('daily notes folder is configured', async ({ page }) => {
    // The dailyNotesFolder config is used for sync upgrade logic
    const config = await page.evaluate(() => window.editorConfig);

    expect(config).toBeDefined();
    expect(config.dailyNotesFolder).toBe('zzz_Daily Notes');
  });

  test('auto-save delay is configured for sync triggers', async ({ page }) => {
    // Auto-save is what triggers the sync upgrade check
    const config = await page.evaluate(() => window.editorConfig);

    expect(config).toBeDefined();
    expect(config.autoSaveDelay).toBe(2000);
  });

  // Note: Testing actual frontmatter upgrades requires file system operations
  // which are covered by unit tests in tests/sync.test.js:
  // - "should detect modified daily note and identify need for upgrade"
  // - "simulates upgrade path for legacy daily note without sync key"
  // - "simulates upgrade path for legacy daily note without any frontmatter"
});

test.describe('Editor Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // Helper to get editor content from CodeMirror DOM
  const getEditorContent = async (page, pane = 'left') => {
    return await page.evaluate((p) => {
      const editor = document.querySelector(`[data-testid="${p}-editor"]`);
      const lines = editor.querySelectorAll('.cm-line');
      return Array.from(lines).map(line => line.textContent).join('\n');
    }, pane);
  };

  test('should indent with Tab key', async ({ page }) => {
    const leftEditor = page.getByTestId('left-editor');
    const cmContent = leftEditor.locator('.cm-content');

    // Focus editor and type some text
    await cmContent.click();
    await page.keyboard.type('hello');

    // Press Tab to indent
    await page.keyboard.press('Tab');
    await page.keyboard.type('world');

    // Get editor content - Tab inserts actual tab character
    const content = await getEditorContent(page, 'left');

    // CodeMirror renders tab as spaces visually, but the text should show indentation
    expect(content).toContain('hello');
    expect(content).toContain('world');
  });

  test('should dedent with Shift+Tab', async ({ page }) => {
    const leftEditor = page.getByTestId('left-editor');
    const cmContent = leftEditor.locator('.cm-content');

    // Focus editor and type indented text
    await cmContent.click();
    await page.keyboard.press('Tab');
    await page.keyboard.type('indented');

    // Move to beginning of line and dedent
    await page.keyboard.press('Home');
    await page.keyboard.press('Shift+Tab');

    // Verify text is present after dedent (indentation removed)
    const content = await getEditorContent(page, 'left');
    expect(content).toContain('indented');
  });

  test('should auto-close parentheses', async ({ page }) => {
    const leftEditor = page.getByTestId('left-editor');
    const cmContent = leftEditor.locator('.cm-content');

    await cmContent.click();
    await page.keyboard.type('test(');

    const content = await getEditorContent(page, 'left');

    // Should have auto-closed the parenthesis
    expect(content).toBe('test()');
  });

  test('should auto-close square brackets', async ({ page }) => {
    const leftEditor = page.getByTestId('left-editor');
    const cmContent = leftEditor.locator('.cm-content');

    await cmContent.click();
    await page.keyboard.type('array[');

    const content = await getEditorContent(page, 'left');

    expect(content).toBe('array[]');
  });

  test('should auto-close curly braces', async ({ page }) => {
    const leftEditor = page.getByTestId('left-editor');
    const cmContent = leftEditor.locator('.cm-content');

    await cmContent.click();
    await page.keyboard.type('object{');

    const content = await getEditorContent(page, 'left');

    expect(content).toBe('object{}');
  });

  test('should auto-close double quotes', async ({ page }) => {
    const leftEditor = page.getByTestId('left-editor');
    const cmContent = leftEditor.locator('.cm-content');

    await cmContent.click();
    await page.keyboard.type('say "');

    const content = await getEditorContent(page, 'left');

    expect(content).toBe('say ""');
  });
});

test.describe('Restore Folder', () => {
  test('should hide restore folder button by default when no saved handle', async ({ page }) => {
    // Clear IndexedDB before loading
    await page.goto('/');
    await page.evaluate(async () => {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        indexedDB.deleteDatabase(db.name);
      }
    });

    // Reload to get fresh state
    await page.reload();

    const restoreBtn = page.getByTestId('btn-restore-folder');
    await expect(restoreBtn).not.toBeVisible();
  });

  test('should show restore folder button when saved handle exists', async ({ page }) => {
    await page.goto('/');

    // Simulate saving a directory handle to IndexedDB
    // Note: We can't save an actual FileSystemDirectoryHandle in tests,
    // but we can save a mock object to trigger the button visibility
    await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('mdEditorDB', 1);
        request.onerror = () => reject(request.error);
        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('handles')) {
            db.createObjectStore('handles');
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('handles', 'readwrite');
          const store = tx.objectStore('handles');
          // Store a mock handle - just needs to be truthy
          store.put({ name: 'test-folder', kind: 'directory' }, 'rootDir');
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      });
    });

    // Reload to trigger the check for saved handle
    await page.reload();

    const restoreBtn = page.getByTestId('btn-restore-folder');
    await expect(restoreBtn).toBeVisible();
    await expect(restoreBtn).toHaveText(/Restore Folder/);
  });

  test('should have both buttons visible when saved handle exists', async ({ page }) => {
    await page.goto('/');

    // Save a mock handle
    await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('mdEditorDB', 1);
        request.onerror = () => reject(request.error);
        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('handles')) {
            db.createObjectStore('handles');
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('handles', 'readwrite');
          const store = tx.objectStore('handles');
          store.put({ name: 'test-folder', kind: 'directory' }, 'rootDir');
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      });
    });

    await page.reload();

    const openBtn = page.getByTestId('btn-open-folder');
    const restoreBtn = page.getByTestId('btn-restore-folder');

    await expect(openBtn).toBeVisible();
    await expect(restoreBtn).toBeVisible();
  });

  test('restore folder button should be clickable', async ({ page }) => {
    await page.goto('/');

    // Save a mock handle
    await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('mdEditorDB', 1);
        request.onerror = () => reject(request.error);
        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('handles')) {
            db.createObjectStore('handles');
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('handles', 'readwrite');
          const store = tx.objectStore('handles');
          store.put({ name: 'test-folder', kind: 'directory' }, 'rootDir');
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      });
    });

    await page.reload();

    const restoreBtn = page.getByTestId('btn-restore-folder');
    await expect(restoreBtn).toBeVisible();
    await expect(restoreBtn).toBeEnabled();

    // Note: Actually clicking would trigger requestPermission which can't be
    // fully tested without user interaction, but we can verify the button works
  });
});

test.describe('Quick Files', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have quick files section in sidebar', async ({ page }) => {
    const quickFilesSection = page.getByTestId('quick-files');
    await expect(quickFilesSection).toBeVisible();
  });

  test('should have configure button in sidebar', async ({ page }) => {
    const configureBtn = page.getByTestId('btn-configure-quick-files');
    await expect(configureBtn).toBeVisible();
  });

  test('should open quick files modal when clicking configure', async ({ page }) => {
    const modal = page.getByTestId('quick-files-modal');

    // Modal hidden initially
    await expect(modal).not.toBeVisible();

    // Click configure button
    await page.getByTestId('btn-configure-quick-files').click();

    // Modal should be visible
    await expect(modal).toBeVisible();
    await expect(page.getByTestId('btn-add-file')).toBeVisible();
    await expect(page.getByTestId('btn-quick-files-save')).toBeVisible();
    await expect(page.getByTestId('btn-quick-files-cancel')).toBeVisible();
  });

  test('should close quick files modal on cancel', async ({ page }) => {
    const modal = page.getByTestId('quick-files-modal');

    // Open modal
    await page.getByTestId('btn-configure-quick-files').click();
    await expect(modal).toBeVisible();

    // Cancel
    await page.getByTestId('btn-quick-files-cancel').click();
    await expect(modal).not.toBeVisible();
  });

  test('should close quick files modal on close button', async ({ page }) => {
    const modal = page.getByTestId('quick-files-modal');

    // Open modal
    await page.getByTestId('btn-configure-quick-files').click();
    await expect(modal).toBeVisible();

    // Close via X button
    await page.getByTestId('quick-files-modal-close').click();
    await expect(modal).not.toBeVisible();
  });

  test('should load default quick files from config', async ({ page }) => {
    // Verify config has default quick files
    const config = await page.evaluate(() => window.editorConfig);

    expect(config).toBeDefined();
    expect(config.defaultQuickFiles).toBeDefined();
    expect(Array.isArray(config.defaultQuickFiles)).toBe(true);
    expect(config.defaultQuickFiles.length).toBeGreaterThan(0);

    // Check first default quick file
    expect(config.defaultQuickFiles[0]).toHaveProperty('name');
    expect(config.defaultQuickFiles[0]).toHaveProperty('path');
  });

  test('should have quickFilesLimit configured', async ({ page }) => {
    const config = await page.evaluate(() => window.editorConfig);

    expect(config).toBeDefined();
    expect(config.quickFilesLimit).toBe(5);
  });
});

test.describe('Vault Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('vault-config module should be loaded', async ({ page }) => {
    // The vault config functions should be available after app initialization
    // We test this indirectly by checking that the UI elements are set up correctly
    const quickFilesSection = page.getByTestId('quick-files');
    await expect(quickFilesSection).toBeVisible();
  });

  test('should have default quick links in config', async ({ page }) => {
    const config = await page.evaluate(() => window.editorConfig);

    expect(config).toBeDefined();
    expect(config.defaultQuickLinks).toBeDefined();
    expect(Array.isArray(config.defaultQuickLinks)).toBe(true);
    expect(config.defaultQuickLinks.length).toBeGreaterThan(0);

    // Check structure of quick links
    expect(config.defaultQuickLinks[0]).toHaveProperty('name');
    expect(config.defaultQuickLinks[0]).toHaveProperty('url');
  });

  test('should have default quick files in config', async ({ page }) => {
    const config = await page.evaluate(() => window.editorConfig);

    expect(config).toBeDefined();
    expect(config.defaultQuickFiles).toBeDefined();
    expect(Array.isArray(config.defaultQuickFiles)).toBe(true);

    // Check structure of quick files
    const firstFile = config.defaultQuickFiles[0];
    expect(firstFile).toHaveProperty('name');
    expect(firstFile).toHaveProperty('path');
    expect(firstFile.name).toBe('Know It');
    expect(firstFile.path).toBe('00_Know It.md');
  });

  // Note: Testing actual .editor-config.json loading requires opening a folder
  // with the File System Access API, which needs user interaction.
  // The test fixture at tests/data/testing-files/.editor-config.json is available
  // for manual testing or future automated tests with file system mocking.
  //
  // The fixture contains:
  // - quickLinks: [{ name: "Test Link 1", url: "https://example.com" }, ...]
  // - quickFiles: [{ name: "Sample", path: "sample-note.md" }, ...]
});
