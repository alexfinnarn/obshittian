<script lang="ts">
	import Modal from './Modal.svelte';
	import { vaultConfig, setDailyTasks } from '$lib/stores/vaultConfig.svelte';
	import {
		type DailyTask,
		type DayOfWeek,
		ALL_DAYS,
		DAILY_TASK_PREFIX
	} from '$lib/types/dailyTasks';

	interface Props {
		visible: boolean;
		onclose: () => void;
	}

	let { visible, onclose }: Props = $props();

	// Editing state - copy of tasks being edited
	let editingTasks = $state<EditingTask[]>([]);

	// Editing task with mutable days array
	interface EditingTask {
		id: string;
		name: string;
		targetCount: number;
		isDaily: boolean;
		days: DayOfWeek[];
	}

	// Short day labels for checkboxes
	const DAY_LABELS: Record<DayOfWeek, string> = {
		monday: 'Mon',
		tuesday: 'Tue',
		wednesday: 'Wed',
		thursday: 'Thu',
		friday: 'Fri',
		saturday: 'Sat',
		sunday: 'Sun'
	};

	// Initialize editing state when modal opens
	$effect(() => {
		if (visible) {
			editingTasks = vaultConfig.dailyTasks.map((task) => ({
				id: task.id,
				name: task.name,
				targetCount: task.targetCount,
				isDaily: task.days === 'daily',
				days: task.days === 'daily' ? [...ALL_DAYS] : [...task.days]
			}));
		}
	});

	function addTask() {
		editingTasks = [
			...editingTasks,
			{
				id: '',
				name: '',
				targetCount: 1,
				isDaily: true,
				days: [...ALL_DAYS]
			}
		];
	}

	function removeTask(index: number) {
		editingTasks = editingTasks.filter((_, i) => i !== index);
	}

	function updateName(index: number, name: string) {
		editingTasks[index].name = name;
		// Auto-generate ID from name if ID is empty or was auto-generated
		const currentId = editingTasks[index].id;
		const autoId = name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
		if (!currentId || currentId === autoId.slice(0, -1) || !editingTasks[index].name) {
			editingTasks[index].id = autoId;
		}
	}

	function updateId(index: number, id: string) {
		// Sanitize ID: lowercase, alphanumeric and hyphens only
		editingTasks[index].id = id
			.toLowerCase()
			.replace(/[^a-z0-9-]+/g, '-')
			.replace(/^-|-$/g, '');
	}

	function updateTargetCount(index: number, count: number) {
		editingTasks[index].targetCount = Math.max(1, count);
	}

	function toggleDaily(index: number) {
		const task = editingTasks[index];
		task.isDaily = !task.isDaily;
		if (task.isDaily) {
			task.days = [...ALL_DAYS];
		}
	}

	function toggleDay(index: number, day: DayOfWeek) {
		const task = editingTasks[index];
		if (task.days.includes(day)) {
			task.days = task.days.filter((d) => d !== day);
		} else {
			task.days = [...task.days, day];
		}
		// If all days selected, switch to daily
		if (task.days.length === 7) {
			task.isDaily = true;
		} else {
			task.isDaily = false;
		}
	}

	async function saveTasks() {
		// Filter out invalid tasks (no name or id)
		const validTasks: DailyTask[] = editingTasks
			.filter((task) => task.name.trim() && task.id.trim())
			.map((task) => ({
				id: task.id,
				name: task.name.trim(),
				tag: `${DAILY_TASK_PREFIX}${task.id}`,
				targetCount: task.targetCount,
				days: task.isDaily ? 'daily' : task.days
			}));

		await setDailyTasks(validTasks);
		onclose();
	}

	function handleClose() {
		editingTasks = [];
		onclose();
	}
</script>

<Modal {visible} title="Configure Daily Tasks" onclose={handleClose}>
	<div class="tasks-editor" data-testid="tasks-editor">
		{#each editingTasks as task, i (i)}
			<div class="task-card" data-testid="task-card-{i}">
				<div class="task-header">
					<div class="task-inputs">
						<div class="input-group">
							<label for="task-name-{i}">Name</label>
							<input
								id="task-name-{i}"
								type="text"
								class="task-name"
								placeholder="Task name"
								value={task.name}
								oninput={(e) => updateName(i, e.currentTarget.value)}
								data-testid="task-name-{i}"
							/>
						</div>
						<div class="input-group">
							<label for="task-id-{i}">Tag ID</label>
							<div class="tag-input-wrapper">
								<span class="tag-prefix">#dt/</span>
								<input
									id="task-id-{i}"
									type="text"
									class="task-id"
									placeholder="task-id"
									value={task.id}
									oninput={(e) => updateId(i, e.currentTarget.value)}
									data-testid="task-id-{i}"
								/>
							</div>
						</div>
						<div class="input-group input-group-small">
							<label for="task-target-{i}">Target</label>
							<input
								id="task-target-{i}"
								type="number"
								class="task-target"
								min="1"
								value={task.targetCount}
								oninput={(e) => updateTargetCount(i, parseInt(e.currentTarget.value) || 1)}
								data-testid="task-target-{i}"
							/>
						</div>
					</div>
					<button
						class="task-delete"
						onclick={() => removeTask(i)}
						title="Delete task"
						data-testid="task-delete-{i}"
					>
						&times;
					</button>
				</div>

				<div class="days-row">
					<label class="daily-toggle">
						<input
							type="checkbox"
							checked={task.isDaily}
							onchange={() => toggleDaily(i)}
							data-testid="task-daily-{i}"
						/>
						<span>Daily</span>
					</label>
					<div class="day-checkboxes" class:disabled={task.isDaily}>
						{#each ALL_DAYS as day}
							<label class="day-checkbox">
								<input
									type="checkbox"
									checked={task.days.includes(day)}
									disabled={task.isDaily}
									onchange={() => toggleDay(i, day)}
									data-testid="task-day-{i}-{day}"
								/>
								<span>{DAY_LABELS[day]}</span>
							</label>
						{/each}
					</div>
				</div>
			</div>
		{/each}

		<button class="add-task-btn" onclick={addTask} data-testid="add-task">+ Add Task</button>
	</div>

	{#snippet footer()}
		<button class="btn btn-secondary" onclick={handleClose} data-testid="cancel-tasks">
			Cancel
		</button>
		<button class="btn btn-primary" onclick={saveTasks} data-testid="save-tasks"> Save </button>
	{/snippet}
</Modal>

<style>
	.tasks-editor {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-height: 60vh;
		overflow-y: auto;
	}

	.task-card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--input-bg, #1e1e1e);
		border: 1px solid var(--border-color, #444);
		border-radius: 6px;
	}

	.task-header {
		display: flex;
		gap: 0.5rem;
		align-items: flex-start;
	}

	.task-inputs {
		display: flex;
		gap: 0.75rem;
		flex: 1;
		flex-wrap: wrap;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		min-width: 120px;
	}

	.input-group-small {
		flex: 0 0 70px;
		min-width: 70px;
	}

	.input-group label {
		font-size: 0.7rem;
		color: var(--text-muted, #888);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.task-name,
	.task-id,
	.task-target {
		padding: 0.5rem;
		background: var(--bg-color, #1e1e1e);
		border: 1px solid var(--border-color, #555);
		border-radius: 4px;
		color: var(--text-color, #fff);
		font-size: 0.875rem;
	}

	.task-name:focus,
	.task-id:focus,
	.task-target:focus {
		outline: none;
		border-color: var(--accent-color, #0078d4);
	}

	.tag-input-wrapper {
		display: flex;
		align-items: center;
		background: var(--bg-color, #1e1e1e);
		border: 1px solid var(--border-color, #555);
		border-radius: 4px;
	}

	.tag-input-wrapper:focus-within {
		border-color: var(--accent-color, #0078d4);
	}

	.tag-prefix {
		padding: 0.5rem 0 0.5rem 0.5rem;
		color: var(--text-muted, #888);
		font-size: 0.875rem;
	}

	.tag-input-wrapper .task-id {
		border: none;
		background: transparent;
		padding-left: 0;
	}

	.tag-input-wrapper .task-id:focus {
		outline: none;
		border: none;
	}

	.task-target {
		width: 100%;
		text-align: center;
	}

	.task-delete {
		background: none;
		border: none;
		color: var(--text-muted, #888);
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		line-height: 1;
	}

	.task-delete:hover {
		color: var(--error-color, #f44);
		background: var(--hover-bg, #3a3a3a);
	}

	.days-row {
		display: flex;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.daily-toggle {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		cursor: pointer;
		font-size: 0.875rem;
		color: var(--text-color, #fff);
	}

	.daily-toggle input {
		cursor: pointer;
	}

	.day-checkboxes {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.day-checkboxes.disabled {
		opacity: 0.5;
	}

	.day-checkbox {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		cursor: pointer;
		font-size: 0.75rem;
		color: var(--text-muted, #888);
	}

	.day-checkbox input {
		cursor: pointer;
	}

	.day-checkbox input:checked + span {
		color: var(--text-color, #fff);
	}

	.add-task-btn {
		background: none;
		border: 1px dashed var(--border-color, #444);
		color: var(--text-muted, #888);
		padding: 0.75rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.add-task-btn:hover {
		border-color: var(--accent-color, #0078d4);
		color: var(--text-color, #fff);
	}

	/* Footer buttons */
	.btn {
		padding: 0.5rem 1rem;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		border: none;
	}

	.btn-secondary {
		background: var(--button-secondary-bg, #3a3a3a);
		color: var(--text-color, #fff);
	}

	.btn-secondary:hover {
		background: var(--button-secondary-hover, #444);
	}

	.btn-primary {
		background: var(--accent-color, #0078d4);
		color: white;
	}

	.btn-primary:hover {
		background: var(--accent-color-hover, #006cbd);
	}
</style>
