<script lang="ts">
	import {
		journalStore,
		getEntries,
		getTaskItemsByTaskId,
		addEntry,
		addTaskItem,
	} from '$lib/stores/journal.svelte';
	import { vaultConfig } from '$lib/stores/vaultConfig.svelte';
	import JournalEntry from './JournalEntry.svelte';
	import TaskItem from './TaskItem.svelte';
	import CodeMirrorEditor from './CodeMirrorEditor.svelte';
	import TagInput from './TagInput.svelte';
	import DailyTaskTabs from './DailyTaskTabs.svelte';
	import DailyTasksConfigModal from './DailyTasksConfigModal.svelte';
	import {
		isTaskVisibleOnDate,
		loadNextTemplate,
		getTaskTag,
		type DailyTask,
	} from '$lib/types/dailyTasks';

	let newEntryText = $state('');
	let newEntryTags = $state<string[]>([]);
	let isAdding = $state(false);
	let activeTaskId = $state<string | null>(null);
	let showConfigModal = $state(false);
	let isLoadingTemplate = $state(false);

	// Get entries sorted by order
	const sortedEntries = $derived([...getEntries()].sort((a, b) => a.order - b.order));

	// Get tasks visible on selected date
	const visibleTasks = $derived(
		journalStore.selectedDate
			? vaultConfig.dailyTasks.filter((task) =>
					isTaskVisibleOnDate(task, journalStore.selectedDate!)
				)
			: []
	);

	// Get active task (if any)
	const activeTask = $derived(
		activeTaskId ? visibleTasks.find((t) => t.id === activeTaskId) ?? null : null
	);

	// Task mode: true when a task tab is selected
	const isTaskMode = $derived(activeTaskId !== null);

	// Get task items for the active task
	const taskItemsForActiveTask = $derived(
		activeTaskId ? getTaskItemsByTaskId(activeTaskId) : []
	);

	// Sort task items by order
	const sortedTaskItems = $derived(
		[...taskItemsForActiveTask].sort((a, b) => a.order - b.order)
	);

	// Reset activeTaskId when date changes if task not visible on new date
	$effect(() => {
		if (activeTaskId && journalStore.selectedDate) {
			const stillVisible = visibleTasks.some((t) => t.id === activeTaskId);
			if (!stillVisible) {
				activeTaskId = null;
			}
		}
	});

	function handleTaskSelect(taskId: string | null) {
		activeTaskId = taskId;
		newEntryTags = [];
		newEntryText = '';
	}

	function openConfigModal() {
		showConfigModal = true;
	}

	function closeConfigModal() {
		showConfigModal = false;
	}

	function formatDateHeader(date: Date | null): string {
		if (!date) return 'No date selected';

		const options: Intl.DateTimeFormatOptions = {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		};

		const formatted = date.toLocaleDateString('en-US', options);
		const parts = formatted.split(', ');
		if (parts.length >= 2) {
			return `${parts[0]} - ${parts.slice(1).join(', ')}`;
		}
		return formatted;
	}

	// Handle journal entry creation (All tab)
	async function handleAddEntry() {
		const text = newEntryText.trim();
		if (!text || isAdding) return;

		isAdding = true;
		try {
			let tagsToAdd = [...newEntryTags];
			const taskTag = activeTask ? getTaskTag(activeTask.id) : null;
			if (taskTag && !tagsToAdd.includes(taskTag)) {
				tagsToAdd = [taskTag, ...tagsToAdd];
			}

			await addEntry(text, tagsToAdd.length > 0 ? tagsToAdd : undefined);
			newEntryText = '';
			newEntryTags = [];
		} finally {
			isAdding = false;
		}
	}

	// Handle task item creation (task tab)
	async function handleAddTaskItem() {
		if (!activeTask || !journalStore.selectedDate || isAdding) return;

		isAdding = true;
		isLoadingTemplate = true;

		try {
			const currentOrder =
				sortedTaskItems.length > 0 ? Math.max(...sortedTaskItems.map((item) => item.order)) : 0;
			let content = '';

			try {
				content = await loadNextTemplate(activeTask, currentOrder);
			} catch {
				content = '';
			}

			const taskTag = getTaskTag(activeTask.id);
			await addTaskItem(activeTask.id, content, [taskTag]);
		} catch (err) {
			console.error('Failed to add task item:', err);
		} finally {
			isAdding = false;
			isLoadingTemplate = false;
		}
	}

	function handleEditorChange(content: string) {
		newEntryText = content;
	}

	function handleTagsChange(tags: string[]) {
		newEntryTags = tags;
	}
</script>

<div class="journal-pane" data-testid="journal-pane">
	<header class="journal-header">
		<h2>{formatDateHeader(journalStore.selectedDate)}</h2>
	</header>

	<DailyTaskTabs
		taskItems={journalStore.taskItems}
		tasks={visibleTasks}
		activeTaskId={activeTaskId}
		onselect={handleTaskSelect}
		onconfigure={openConfigModal}
	/>

	{#if isTaskMode}
		<!-- Task Mode: Add Task Item Button -->
		<div class="task-add-section">
			<button
				class="add-btn"
				onclick={handleAddTaskItem}
				disabled={isAdding || isLoadingTemplate}
				data-testid="add-task-item-btn"
			>
				{isAdding || isLoadingTemplate ? 'Adding...' : '+ Add Task Item'}
			</button>
		</div>

		<!-- Task Items List -->
		<div class="task-items-list" data-testid="task-items-list">
			{#if journalStore.isLoading}
				<p class="loading-state">Loading...</p>
			{:else if sortedTaskItems.length === 0}
				<p class="empty-state">No task items yet. Click "Add Task Item" to create one.</p>
			{:else}
				{#each sortedTaskItems as item (item.id)}
					<TaskItem {item} />
				{/each}
			{/if}
		</div>
	{:else}
		<!-- All Tab: Entry Composer -->
		<div class="new-entry-section">
			<div class="new-entry-controls">
				<div class="tags-input-wrapper">
					<TagInput tags={newEntryTags} onchange={handleTagsChange} placeholder="Add tags..." />
				</div>
				<button
					class="add-btn"
					onclick={handleAddEntry}
					disabled={!newEntryText.trim() || isAdding}
					data-testid="add-entry-btn"
				>
					{isAdding ? 'Adding...' : 'Add Entry'}
				</button>
			</div>
			<div class="new-entry-editor">
				<CodeMirrorEditor content={newEntryText} onchange={handleEditorChange} />
			</div>
		</div>

		<!-- Journal Entries List -->
		<div class="entries-list" data-testid="entries-list">
			{#if journalStore.isLoading}
				<p class="loading-state">Loading entries...</p>
			{:else if sortedEntries.length === 0}
				<p class="empty-state">No entries for this day</p>
			{:else}
				{#each sortedEntries as entry (entry.id)}
					<JournalEntry {entry} />
				{/each}
			{/if}
		</div>
	{/if}
</div>

<DailyTasksConfigModal visible={showConfigModal} onclose={closeConfigModal} />

<style>
	.journal-pane {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--bg-primary, #1e1e1e);
	}

	.journal-header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border-color, #444);
		flex-shrink: 0;
	}

	.journal-header h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-color, #fff);
	}

	/* Task Add Section */
	.task-add-section {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border-color, #444);
		flex-shrink: 0;
	}

	/* Task Items List */
	.task-items-list {
		flex: 1;
		overflow-y: auto;
		padding: 0.75rem 1rem;
	}

	/* New Entry Section */
	.new-entry-section {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border-color, #444);
		flex-shrink: 0;
	}

	.new-entry-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.new-entry-editor {
		height: 80px;
		border: 1px solid var(--border-color, #444);
		border-radius: 4px;
		overflow: hidden;
		transition: height 0.2s ease, border-color 0.2s ease;
	}

	.new-entry-editor:focus-within {
		height: 250px;
		border-color: var(--accent-color, #0078d4);
	}

	.tags-input-wrapper {
		flex: 1;
		min-width: 150px;
	}

	.add-btn {
		background: var(--accent-color, #0078d4);
		border: none;
		color: white;
		padding: 0.375rem 0.75rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.75rem;
		font-weight: 500;
		transition: background 0.15s ease;
	}

	.add-btn:hover:not(:disabled) {
		background: var(--accent-color-hover, #006cbd);
	}

	.add-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Entries List */
	.entries-list {
		flex: 1;
		overflow-y: auto;
		padding: 0.75rem 1rem;
	}

	.empty-state,
	.loading-state {
		color: var(--text-muted, #666);
		font-size: 0.875rem;
		font-style: italic;
		margin: 0;
		text-align: center;
		padding: 2rem;
	}
</style>
