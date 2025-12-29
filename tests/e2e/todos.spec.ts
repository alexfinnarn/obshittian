import { test, expect } from '@playwright/test';

test.describe('Todo List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-container')).toBeVisible();
  });

  test('should display todo list in right pane', async ({ page }) => {
    const todoList = page.getByTestId('todo-list');
    await expect(todoList).toBeVisible();
  });

  test('should display todo input and add button', async ({ page }) => {
    await expect(page.getByTestId('todo-input')).toBeVisible();
    await expect(page.getByTestId('add-todo-btn')).toBeVisible();
  });

  test('should show empty message when no todos', async ({ page }) => {
    await expect(page.getByTestId('empty-message')).toBeVisible();
    await expect(page.getByTestId('empty-message')).toContainText('No todos yet');
  });

  test('should have disabled add button when input is empty', async ({ page }) => {
    const addBtn = page.getByTestId('add-todo-btn');
    await expect(addBtn).toBeDisabled();
  });

  test('should enable add button when input has text', async ({ page }) => {
    const input = page.getByTestId('todo-input');
    const addBtn = page.getByTestId('add-todo-btn');

    await input.fill('New task');
    await expect(addBtn).toBeEnabled();
  });

  test('should add a new todo when clicking add button', async ({ page }) => {
    const input = page.getByTestId('todo-input');
    const addBtn = page.getByTestId('add-todo-btn');

    await input.fill('Buy groceries');
    await addBtn.click();

    // Empty message should disappear
    await expect(page.getByTestId('empty-message')).not.toBeVisible();

    // Todo should appear in the list
    const todoItems = page.getByTestId('todo-items');
    await expect(todoItems).toContainText('Buy groceries');
  });

  test('should add a new todo when pressing Enter', async ({ page }) => {
    const input = page.getByTestId('todo-input');

    await input.fill('Call mom');
    await input.press('Enter');

    const todoItems = page.getByTestId('todo-items');
    await expect(todoItems).toContainText('Call mom');
  });

  test('should clear input after adding todo', async ({ page }) => {
    const input = page.getByTestId('todo-input');
    const addBtn = page.getByTestId('add-todo-btn');

    await input.fill('Test task');
    await addBtn.click();

    await expect(input).toHaveValue('');
  });

  test('should show status dropdown for new todo', async ({ page }) => {
    const input = page.getByTestId('todo-input');
    await input.fill('Task with status');
    await input.press('Enter');

    // Find the status dropdown
    const statusDropdowns = page.locator('[data-testid^="todo-status-"]');
    await expect(statusDropdowns.first()).toBeVisible();

    // Default status should be 'New'
    await expect(statusDropdowns.first()).toHaveValue('new');
  });

  test('should change todo status via dropdown', async ({ page }) => {
    // Add a todo first
    const input = page.getByTestId('todo-input');
    await input.fill('Update status task');
    await input.press('Enter');

    // Find and change the status
    const statusDropdown = page.locator('[data-testid^="todo-status-"]').first();
    await statusDropdown.selectOption('in-progress');

    await expect(statusDropdown).toHaveValue('in-progress');
  });

  test('should mark todo as complete', async ({ page }) => {
    // Enable show completed first so we can see the styling
    const toggle = page.getByTestId('show-completed-toggle');
    await toggle.click();

    // Add a todo
    const input = page.getByTestId('todo-input');
    await input.fill('Task to complete');
    await input.press('Enter');

    // Change status to complete
    const statusDropdown = page.locator('[data-testid^="todo-status-"]').first();
    await statusDropdown.selectOption('complete');

    // Todo should have completed styling (line-through)
    const todoItem = page.locator('[data-testid^="todo-item-"]').first();
    await expect(todoItem).toHaveClass(/completed/);
  });

  test('should hide completed todos by default', async ({ page }) => {
    // Add a todo and mark it complete
    const input = page.getByTestId('todo-input');
    await input.fill('Hide me');
    await input.press('Enter');

    const statusDropdown = page.locator('[data-testid^="todo-status-"]').first();
    await statusDropdown.selectOption('complete');

    // Completed todo should disappear (showCompleted is false by default)
    await expect(page.getByTestId('empty-message')).toBeVisible();
  });

  test('should show completed todos when toggle is checked', async ({ page }) => {
    // Add a todo and mark it complete
    const input = page.getByTestId('todo-input');
    await input.fill('Show me');
    await input.press('Enter');

    const statusDropdown = page.locator('[data-testid^="todo-status-"]').first();
    await statusDropdown.selectOption('complete');

    // Check the show completed toggle
    const toggle = page.getByTestId('show-completed-toggle');
    await toggle.click();

    // Completed todo should be visible again
    const todoItems = page.getByTestId('todo-items');
    await expect(todoItems).toContainText('Show me');
  });

  test('should delete todo when delete button clicked', async ({ page }) => {
    // Mock the confirm dialog
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('Delete this todo?');
      await dialog.accept();
    });

    // Add a todo
    const input = page.getByTestId('todo-input');
    await input.fill('Delete me');
    await input.press('Enter');

    // Click the delete button (hover to make it visible first)
    const todoItem = page.locator('[data-testid^="todo-item-"]').first();
    await todoItem.hover();

    const deleteBtn = page.locator('[data-testid^="todo-delete-"]').first();
    await deleteBtn.click();

    // Todo should be removed
    await expect(page.getByTestId('empty-message')).toBeVisible();
  });

  test('should cancel delete when dialog is dismissed', async ({ page }) => {
    // Mock the confirm dialog - reject it
    page.on('dialog', async (dialog) => {
      await dialog.dismiss();
    });

    // Add a todo
    const input = page.getByTestId('todo-input');
    await input.fill('Keep me');
    await input.press('Enter');

    // Try to delete
    const todoItem = page.locator('[data-testid^="todo-item-"]').first();
    await todoItem.hover();
    const deleteBtn = page.locator('[data-testid^="todo-delete-"]').first();
    await deleteBtn.click();

    // Todo should still be there
    const todoItems = page.getByTestId('todo-items');
    await expect(todoItems).toContainText('Keep me');
  });

  test('should edit todo text on double-click', async ({ page }) => {
    // Add a todo
    const input = page.getByTestId('todo-input');
    await input.fill('Original text');
    await input.press('Enter');

    // Double-click to edit
    const todoText = page.locator('[data-testid^="todo-text-"]').first();
    await todoText.dblclick();

    // Edit input should appear
    const editInput = page.getByTestId('todo-edit-input');
    await expect(editInput).toBeVisible();
    await expect(editInput).toHaveValue('Original text');
  });

  test('should save edited text on Enter', async ({ page }) => {
    // Add a todo
    const input = page.getByTestId('todo-input');
    await input.fill('Before edit');
    await input.press('Enter');

    // Double-click to edit
    const todoText = page.locator('[data-testid^="todo-text-"]').first();
    await todoText.dblclick();

    // Change the text
    const editInput = page.getByTestId('todo-edit-input');
    await editInput.clear();
    await editInput.fill('After edit');
    await editInput.press('Enter');

    // Should show updated text
    const todoItems = page.getByTestId('todo-items');
    await expect(todoItems).toContainText('After edit');
    await expect(todoItems).not.toContainText('Before edit');
  });

  test('should cancel edit on Escape', async ({ page }) => {
    // Add a todo
    const input = page.getByTestId('todo-input');
    await input.fill('Keep this text');
    await input.press('Enter');

    // Double-click to edit
    const todoText = page.locator('[data-testid^="todo-text-"]').first();
    await todoText.dblclick();

    // Start editing but cancel
    const editInput = page.getByTestId('todo-edit-input');
    await editInput.clear();
    await editInput.fill('Changed text');
    await editInput.press('Escape');

    // Should show original text
    const todoItems = page.getByTestId('todo-items');
    await expect(todoItems).toContainText('Keep this text');
  });

  test('should add multiple todos', async ({ page }) => {
    const input = page.getByTestId('todo-input');

    await input.fill('Task 1');
    await input.press('Enter');

    await input.fill('Task 2');
    await input.press('Enter');

    await input.fill('Task 3');
    await input.press('Enter');

    const todoItems = page.locator('[data-testid^="todo-item-"]');
    await expect(todoItems).toHaveCount(3);
  });

  test('should display all status options in dropdown', async ({ page }) => {
    // Add a todo
    const input = page.getByTestId('todo-input');
    await input.fill('Check statuses');
    await input.press('Enter');

    // Get the status dropdown options
    const statusDropdown = page.locator('[data-testid^="todo-status-"]').first();
    const options = statusDropdown.locator('option');

    await expect(options).toHaveCount(6);

    // Verify all status options are present
    const optionTexts = await options.allTextContents();
    expect(optionTexts).toContain('New');
    expect(optionTexts).toContain('Backlog');
    expect(optionTexts).toContain('Todo');
    expect(optionTexts).toContain('In Progress');
    expect(optionTexts).toContain('In Review');
    expect(optionTexts).toContain('Complete');
  });
});
