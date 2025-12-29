import { test, expect } from '@playwright/test';

test.describe('Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to initialize with mock vault
    await expect(page.getByTestId('app-container')).toBeVisible();
  });

  test('should display sidebar', async ({ page }) => {
    await expect(page.getByTestId('sidebar')).toBeVisible();
  });

  test('should display calendar widget', async ({ page }) => {
    await expect(page.getByTestId('calendar-widget')).toBeVisible();
  });

  test('should display quick links section', async ({ page }) => {
    await expect(page.getByTestId('quick-links-section')).toBeVisible();
    await expect(page.getByTestId('quick-links')).toBeVisible();
  });

  test('should display quick files section', async ({ page }) => {
    await expect(page.getByTestId('quick-files-section')).toBeVisible();
    await expect(page.getByTestId('quick-files')).toBeVisible();
  });

  test('should display sidebar tabs (Files/Search)', async ({ page }) => {
    await expect(page.getByTestId('sidebar-tabs')).toBeVisible();
    await expect(page.getByTestId('files-tab-button')).toBeVisible();
    await expect(page.getByTestId('search-tab-button')).toBeVisible();
  });

  test('should display file tree in Files tab by default', async ({ page }) => {
    await expect(page.getByTestId('files-tab-panel')).toBeVisible();
    await expect(page.getByTestId('file-tree-content')).toBeVisible();
  });

  test('should switch to Search tab when clicked', async ({ page }) => {
    await page.getByTestId('search-tab-button').click();

    await expect(page.getByTestId('search-tab-panel')).toBeVisible();
    await expect(page.getByTestId('tag-search')).toBeVisible();
    await expect(page.getByTestId('tag-search-input')).toBeVisible();
  });

  test('should switch back to Files tab', async ({ page }) => {
    // Switch to Search first
    await page.getByTestId('search-tab-button').click();
    await expect(page.getByTestId('search-tab-panel')).toBeVisible();

    // Switch back to Files
    await page.getByTestId('files-tab-button').click();
    await expect(page.getByTestId('files-tab-panel')).toBeVisible();
    await expect(page.getByTestId('file-tree-content')).toBeVisible();
  });
});

test.describe('Quick Links', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-container')).toBeVisible();
  });

  test('should show configure button on hover', async ({ page }) => {
    await page.getByTestId('quick-links-section').hover();
    await expect(page.getByTestId('configure-quick-links')).toBeVisible();
  });

  test('should open modal when configure clicked', async ({ page }) => {
    await page.getByTestId('quick-links-section').hover();
    await page.getByTestId('configure-quick-links').click();

    await expect(page.getByTestId('modal')).toBeVisible();
    await expect(page.getByTestId('links-editor')).toBeVisible();
  });

  test('should close modal when cancel clicked', async ({ page }) => {
    await page.getByTestId('quick-links-section').hover();
    await page.getByTestId('configure-quick-links').click();
    await expect(page.getByTestId('modal')).toBeVisible();

    await page.getByTestId('cancel-links').click();
    await expect(page.getByTestId('modal')).not.toBeVisible();
  });

  test('should close modal when close button clicked', async ({ page }) => {
    await page.getByTestId('quick-links-section').hover();
    await page.getByTestId('configure-quick-links').click();
    await expect(page.getByTestId('modal')).toBeVisible();

    await page.getByTestId('modal-close').click();
    await expect(page.getByTestId('modal')).not.toBeVisible();
  });

  test('should have add link button in modal', async ({ page }) => {
    await page.getByTestId('quick-links-section').hover();
    await page.getByTestId('configure-quick-links').click();

    await expect(page.getByTestId('add-link')).toBeVisible();
  });
});

test.describe('Quick Files', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-container')).toBeVisible();
  });

  test('should show configure button on hover', async ({ page }) => {
    await page.getByTestId('quick-files-section').hover();
    await expect(page.getByTestId('configure-quick-files')).toBeVisible();
  });

  test('should open modal when configure clicked', async ({ page }) => {
    await page.getByTestId('quick-files-section').hover();
    await page.getByTestId('configure-quick-files').click();

    await expect(page.getByTestId('modal')).toBeVisible();
    await expect(page.getByTestId('files-editor')).toBeVisible();
  });

  test('should display quick file links from mock config', async ({ page }) => {
    // Wait for quick files to load from .editor-config.json
    await expect(page.getByTestId('quick-file-0')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('quick-file-1')).toBeVisible();

    // Verify correct content from mock filesystem's .editor-config.json
    // Mock has: { name: 'README', path: 'README.md' }, { name: 'Notes', path: 'notes.md' }
    await expect(page.getByTestId('quick-file-0')).toHaveText('README');
    await expect(page.getByTestId('quick-file-1')).toHaveText('Notes');
  });
});

test.describe('Quick Links Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-container')).toBeVisible();
  });

  test('should load quick links from .editor-config.json', async ({ page }) => {
    // Wait for quick links to load from config
    await expect(page.getByTestId('quick-link-0')).toBeVisible({ timeout: 5000 });

    // Verify content from mock filesystem's .editor-config.json
    // Mock has: { name: 'Test Link', url: 'https://example.com' }
    await expect(page.getByTestId('quick-link-0')).toHaveText('Test Link');
  });

  test('should add and save new quick link', async ({ page }) => {
    // Open the configure modal
    await page.getByTestId('quick-links-section').hover();
    await page.getByTestId('configure-quick-links').click();
    await expect(page.getByTestId('modal')).toBeVisible();

    // Add a new link
    await page.getByTestId('add-link').click();

    // The new link row should appear - find the last one
    const linkRows = page.locator('[data-testid^="link-row-"]');
    const count = await linkRows.count();
    const lastIndex = count - 1;

    // Fill in the new link details
    await page.getByTestId(`link-name-${lastIndex}`).fill('New Test Link');
    await page.getByTestId(`link-url-${lastIndex}`).fill('https://newtest.example.com');

    // Save
    await page.getByTestId('save-links').click();
    await expect(page.getByTestId('modal')).not.toBeVisible();

    // Verify the new link appears in the UI after save
    await expect(page.getByTestId(`quick-link-${lastIndex}`)).toBeVisible();
    await expect(page.getByTestId(`quick-link-${lastIndex}`)).toHaveText('New Test Link');

    // Note: Cross-page persistence cannot be tested with mock filesystem
    // as it resets on page reload. Real persistence is verified by:
    // 1. saveVaultConfig() writes to .editor-config.json (tested in unit tests)
    // 2. loadVaultConfig() reads from .editor-config.json (tested above)
  });
});

test.describe('Quick Files Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-container')).toBeVisible();
  });

  test('should load quick files from .editor-config.json', async ({ page }) => {
    // Wait for quick files to load from config
    await expect(page.getByTestId('quick-file-0')).toBeVisible({ timeout: 5000 });

    // Verify content from mock filesystem
    await expect(page.getByTestId('quick-file-0')).toHaveText('README');
  });
});
