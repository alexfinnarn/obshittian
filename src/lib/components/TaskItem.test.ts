import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/svelte';
import TaskItem from './TaskItem.svelte';

const {
	updateTaskItemText,
	updateTaskItemStatus,
	removeTaskItem
} = vi.hoisted(() => ({
	updateTaskItemText: vi.fn(),
	updateTaskItemStatus: vi.fn(),
	removeTaskItem: vi.fn()
}));

vi.mock('$lib/stores/journal.svelte', () => ({
	updateTaskItemText,
	updateTaskItemStatus,
	removeTaskItem
}));

describe('TaskItem', () => {
	beforeEach(() => {
		updateTaskItemText.mockReset().mockResolvedValue(true);
		updateTaskItemStatus.mockReset().mockResolvedValue(true);
		removeTaskItem.mockReset().mockResolvedValue(true);
	});

	afterEach(() => {
		cleanup();
	});

	it('keeps edit mode open when saving fails', async () => {
		updateTaskItemText.mockResolvedValue(false);

		render(TaskItem, {
			props: {
				item: {
					id: 'task-1',
					taskId: 'gym',
					text: 'Original task',
					status: 'pending',
					tags: ['#dt/gym'],
					order: 1,
					createdAt: '2026-03-14T10:00:00.000Z',
					updatedAt: '2026-03-14T10:00:00.000Z'
				}
			}
		});

		await fireEvent.click(screen.getByTestId('task-item-edit-btn-task-1'));

		const textarea = screen.getByTestId('task-item-edit-task-1');
		await fireEvent.input(textarea, { target: { value: 'Edited task' } });
		await fireEvent.click(screen.getByTestId('task-item-save-task-1'));

		expect(updateTaskItemText).toHaveBeenCalledWith('task-1', 'Edited task');
		expect(screen.getByTestId('task-item-edit-task-1')).toBeTruthy();
		expect(screen.getByDisplayValue('Edited task')).toBeTruthy();
		expect(screen.getByTestId('task-item-save-error-task-1').textContent).toBe(
			'Failed to save changes. Try again.'
		);
	});

	it('cycles status when the indicator is clicked', async () => {
		render(TaskItem, {
			props: {
				item: {
					id: 'task-2',
					taskId: 'gym',
					text: 'Warm up',
					status: 'pending',
					tags: ['#dt/gym'],
					order: 1,
					createdAt: '2026-03-14T10:00:00.000Z',
					updatedAt: '2026-03-14T10:00:00.000Z'
				}
			}
		});

		await fireEvent.click(screen.getByTestId('task-item-status-task-2'));

		expect(updateTaskItemStatus).toHaveBeenCalledWith('task-2', 'in-progress');
	});
});
