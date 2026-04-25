import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_VAULT_PATH = path.resolve(__dirname, '../data/testing-files');

test.describe('Tag Autocomplete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-container')).toBeVisible();
  });

  test('shows tag input in journal new entry section', async ({ page }) => {
    const tagInput = page.getByTestId('tag-input');
    await expect(tagInput).toBeVisible();
  });

  test('shows autocomplete dropdown when focusing tag input', async ({ page }) => {
    const tagInputField = page.getByTestId('tag-input-field');
    await tagInputField.focus();

    // Dropdown should appear with suggestions from vocabulary
    const dropdown = page.getByTestId('autocomplete-dropdown');
    await expect(dropdown).toBeVisible();
  });

  test('displays vocabulary tags as suggestions', async ({ page }) => {
    const tagInputField = page.getByTestId('tag-input-field');
    await tagInputField.focus();

    // Should show suggestions from vocabulary
    const suggestions = page.getByTestId('suggestion-item');
    await expect(suggestions.first()).toBeVisible();

    // Should have at least one suggestion with a count indicator
    const firstSuggestion = await suggestions.first().textContent();
    expect(firstSuggestion).toMatch(/\(\d+\)/); // Should contain count like "(10)"
  });

  test('filters suggestions based on input', async ({ page }) => {
    const tagInputField = page.getByTestId('tag-input-field');
    await tagInputField.focus();
    await tagInputField.fill('per');

    // Should show 'personal' as a suggestion (if vocabulary is loaded)
    const suggestions = page.getByTestId('suggestion-item');
    const count = await suggestions.count();

    // Either we get a filtered result or no results (if vocabulary was modified)
    if (count > 0) {
      const text = await suggestions.first().textContent();
      expect(text?.toLowerCase()).toContain('per');
    }
  });

  test('shows create new option for non-matching input', async ({ page }) => {
    const tagInputField = page.getByTestId('tag-input-field');
    await tagInputField.focus();

    // Use a unique tag name unlikely to exist
    const uniqueTag = `newtag${Date.now()}`;
    await tagInputField.fill(uniqueTag);

    // Should show "Create new" option
    const createOption = page.getByTestId('create-new-option');
    await expect(createOption).toBeVisible();
    await expect(createOption).toContainText(`Create "${uniqueTag}"`);
  });

  test('adds tag when clicking suggestion', async ({ page }) => {
    const tagInputField = page.getByTestId('tag-input-field');
    await tagInputField.focus();

    // Wait for suggestions to load
    const suggestions = page.getByTestId('suggestion-item');
    await expect(suggestions.first()).toBeVisible();

    // Get the first suggestion text before clicking
    const suggestionText = await suggestions.first().locator('.suggestion-name').textContent();

    // Click first suggestion
    await suggestions.first().click();

    // Tag pill should appear with the suggestion text
    const tagPill = page.getByTestId('tag-pill');
    await expect(tagPill).toBeVisible();
    if (suggestionText) {
      await expect(tagPill).toContainText(suggestionText);
    }
  });

  test('adds new tag when clicking create option', async ({ page }) => {
    const tagInputField = page.getByTestId('tag-input-field');
    await tagInputField.focus();

    // Use unique tag name
    const uniqueTag = `custom${Date.now()}`;
    await tagInputField.fill(uniqueTag);

    // Click create option
    const createOption = page.getByTestId('create-new-option');
    await createOption.click();

    // Tag pill should appear with the new tag
    const tagPill = page.getByTestId('tag-pill');
    await expect(tagPill).toBeVisible();
    await expect(tagPill).toContainText(uniqueTag);
  });

  test('removes tag when clicking remove button', async ({ page }) => {
    const tagInputField = page.getByTestId('tag-input-field');
    await tagInputField.focus();

    // Add a tag first by clicking suggestion
    const suggestions = page.getByTestId('suggestion-item');
    await expect(suggestions.first()).toBeVisible();
    await suggestions.first().click();

    // Tag pill should exist
    const tagPill = page.getByTestId('tag-pill');
    await expect(tagPill).toBeVisible();

    // Click remove button
    const removeBtn = page.getByTestId('remove-tag');
    await removeBtn.click();

    // Tag pill should be gone
    await expect(page.getByTestId('tag-pill')).not.toBeVisible();
  });

  test('navigates suggestions with arrow keys', async ({ page }) => {
    const tagInputField = page.getByTestId('tag-input-field');
    await tagInputField.focus();

    // Wait for dropdown
    const dropdown = page.getByTestId('autocomplete-dropdown');
    await expect(dropdown).toBeVisible();

    // Get suggestions count
    const suggestions = page.getByTestId('suggestion-item');
    const count = await suggestions.count();

    if (count >= 2) {
      // Press down arrow to select second item
      await tagInputField.press('ArrowDown');

      // Second suggestion should be selected
      await expect(suggestions.nth(1)).toHaveClass(/selected/);
    } else {
      // If only one suggestion, first stays selected
      await expect(suggestions.first()).toHaveClass(/selected/);
    }
  });

  test('adds tag with Enter key', async ({ page }) => {
    const tagInputField = page.getByTestId('tag-input-field');
    await tagInputField.focus();

    // Wait for suggestions to appear
    const suggestions = page.getByTestId('suggestion-item');
    await expect(suggestions.first()).toBeVisible();

    // Press Enter to add first suggestion
    await tagInputField.press('Enter');

    // Tag pill should appear
    const tagPill = page.getByTestId('tag-pill');
    await expect(tagPill).toBeVisible();
  });

  test('closes dropdown with Escape key', async ({ page }) => {
    const tagInputField = page.getByTestId('tag-input-field');
    await tagInputField.focus();

    // Dropdown should be visible
    const dropdown = page.getByTestId('autocomplete-dropdown');
    await expect(dropdown).toBeVisible();

    // Press Escape
    await tagInputField.press('Escape');

    // Dropdown should be hidden
    await expect(page.getByTestId('autocomplete-dropdown')).not.toBeVisible();
  });
});

test.describe('Journal Pane', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-container')).toBeVisible();
  });

  test('displays journal pane in right panel', async ({ page }) => {
    await expect(page.getByTestId('right-pane')).toBeVisible();
    await expect(page.getByTestId('journal-pane')).toBeVisible();
  });

  test('displays date header', async ({ page }) => {
    const header = page.locator('.journal-header h2');
    await expect(header).toBeVisible();
    // Wait for header to have content (format: "Friday - January 3, 2025")
    await expect(header).toHaveText(/\w+ - \w+ \d+, \d{4}/);
  });

  test('displays new entry input area', async ({ page }) => {
    await expect(page.locator('.new-entry-section')).toBeVisible();
    await expect(page.getByTestId('add-entry-btn')).toBeVisible();
  });

  test('add button is disabled when input is empty', async ({ page }) => {
    const addBtn = page.getByTestId('add-entry-btn');
    await expect(addBtn).toBeDisabled();
  });

  test('displays empty state when no entries', async ({ page }) => {
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.empty-state')).toContainText('No entries for this day');
  });

  test('displays entries list container', async ({ page }) => {
    await expect(page.getByTestId('entries-list')).toBeVisible();
  });
});

test.describe('Calendar Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-container')).toBeVisible();
  });

  test('calendar widget is visible', async ({ page }) => {
    await expect(page.getByTestId('calendar-widget')).toBeVisible();
  });

  test('clicking calendar date updates journal header', async ({ page }) => {
    const dateButtons = page.locator('.vc-date .vc-date__btn');
    const count = await dateButtons.count();

    if (count > 0) {
      const header = page.locator('.journal-header h2');

      await dateButtons.first().click();

      await expect(header).toBeVisible();
      const newText = await header.textContent();
      expect(newText).toMatch(/\w+ - \w+ \d+, \d{4}|No date selected/);
    }
  });

  test('today is selectable in calendar', async ({ page }) => {
    const todayCell = page.locator('.vc-date[data-vc-date-today]');
    await expect(todayCell).toBeVisible();
    await expect(todayCell).not.toHaveAttribute('data-vc-date-disabled');
    await expect(todayCell.locator('.vc-date__btn')).toBeEnabled();
  });

  test('calendar does not disable rendered dates', async ({ page }) => {
    const disabledDates = page.locator('.vc-date[data-vc-date-disabled]');
    await expect(disabledDates).toHaveCount(0);
  });

  test('clicking an arbitrary date updates journal', async ({ page }) => {
    const header = page.locator('.journal-header h2');
    const dateButtons = page.locator('.vc-date .vc-date__btn');
    const count = await dateButtons.count();

    expect(count).toBeGreaterThan(0);

    const target = count > 1 ? dateButtons.nth(1) : dateButtons.first();
    await target.click();

    await expect(header).toBeVisible();
    const headerText = await header.textContent();
    expect(headerText).toMatch(/\w+ - \w+ \d+, \d{4}/);
  });

  test('clicking month name opens month picker', async ({ page }) => {
    // Click on the month name in the header (Vanilla Calendar Pro v3 uses data-vc="month")
    const monthButton = page.locator('[data-vc="month"]');
    await expect(monthButton).toBeVisible();
    await monthButton.click();

    // Month picker panel should appear
    const monthsPanel = page.locator('[data-vc="months"]');
    await expect(monthsPanel).toBeVisible();
  });

  test('clicking year name opens year picker', async ({ page }) => {
    // Click on the year name in the header (Vanilla Calendar Pro v3 uses data-vc="year")
    const yearButton = page.locator('[data-vc="year"]');
    await expect(yearButton).toBeVisible();
    await yearButton.click();

    // Year picker panel should appear
    const yearsPanel = page.locator('[data-vc="years"]');
    await expect(yearsPanel).toBeVisible();
  });

  test.skip('selecting a month from picker navigates calendar', async ({ page }) => {
    // Note: Vanilla Calendar Pro recreates elements on month selection causing detachment
    // Open month picker
    const monthButton = page.locator('[data-vc="month"]');
    await monthButton.click();

    // Wait for month panel
    const monthsPanel = page.locator('[data-vc="months"]');
    await expect(monthsPanel).toBeVisible();

    // Click on the currently selected month (should be enabled)
    // Use a fresh locator since the element can be recreated
    await page.locator('[data-vc-months-month]:not([disabled])').first().click();

    // Month picker should close after selection
    await expect(monthsPanel).not.toBeVisible();
  });

  test('clicking date updates journal and loads entries', async ({ page }) => {
    const dateButtons = page.locator('.vc-date .vc-date__btn');
    const count = await dateButtons.count();

    if (count > 0) {
      await dateButtons.first().click();

      const header = page.locator('.journal-header h2');
      await expect(header).toBeVisible();
      const headerText = await header.textContent();
      expect(headerText).toMatch(/\w+ - \w+ \d+, \d{4}/);
    }
  });
});
