<script lang="ts">
	import { journalStore, getEntries, addEntry } from '$lib/stores/journal.svelte';
	import JournalEntry from './JournalEntry.svelte';
	import CodeMirrorEditor from './CodeMirrorEditor.svelte';
	import TagInput from './TagInput.svelte';

	interface Props {
		/** Whether the pane can currently collapse */
		cancollapse?: boolean;
		/** Collapse callback */
		oncollapse?: () => void;
	}

	let { cancollapse = true, oncollapse }: Props = $props();

	let newEntryText = $state('');
	let newEntryTags = $state<string[]>([]);
	let isAdding = $state(false);

	function getCreatedAtTime(createdAt: string): number {
		const timestamp = Date.parse(createdAt);
		return Number.isNaN(timestamp) ? 0 : timestamp;
	}

	// Journal entries read better newest-first.
	const sortedEntries = $derived(
		[...getEntries()].sort((a, b) => {
			const createdAtDifference = getCreatedAtTime(b.createdAt) - getCreatedAtTime(a.createdAt);
			return createdAtDifference;
		})
	);

	function handleCollapseClick() {
		oncollapse?.();
	}

	function collapseButtonLabel(): string {
		return 'Collapse journal pane';
	}

	function formatDateHeader(date: Date | null): string {
		if (!date) return 'No date selected';

		const options: Intl.DateTimeFormatOptions = {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		};

		const formatted = date.toLocaleDateString('en-US', options);
		const parts = formatted.split(', ');
		if (parts.length >= 2) {
			return `${parts[0]} - ${parts.slice(1).join(', ')}`;
		}
		return formatted;
	}

	async function handleAddEntry() {
		const text = newEntryText.trim();
		if (!text || isAdding) return;

		isAdding = true;
		try {
			const entry = await addEntry(text, newEntryTags.length > 0 ? newEntryTags : undefined);
			if (entry) {
				newEntryText = '';
				newEntryTags = [];
			}
		} finally {
			isAdding = false;
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
		<div class="journal-header-main journal-writing-shell">
			{#if oncollapse}
				<button
					class="pane-collapse-button"
					onclick={handleCollapseClick}
					aria-label={collapseButtonLabel()}
					title={collapseButtonLabel()}
					data-testid="collapse-right-pane"
					disabled={!cancollapse}
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
						aria-hidden="true"
					>
						<path d="m9 18 6-6-6-6"></path>
					</svg>
				</button>
			{/if}
			<h2>{formatDateHeader(journalStore.selectedDate)}</h2>
		</div>
	</header>

	<div class="new-entry-section">
		<div class="journal-content-shell journal-writing-shell">
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
	</div>

	<div class="entries-list" data-testid="entries-list">
		<div class="journal-content-shell journal-reading-shell">
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
	</div>
</div>

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

	.journal-header-main {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
	}

	.journal-content-shell {
		width: min(100%, var(--content-measure));
		margin-inline: auto;
		min-width: 0;
	}

	.journal-reading-shell {
		--content-measure: 72ch;
	}

	.journal-writing-shell {
		--content-measure: 84ch;
	}

	.journal-header h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-color, #fff);
		min-width: 0;
	}

	.pane-collapse-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		flex-shrink: 0;
		border: 1px solid var(--border-color, #444);
		border-radius: 4px;
		background: transparent;
		color: var(--text-muted, #888);
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
	}

	.pane-collapse-button:hover:not(:disabled) {
		background: var(--hover-bg, #2a2a2a);
		color: var(--text-color, #fff);
	}

	.pane-collapse-button:disabled {
		opacity: 0.45;
		cursor: default;
	}

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
