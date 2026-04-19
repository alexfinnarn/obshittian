import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/svelte';

const { addEntry, addTaskItem, loadNextTemplate, journalStore, vaultConfig } = vi.hoisted(() => ({
	addEntry: vi.fn(),
	addTaskItem: vi.fn(),
	loadNextTemplate: vi.fn(),
	journalStore: {
		selectedDate: new Date(2026, 2, 14, 12, 0, 0),
		entries: [] as Array<{ id: string; text: string; tags: string[]; order: number }>,
		taskItems: [] as Array<{
			id: string;
			taskId: string;
			text: string;
			status: 'pending' | 'in-progress' | 'completed';
			tags: string[];
			order: number;
			createdAt: string;
			updatedAt: string;
		}>,
		isLoading: false
	},
	vaultConfig: {
		dailyTasks: [] as Array<{ id: string; name: string; days: 'daily' }>
	}
}));

vi.mock('$lib/stores/journal.svelte', () => ({
	journalStore,
	getEntries: () => journalStore.entries,
	getTaskItemsByTaskId: (taskId: string) =>
		journalStore.taskItems.filter((item) => item.taskId === taskId),
	addEntry,
	addTaskItem
}));

vi.mock('$lib/stores/vaultConfig.svelte', () => ({
	vaultConfig
}));

vi.mock('$lib/types/dailyTasks', async () => {
	const actual = await vi.importActual<typeof import('$lib/types/dailyTasks')>(
		'$lib/types/dailyTasks'
	);
	return {
		...actual,
		loadNextTemplate
	};
});

vi.mock('./CodeMirrorEditor.svelte', async () => {
	const mock = await import('./__mocks__/CodeMirrorEditorMock.svelte');
	return { default: mock.default };
});

vi.mock('./JournalEntry.svelte', async () => {
	const mock = await import('./__mocks__/JournalEntryMock.svelte');
	return { default: mock.default };
});

vi.mock('./TaskItem.svelte', async () => {
	const mock = await import('./__mocks__/TaskItemDisplayMock.svelte');
	return { default: mock.default };
});

vi.mock('./DailyTasksConfigModal.svelte', async () => {
	const mock = await import('./__mocks__/EmptyStub.svelte');
	return { default: mock.default };
});

import JournalPane from './JournalPane.svelte';

function createEntry(id: string, text: string) {
	return {
		id,
		text,
		tags: [],
		order: 1,
		createdAt: '2026-03-14T10:00:00.000Z',
		updatedAt: '2026-03-14T10:00:00.000Z'
	};
}

function createTaskItem(id: string, taskId: string, order: number, text = 'Task item') {
	return {
		id,
		taskId,
		text,
		status: 'pending' as const,
		tags: [`#dt/${taskId}`],
		order,
		createdAt: '2026-03-14T10:00:00.000Z',
		updatedAt: '2026-03-14T10:00:00.000Z'
	};
}

describe('JournalPane', () => {
	beforeEach(() => {
		journalStore.selectedDate = new Date(2026, 2, 14, 12, 0, 0);
		journalStore.entries = [];
		journalStore.taskItems = [];
		journalStore.isLoading = false;
		vaultConfig.dailyTasks = [{ id: 'gym', name: 'Gym', days: 'daily' }];
		addEntry.mockReset().mockResolvedValue(null);
		addTaskItem.mockReset().mockResolvedValue(null);
		loadNextTemplate.mockReset().mockResolvedValue('');
	});

	afterEach(() => {
		cleanup();
	});

	it('keeps the All tab entry view and switches task tabs into task mode', async () => {
		journalStore.entries = [createEntry('entry-1', 'General note')];
		journalStore.taskItems = [createTaskItem('task-1', 'gym', 1, 'Warm up')];

		render(JournalPane);

		expect(screen.getByTestId('add-entry-btn')).toBeTruthy();
		expect(screen.getByTestId('entries-list')).toBeTruthy();
		expect(screen.getByTestId('journal-entry-entry-1').textContent).toBe('General note');

		await fireEvent.click(screen.getByTestId('task-tab-gym'));

		expect(screen.queryByTestId('add-entry-btn')).toBeNull();
		expect(screen.getByTestId('add-task-item-btn')).toBeTruthy();
		expect(screen.getByTestId('task-items-list')).toBeTruthy();
		expect(screen.getByTestId('task-item-task-1').textContent).toBe('Warm up');

		await fireEvent.click(screen.getByTestId('all-tasks-tab'));

		expect(screen.getByTestId('add-entry-btn')).toBeTruthy();
		expect(screen.getByTestId('journal-entry-entry-1').textContent).toBe('General note');
	});

	it('shows an empty task state and only creates the first task item on demand', async () => {
		loadNextTemplate.mockResolvedValue('Template body');

		render(JournalPane);

		await fireEvent.click(screen.getByTestId('task-tab-gym'));

		expect(screen.getByText('No task items yet. Click "Add Task Item" to create one.')).toBeTruthy();
		expect(addTaskItem).not.toHaveBeenCalled();

		await fireEvent.click(screen.getByTestId('add-task-item-btn'));

		expect(loadNextTemplate).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'gym', name: 'Gym' }),
			0
		);
		expect(addTaskItem).toHaveBeenCalledWith('gym', 'Template body', ['#dt/gym']);
	});

	it('uses the highest existing task order when selecting the next template', async () => {
		journalStore.taskItems = [
			createTaskItem('task-1', 'gym', 1, 'Warm up'),
			createTaskItem('task-2', 'gym', 3, 'Mobility')
		];

		render(JournalPane);

		await fireEvent.click(screen.getByTestId('task-tab-gym'));
		await fireEvent.click(screen.getByTestId('add-task-item-btn'));

		expect(loadNextTemplate).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'gym' }),
			3
		);
	});

	it('calls oncollapse when the collapse button is clicked', async () => {
		const oncollapse = vi.fn();

		render(JournalPane, { props: { oncollapse } });

		await fireEvent.click(screen.getByTestId('collapse-right-pane'));

		expect(oncollapse).toHaveBeenCalledTimes(1);
	});

	it('disables the collapse button when collapsing is not allowed', () => {
		render(JournalPane, { props: { oncollapse: vi.fn(), cancollapse: false } });

		expect(screen.getByTestId('collapse-right-pane').getAttribute('disabled')).not.toBeNull();
	});
});
