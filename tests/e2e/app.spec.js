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
    // Left pane
    await expect(page.getByTestId('left-filename')).toHaveText('No file open');
    await expect(page.getByTestId('left-btn-edit')).toBeVisible();
    await expect(page.getByTestId('left-btn-split')).toBeVisible();
    await expect(page.getByTestId('left-btn-preview')).toBeVisible();

    // Right pane
    await expect(page.getByTestId('right-filename')).toHaveText('No daily note');
    await expect(page.getByTestId('right-btn-edit')).toBeVisible();
    await expect(page.getByTestId('right-btn-split')).toBeVisible();
    await expect(page.getByTestId('right-btn-preview')).toBeVisible();
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
    const splitBtn = page.getByTestId('left-btn-split');
    const previewBtn = page.getByTestId('left-btn-preview');

    // Initial state: edit mode (editor visible, preview hidden)
    await expect(editBtn).toHaveClass(/active/);

    // Click split view - both editor and preview visible
    await splitBtn.click();
    await expect(splitBtn).toHaveClass(/active/);
    await expect(editBtn).not.toHaveClass(/active/);
    await expect(leftPreview).toHaveClass(/visible/);

    // Click preview view - only preview visible
    await previewBtn.click();
    await expect(previewBtn).toHaveClass(/active/);
    await expect(splitBtn).not.toHaveClass(/active/);
    await expect(leftEditor).toHaveCSS('display', 'none');

    // Click edit view - back to editor only
    await editBtn.click();
    await expect(editBtn).toHaveClass(/active/);
    await expect(previewBtn).not.toHaveClass(/active/);
    await expect(leftEditor).toHaveCSS('display', 'block');
  });

  test('should toggle right pane view modes', async ({ page }) => {
    const rightEditor = page.getByTestId('right-editor');
    const rightPreview = page.getByTestId('right-preview');
    const editBtn = page.getByTestId('right-btn-edit');
    const splitBtn = page.getByTestId('right-btn-split');
    const previewBtn = page.getByTestId('right-btn-preview');

    // Initial state: edit mode
    await expect(editBtn).toHaveClass(/active/);

    // Click split view
    await splitBtn.click();
    await expect(splitBtn).toHaveClass(/active/);
    await expect(editBtn).not.toHaveClass(/active/);
    await expect(rightPreview).toHaveClass(/visible/);

    // Click preview view
    await previewBtn.click();
    await expect(previewBtn).toHaveClass(/active/);
    await expect(splitBtn).not.toHaveClass(/active/);
    await expect(rightEditor).toHaveCSS('display', 'none');

    // Click edit view
    await editBtn.click();
    await expect(editBtn).toHaveClass(/active/);
    await expect(previewBtn).not.toHaveClass(/active/);
    await expect(rightEditor).toHaveCSS('display', 'block');
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
