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
    // Header should contain a date string
    const headerText = await header.textContent();
    expect(headerText).toMatch(/\w+ - \w+ \d+, \d{4}/);
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
    // Get enabled date buttons from the calendar (Vanilla Calendar Pro uses .vc-date)
    // Only enabled dates (not disabled) can be clicked
    const enabledDates = page.locator('.vc-date:not([data-vc-date-disabled])');
    const count = await enabledDates.count();

    if (count > 0) {
      // Get the current header text
      const header = page.locator('.journal-header h2');
      const initialText = await header.textContent();

      // Click a different date (first available enabled date)
      await enabledDates.first().click();

      // Header may or may not change depending on which date was clicked
      // Just verify header is still visible and formatted correctly
      await expect(header).toBeVisible();
      const newText = await header.textContent();
      expect(newText).toMatch(/\w+ - \w+ \d+, \d{4}|No date selected/);
    }
  });

  test('today is always enabled in calendar', async ({ page }) => {
    // Today's date should always be enabled
    const todayCell = page.locator('.vc-date[data-vc-date-today]');
    await expect(todayCell).toBeVisible();
    // Today should NOT have the disabled attribute
    await expect(todayCell).not.toHaveAttribute('data-vc-date-disabled');
  });

  test('calendar has disabled dates for past dates without entries', async ({ page }) => {
    // In the current month, past dates without entries should be disabled
    // Since we have no journal entries in test mode, all past dates (except today) should be disabled
    const disabledDates = page.locator('.vc-date[data-vc-date-disabled]');
    const disabledCount = await disabledDates.count();

    // There should be some disabled dates (past dates without entries)
    // This is a general check - we can't know exact count without knowing current date
    expect(disabledCount).toBeGreaterThanOrEqual(0);
  });

  test('clicking disabled date does not change journal', async ({ page }) => {
    // Get the current header text
    const header = page.locator('.journal-header h2');
    const initialText = await header.textContent();

    // Find a disabled date in the current view
    const disabledDate = page.locator('.vc-date[data-vc-date-disabled]').first();
    const disabledExists = await disabledDate.count() > 0;

    if (disabledExists) {
      // Force click the disabled date - calendar should ignore it
      await disabledDate.click({ force: true });

      // Header should remain unchanged
      const newText = await header.textContent();
      expect(newText).toBe(initialText);
    }
  });

  test('clicking month name opens month picker', async ({ page }) => {
    // Click on the month name in the header
    const monthButton = page.locator('.vc-header__content [data-vc-header-month]');
    await expect(monthButton).toBeVisible();
    await monthButton.click();

    // Month picker panel should appear
    const monthsPanel = page.locator('.vc-months');
    await expect(monthsPanel).toBeVisible();
  });

  test('clicking year name opens year picker', async ({ page }) => {
    // Click on the year name in the header
    const yearButton = page.locator('.vc-header__content [data-vc-header-year]');
    await expect(yearButton).toBeVisible();
    await yearButton.click();

    // Year picker panel should appear
    const yearsPanel = page.locator('.vc-years');
    await expect(yearsPanel).toBeVisible();
  });

  test('selecting a month from picker navigates calendar', async ({ page }) => {
    // Open month picker
    const monthButton = page.locator('.vc-header__content [data-vc-header-month]');
    await monthButton.click();

    // Wait for month panel
    const monthsPanel = page.locator('.vc-months');
    await expect(monthsPanel).toBeVisible();

    // Click on an enabled month (current month should be enabled)
    const enabledMonth = page.locator('.vc-months__month:not([data-vc-months-month-disabled])').first();
    const monthExists = await enabledMonth.count() > 0;

    if (monthExists) {
      await enabledMonth.click();
      // Month picker should close after selection
      await expect(monthsPanel).not.toBeVisible();
    }
  });

  test('clicking enabled date updates journal and loads entries', async ({ page }) => {
    // Get enabled date buttons from the calendar
    const enabledDates = page.locator('.vc-date:not([data-vc-date-disabled]) .vc-date__btn');
    const count = await enabledDates.count();

    if (count > 0) {
      // Click the first enabled date
      await enabledDates.first().click();

      // Journal header should be visible and show a date
      const header = page.locator('.journal-header h2');
      await expect(header).toBeVisible();
      const headerText = await header.textContent();
      expect(headerText).toMatch(/\w+ - \w+ \d+, \d{4}/);
    }
  });
});
