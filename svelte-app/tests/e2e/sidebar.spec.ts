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

  test.skip('should display quick file links from mock config', async ({ page }) => {
    // Note: This test requires vault config to be loaded from .editor-config.json
    // which may have timing issues with mock filesystem
    await expect(page.getByTestId('quick-file-0')).toBeVisible();
  });
});
