import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/svelte';

const { addEntry, journalStore } = vi.hoisted(() => ({
	addEntry: vi.fn(),
	journalStore: {
		selectedDate: new Date(2026, 2, 14, 12, 0, 0),
		entries: [] as Array<{
			id: string;
			text: string;
			tags: string[];
			createdAt: string;
			updatedAt: string;
		}>,
		isLoading: false
	}
}));

vi.mock('$lib/stores/journal.svelte', () => ({
	journalStore,
	getEntries: () => journalStore.entries,
	addEntry
}));

vi.mock('./CodeMirrorEditor.svelte', async () => {
	const mock = await import('./__mocks__/CodeMirrorEditorMock.svelte');
	return { default: mock.default };
});

vi.mock('./JournalEntry.svelte', async () => {
	const mock = await import('./__mocks__/JournalEntryMock.svelte');
	return { default: mock.default };
});

vi.mock('./TagInput.svelte', async () => {
	const mock = await import('./__mocks__/TagInputMock.svelte');
	return { default: mock.default };
});

import JournalPane from './JournalPane.svelte';

function createEntry(
	id: string,
	text: string,
	createdAt = '2026-03-14T10:00:00.000Z',
	updatedAt = createdAt
) {
	return {
		id,
		text,
		tags: [],
		createdAt,
		updatedAt
	};
}

describe('JournalPane', () => {
	beforeEach(() => {
		journalStore.selectedDate = new Date(2026, 2, 14, 12, 0, 0);
		journalStore.entries = [];
		journalStore.isLoading = false;
		addEntry.mockReset().mockResolvedValue(null);
	});

	afterEach(() => {
		cleanup();
	});

	it('renders the notes-only composer and entry list', () => {
		journalStore.entries = [createEntry('entry-1', 'General note')];

		render(JournalPane);

		expect(screen.getByTestId('add-entry-btn')).toBeTruthy();
		expect(screen.getByTestId('entries-list')).toBeTruthy();
		expect(screen.getByTestId('journal-entry-entry-1').textContent).toBe('General note');
	});

	it('renders journal entries newest first using createdAt rather than updatedAt', () => {
		journalStore.entries = [
			createEntry(
				'entry-older',
				'Older entry',
				'2026-03-14T09:00:00.000Z',
				'2026-03-14T15:00:00.000Z'
			),
			createEntry(
				'entry-newer',
				'Newer entry',
				'2026-03-14T12:00:00.000Z',
				'2026-03-14T12:30:00.000Z'
			)
		];

		render(JournalPane);

		const entries = screen.getAllByTestId(/journal-entry-/);
		expect(entries.map((entry) => entry.textContent)).toEqual(['Newer entry', 'Older entry']);
	});

	it('submits trimmed entry text with the current tags', async () => {
		addEntry.mockResolvedValue(createEntry('entry-1', 'Trimmed note'));

		render(JournalPane);

		await fireEvent.input(screen.getByTestId('tag-input-mock'), {
			target: { value: 'journal,personal' }
		});
		await fireEvent.input(screen.getByTestId('codemirror-editor-mock'), {
			target: { value: '  Trimmed note  ' }
		});
		await fireEvent.click(screen.getByTestId('add-entry-btn'));

		expect(addEntry).toHaveBeenCalledWith('Trimmed note', ['journal', 'personal']);
		expect((screen.getByTestId('codemirror-editor-mock') as HTMLTextAreaElement).value).toBe('');
		expect((screen.getByTestId('tag-input-mock') as HTMLInputElement).value).toBe('');
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
