import { test, expect } from '@playwright/test';

/**
 * Vault Picker tests
 *
 * Note: In E2E test mode (VITE_E2E_TEST=true), the app auto-opens a mock vault,
 * so the vault picker is not normally visible. These tests verify the vault picker
 * behavior when running without test mode.
 */

test.describe('Vault Picker (non-test mode behavior)', () => {
  // These tests document expected behavior when NOT in test mode
  // They are skipped since our E2E tests run with VITE_E2E_TEST=true

  test.skip('should show vault picker when no vault is open', async ({ page }) => {
    // This would be visible if VITE_E2E_TEST was not set
    await page.goto('/');
    await expect(page.getByTestId('vault-picker')).toBeVisible();
  });

  test.skip('should have Open Folder button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('open-folder-btn')).toBeVisible();
  });
});

test.describe('App Initialization (test mode)', () => {
  test('should auto-open mock vault and show main app', async ({ page }) => {
    await page.goto('/');

    // In test mode, vault picker should NOT be visible
    await expect(page.getByTestId('vault-picker')).not.toBeVisible();

    // Main app container should be visible
    await expect(page.getByTestId('app-container')).toBeVisible();
  });

  test('should display sidebar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('sidebar')).toBeVisible();
  });

  test('should display editor area', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('editor-area')).toBeVisible();
  });

  test('should display both panes', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('left-pane')).toBeVisible();
    await expect(page.getByTestId('right-pane')).toBeVisible();
  });
});
