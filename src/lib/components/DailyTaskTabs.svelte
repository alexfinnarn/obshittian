<script lang="ts">
	import type { DailyTask } from '$lib/types/dailyTasks';
	import type { JournalEntry } from '$lib/types/journal';
	import { getTaskEntryCount, isTaskComplete } from '$lib/types/dailyTasks';

	interface Props {
		/** Entries for the selected date */
		entries: JournalEntry[];
		/** Daily tasks visible on selected date */
		tasks: DailyTask[];
		/** Currently active task ID (null = "All" view) */
		activeTaskId: string | null;
		/** Callback when a tab is selected */
		onselect: (taskId: string | null) => void;
		/** Callback to open config modal */
		onconfigure?: () => void;
	}

	let { entries, tasks, activeTaskId, onselect, onconfigure }: Props = $props();

	function getProgress(task: DailyTask): string {
		const count = getTaskEntryCount(task, entries);
		return `${count}/${task.targetCount}`;
	}
</script>

<div class="daily-task-tabs" data-testid="daily-task-tabs">
	<div class="tabs-container" role="tablist">
		<!-- All tab -->
		<button
			class="task-tab"
			class:active={activeTaskId === null}
			onclick={() => onselect(null)}
			role="tab"
			aria-selected={activeTaskId === null}
			data-testid="all-tasks-tab"
		>
			All
		</button>

		<!-- Task tabs -->
		{#each tasks as task (task.id)}
			{@const complete = isTaskComplete(task, entries)}
			<button
				class="task-tab"
				class:active={activeTaskId === task.id}
				class:complete
				onclick={() => onselect(task.id)}
				role="tab"
				aria-selected={activeTaskId === task.id}
				data-testid="task-tab-{task.id}"
			>
				<span class="completion-indicator" class:complete></span>
				<span class="task-name">{task.name}</span>
				<span class="task-progress">{getProgress(task)}</span>
			</button>
		{/each}
	</div>

	{#if onconfigure}
		<button
			class="configure-btn"
			onclick={onconfigure}
			title="Configure daily tasks"
			aria-label="Configure daily tasks"
			data-testid="configure-tasks-btn"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="12" cy="12" r="3"></circle>
				<path
					d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
				></path>
			</svg>
		</button>
	{/if}
</div>

<style>
	.daily-task-tabs {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		border-bottom: 1px solid var(--border-color, #333);
		background: var(--bg-color, #1e1e1e);
	}

	.tabs-container {
		display: flex;
		gap: 0.25rem;
		overflow-x: auto;
		flex: 1;
		scrollbar-width: thin;
	}

	.tabs-container::-webkit-scrollbar {
		height: 4px;
	}

	.tabs-container::-webkit-scrollbar-thumb {
		background: var(--border-color, #333);
		border-radius: 2px;
	}

	.task-tab {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.6rem;
		border: 1px solid var(--dt-pending-border);
		border-radius: 4px;
		background: var(--dt-pending-bg);
		color: var(--dt-pending-text);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
		transition:
			background 0.15s,
			border-color 0.15s,
			color 0.15s;
	}

	.task-tab:hover {
		background: var(--hover-bg, #3a3a3a);
		color: var(--text-color, #e0e0e0);
	}

	.task-tab.active {
		border-color: var(--accent-color, #3794ff);
		background: var(--bg-color, #1e1e1e);
		color: var(--text-color, #e0e0e0);
	}

	.task-tab.complete {
		border-color: var(--dt-complete-border);
		background: var(--dt-complete-bg);
		color: var(--dt-complete-text);
	}

	.task-tab.complete.active {
		border-color: var(--dt-complete-border);
	}

	.completion-indicator {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--dt-pending-text);
	}

	.completion-indicator.complete {
		background: var(--dt-complete-text);
	}

	.task-name {
		font-weight: 600;
	}

	.task-progress {
		font-size: 0.7rem;
		opacity: 0.8;
	}

	.configure-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--text-muted, #888);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
	}

	.configure-btn:hover {
		background: var(--hover-bg, #3a3a3a);
		color: var(--text-color, #e0e0e0);
	}
</style>
