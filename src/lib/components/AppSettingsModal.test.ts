import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import AppSettingsModal from './AppSettingsModal.svelte';
import type { AiSupportStatus } from '$lib/services/aiSupport';

const mocks = vi.hoisted(() => ({
	mockedStore: {
		report: null as AiSupportStatus | null,
		isLoading: false,
		isApplying: false,
		error: null,
		lastAction: null
	},
	refreshAiSupportStatus: vi.fn().mockResolvedValue(null),
	runAiSupportAction: vi.fn().mockResolvedValue(null)
}));

vi.mock('$lib/stores/aiSupport.svelte', () => ({
	aiSupportStore: mocks.mockedStore,
	refreshAiSupportStatus: mocks.refreshAiSupportStatus,
	runAiSupportAction: mocks.runAiSupportAction
}));

describe('AppSettingsModal', () => {
	beforeEach(() => {
		mocks.mockedStore.report = null;
		mocks.mockedStore.isLoading = false;
		mocks.mockedStore.isApplying = false;
		mocks.mockedStore.error = null;
		mocks.mockedStore.lastAction = null;
		mocks.refreshAiSupportStatus.mockClear();
		mocks.runAiSupportAction.mockClear();
	});

	it('loads AI support status when opened and renders installed details', () => {
		mocks.mockedStore.report = {
			state: 'installed',
			bundledTemplateVersion: 1,
			configVersion: 1,
			templateVersion: 1,
			managedFiles: [
				{ path: '.editor-agent/contract.md', exists: true, kind: 'file' },
				{ path: '.editor-agent/config.json', exists: true, kind: 'file' },
				{ path: '.editor-agent/commands/README.md', exists: true, kind: 'file' }
			],
			overrideFiles: [
				{
					commandId: 'morning-standup',
					path: '.editor-agent/commands/morning-standup.md',
					exists: false
				}
			],
			issue: null
		};

		render(AppSettingsModal, { props: { visible: true, onclose: vi.fn() } });

		expect(mocks.refreshAiSupportStatus).toHaveBeenCalled();
		expect(screen.getByText('App Settings')).toBeTruthy();
		expect(screen.getByText('AI Support')).toBeTruthy();
		expect(screen.getByTestId('ai-support-state').textContent).toContain('installed');
		expect(screen.getByText('.editor-agent/config.json')).toBeTruthy();
		expect(screen.getByText('.editor-agent/commands/morning-standup.md')).toBeTruthy();
		expect(screen.getByText('AI support is up to date.')).toBeTruthy();
	});

	it('runs install when AI support is not installed', async () => {
		mocks.mockedStore.report = {
			state: 'not installed',
			bundledTemplateVersion: 1,
			configVersion: null,
			templateVersion: null,
			managedFiles: [
				{ path: '.editor-agent/contract.md', exists: false },
				{ path: '.editor-agent/config.json', exists: false },
				{ path: '.editor-agent/commands/README.md', exists: false }
			],
			overrideFiles: [],
			issue: null
		};

		render(AppSettingsModal, { props: { visible: true, onclose: vi.fn() } });

		await fireEvent.click(screen.getByTestId('ai-support-action'));

		expect(mocks.runAiSupportAction).toHaveBeenCalledWith('install');
	});
});
