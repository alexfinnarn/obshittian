<script lang="ts">
	import type { DailyTaskItem, DailyTaskItemStatus } from '$lib/types/journal';
	import {
		updateTaskItemText,
		updateTaskItemStatus,
		removeTaskItem,
	} from '$lib/stores/journal.svelte';

	interface Props {
		item: DailyTaskItem;
	}

	let { item }: Props = $props();

	let isEditing = $state(false);
	let editText = $state('');
	let isSaving = $state(false);
	let saveError = $state<string | null>(null);

	const statusOrder: DailyTaskItemStatus[] = ['pending', 'in-progress', 'completed'];

	function getNextStatus(current: DailyTaskItemStatus): DailyTaskItemStatus {
		const idx = statusOrder.indexOf(current);
		return statusOrder[(idx + 1) % statusOrder.length];
	}

	async function handleStatusClick() {
		const nextStatus = getNextStatus(item.status);
		await updateTaskItemStatus(item.id, nextStatus);
	}

	function enterEditMode() {
		editText = item.text;
		saveError = null;
		isEditing = true;
	}

	async function handleSave() {
		if (isSaving) return;
		isSaving = true;
		try {
			if (editText !== item.text) {
				const saved = await updateTaskItemText(item.id, editText);
				if (!saved) {
					saveError = 'Failed to save changes. Try again.';
					return;
				}
			}
			saveError = null;
			isEditing = false;
		} finally {
			isSaving = false;
		}
	}

	function handleCancel() {
		isEditing = false;
		editText = item.text;
		saveError = null;
	}

	async function handleDelete(event: MouseEvent) {
		event.stopPropagation();
		if (confirm('Delete this task item?')) {
			await removeTaskItem(item.id);
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSave();
		} else if (event.key === 'Escape') {
			handleCancel();
		}
	}
</script>

<div
	class="task-item"
	class:editing={isEditing}
	class:completed={item.status === 'completed'}
	data-testid="task-item-{item.id}"
>
		{#if isEditing}
			<div class="edit-mode">
				<textarea
					class="edit-textarea"
					bind:value={editText}
					oninput={() => {
						saveError = null;
					}}
					onkeydown={handleKeyDown}
					placeholder="Task item text..."
					data-testid="task-item-edit-{item.id}"
				></textarea>
				{#if saveError}
					<p class="save-error" role="alert" data-testid="task-item-save-error-{item.id}">
						{saveError}
					</p>
				{/if}
				<div class="edit-actions">
					<button
						class="btn save"
					onclick={handleSave}
					disabled={isSaving}
					data-testid="task-item-save-{item.id}"
				>
					Save
				</button>
				<button
					class="btn cancel"
					onclick={handleCancel}
					data-testid="task-item-cancel-{item.id}"
				>
					Cancel
				</button>
			</div>
		</div>
	{:else}
		<button
			class="status-indicator"
			class:pending={item.status === 'pending'}
			class:in-progress={item.status === 'in-progress'}
			class:completed={item.status === 'completed'}
			onclick={handleStatusClick}
			title="Click to change status"
			data-testid="task-item-status-{item.id}"
		></button>
		<span class="item-text">{item.text || '(empty)'}</span>
		<div class="item-actions">
			<button
				class="btn icon"
				onclick={enterEditMode}
				title="Edit"
				data-testid="task-item-edit-btn-{item.id}"
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
					<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
					<path
						d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
					></path>
				</svg>
			</button>
			<button
				class="btn icon delete"
				onclick={handleDelete}
				title="Delete"
				data-testid="task-item-delete-{item.id}"
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
					<polyline points="3 6 5 6 21 6"></polyline>
					<path
						d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
					></path>
				</svg>
			</button>
		</div>
	{/if}
</div>

<style>
	.task-item {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.5rem;
		border: 1px solid var(--border-color, #444);
		border-radius: 4px;
		margin-bottom: 0.375rem;
		background: var(--bg-secondary, #252525);
		transition: border-color 0.2s ease, background 0.2s ease;
	}

	.task-item:hover {
		background: var(--hover-bg, #2a2a2a);
	}

	.task-item.completed .item-text {
		text-decoration: line-through;
		opacity: 0.6;
	}

	.task-item.editing {
		border-color: var(--accent-color, #0078d4);
		background: var(--bg-primary, #1e1e1e);
	}

	.status-indicator {
		flex-shrink: 0;
		width: 16px;
		height: 16px;
		border-radius: 4px;
		border: 2px solid;
		cursor: pointer;
		transition: all 0.15s ease;
		padding: 0;
		background: transparent;
	}

	.status-indicator.pending {
		border-color: var(--dt-pending-border, #555);
	}

	.status-indicator.in-progress {
		border-color: var(--accent-color, #3794ff);
		background: var(--accent-color, #3794ff);
	}

	.status-indicator.completed {
		border-color: var(--dt-complete-border, #4a9);
		background: var(--dt-complete-border, #4a9);
	}

	.status-indicator:hover {
		transform: scale(1.1);
	}

	.item-text {
		flex: 1;
		font-size: 0.85rem;
		color: var(--text-color, #e0e0e0);
		line-height: 1.4;
		word-break: break-word;
	}

	.item-actions {
		display: flex;
		gap: 0.25rem;
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.task-item:hover .item-actions {
		opacity: 1;
	}

	.btn.icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--text-muted, #888);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn.icon:hover {
		background: var(--hover-bg, #3a3a3a);
		color: var(--text-color, #e0e0e0);
	}

	.btn.icon.delete:hover {
		background: var(--error-color, #f44);
		color: white;
	}

	.edit-mode {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.edit-textarea {
		width: 100%;
		min-height: 60px;
		padding: 0.5rem;
		border: 1px solid var(--border-color, #444);
		border-radius: 4px;
		background: var(--input-bg, #1e1e1e);
		color: var(--text-color, #e0e0e0);
		font-size: 0.85rem;
		font-family: inherit;
		resize: vertical;
	}

	.edit-textarea:focus {
		outline: none;
		border-color: var(--accent-color, #0078d4);
	}

	.edit-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.save-error {
		margin: 0;
		font-size: 0.75rem;
		color: var(--error-color, #f44);
	}

	.btn {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn.save {
		background: var(--accent-color, #0078d4);
		border: none;
		color: white;
	}

	.btn.save:hover:not(:disabled) {
		background: var(--accent-color-hover, #006cbd);
	}

	.btn.save:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn.cancel {
		background: transparent;
		border: 1px solid var(--border-color, #444);
		color: var(--text-muted, #888);
	}

	.btn.cancel:hover {
		background: var(--hover-bg, #3a3a3a);
		color: var(--text-color, #e0e0e0);
	}
</style>
