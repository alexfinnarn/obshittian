<script lang="ts">
	import Modal from './Modal.svelte';
	import {
		aiSupportStore,
		refreshAiSupportStatus,
		runAiSupportAction
	} from '$lib/stores/aiSupport.svelte';
	import type { AiSupportInstallAction, AiSupportInstallState } from '$lib/services/aiSupport';

	interface Props {
		visible: boolean;
		onclose: () => void;
	}

	let { visible, onclose }: Props = $props();

	$effect(() => {
		if (visible) {
			void refreshAiSupportStatus();
		}
	});

	function getStateClass(state: AiSupportInstallState): string {
		return state.replace(' ', '-');
	}

	function getActionForState(state: AiSupportInstallState): AiSupportInstallAction | null {
		if (state === 'not installed') return 'install';
		if (state === 'outdated') return 'upgrade';
		if (state === 'invalid') return 'reinstall';
		return null;
	}

	function getActionLabel(action: AiSupportInstallAction): string {
		if (action === 'install') return 'Install';
		if (action === 'upgrade') return 'Upgrade';
		return 'Reinstall';
	}

	async function handleAction(action: AiSupportInstallAction) {
		await runAiSupportAction(action);
	}
</script>

<Modal {visible} title="App Settings" {onclose}>
	<section class="settings-section" data-testid="ai-support-section">
		<div class="section-heading">
			<div>
				<h3>AI Support</h3>
				<p class="section-description">
					Install vault-local AI support files under <code>.editor-agent/</code>.
				</p>
			</div>

			{#if aiSupportStore.report}
				<span
					class="status-badge {getStateClass(aiSupportStore.report.state)}"
					data-testid="ai-support-state"
				>
					{aiSupportStore.report.state}
				</span>
			{/if}
		</div>

		{#if aiSupportStore.isLoading}
			<p class="status-message" data-testid="ai-support-loading">Loading AI support status...</p>
		{:else if aiSupportStore.error}
			<p class="error-message" data-testid="ai-support-error">{aiSupportStore.error}</p>
		{/if}

		{#if aiSupportStore.report}
			<div class="status-grid">
				<div>
					<span class="label">Bundled template version</span>
					<span class="value">{aiSupportStore.report.bundledTemplateVersion}</span>
				</div>
				<div>
					<span class="label">Installed template version</span>
					<span class="value">{aiSupportStore.report.templateVersion ?? 'Not installed'}</span>
				</div>
			</div>

			{#if aiSupportStore.report.issue}
				<p class="issue-message" data-testid="ai-support-issue">{aiSupportStore.report.issue}</p>
			{/if}

			<div class="status-block">
				<h4>Managed files</h4>
				<ul class="path-list" data-testid="managed-files-list">
					{#each aiSupportStore.report.managedFiles as file}
						<li class="path-row">
							<code>{file.path}</code>
							<span class:file-missing={!file.exists}>
								{file.exists ? 'Present' : 'Missing'}
							</span>
						</li>
					{/each}
				</ul>
			</div>

			<div class="status-block">
				<h4>Command override locations</h4>
				<ul class="path-list" data-testid="override-files-list">
					{#each aiSupportStore.report.overrideFiles as file}
						<li class="path-row">
							<code>{file.path}</code>
							<span class="override-status" class:file-missing={!file.exists}>
								{file.exists ? 'Present' : 'Optional'}
							</span>
						</li>
					{/each}
				</ul>
			</div>

			<div class="actions" data-testid="ai-support-actions">
				{#if getActionForState(aiSupportStore.report.state)}
					{@const nextAction = getActionForState(aiSupportStore.report.state)}
					<button
						class="btn btn-primary"
						disabled={aiSupportStore.isApplying}
						onclick={() => handleAction(nextAction)}
						data-testid="ai-support-action"
					>
						{#if aiSupportStore.isApplying && aiSupportStore.lastAction === nextAction}
							Working...
						{:else}
							{getActionLabel(nextAction)}
						{/if}
					</button>
				{:else}
					<p class="status-message">AI support is up to date.</p>
				{/if}
			</div>
		{/if}
	</section>

	{#snippet footer()}
		<button class="btn btn-secondary" onclick={onclose} data-testid="close-app-settings">
			Close
		</button>
	{/snippet}
</Modal>

<style>
	.settings-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.section-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.section-heading h3,
	.status-block h4 {
		margin: 0;
	}

	.section-description {
		margin: 0.35rem 0 0;
		color: var(--text-muted, #888);
	}

	.status-badge {
		border-radius: 999px;
		padding: 0.25rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.status-badge.installed {
		background: rgba(64, 160, 43, 0.18);
		color: #a6e38c;
	}

	.status-badge.outdated,
	.status-badge.invalid {
		background: rgba(255, 170, 0, 0.18);
		color: #ffd27a;
	}

	.status-badge.not-installed {
		background: rgba(120, 120, 120, 0.2);
		color: var(--text-muted, #aaa);
	}

	.status-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.status-grid > div,
	.status-block {
		padding: 0.85rem;
		border: 1px solid var(--border-color, #444);
		border-radius: 6px;
		background: var(--input-bg, #1e1e1e);
	}

	.label {
		display: block;
		margin-bottom: 0.35rem;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted, #888);
	}

	.value {
		font-weight: 600;
	}

	.path-list {
		list-style: none;
		margin: 0.75rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.path-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		font-size: 0.875rem;
	}

	.path-row code {
		word-break: break-all;
	}

	.status-message,
	.issue-message,
	.error-message {
		margin: 0;
	}

	.issue-message {
		color: #ffd27a;
	}

	.error-message,
	.file-missing {
		color: #ff8a8a;
	}

	.actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}

	@media (max-width: 767px) {
		.section-heading,
		.path-row {
			flex-direction: column;
			align-items: flex-start;
		}

		.status-grid {
			grid-template-columns: 1fr;
		}

		.actions {
			justify-content: stretch;
		}

		.actions :global(button) {
			width: 100%;
		}
	}
</style>
