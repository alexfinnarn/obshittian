import { test, expect } from '@playwright/test';
import { cp, mkdtemp, readFile, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_VAULT_PATH = path.resolve(__dirname, '../data/testing-files');

test.describe('App Settings AI Support', () => {
	let tempVaultPath: string;

	test.beforeEach(async ({ page }) => {
		tempVaultPath = await mkdtemp(path.join(os.tmpdir(), 'editor-ai-support-'));
		await cp(TEST_VAULT_PATH, tempVaultPath, { recursive: true });

		await page.addInitScript((vaultPath: string) => {
			localStorage.setItem('vaultPath', vaultPath);
		}, tempVaultPath);

		await page.goto('/');
		await expect(page.getByTestId('app-container')).toBeVisible();
	});

	test.afterEach(async () => {
		await rm(tempVaultPath, { recursive: true, force: true });
	});

	test('installs AI support into the current vault through App Settings', async ({ page }) => {
		await page.getByTestId('open-app-settings').click();
		await expect(page.getByTestId('modal')).toBeVisible();
		await expect(page.getByTestId('ai-support-section')).toBeVisible();
		await expect(page.getByTestId('ai-support-state')).toContainText('not installed');

		await page.getByTestId('ai-support-action').click();

		await expect(page.getByTestId('ai-support-state')).toContainText('installed');
		await expect(page.getByText('AI support is up to date.')).toBeVisible();

		const configPath = path.join(tempVaultPath, '.editor-agent', 'config.json');
		const readmePath = path.join(tempVaultPath, '.editor-agent', 'commands', 'README.md');
		const contractPath = path.join(tempVaultPath, '.editor-agent', 'contract.md');

		const [configText, readmeText, contractText] = await Promise.all([
			readFile(configPath, 'utf-8'),
			readFile(readmePath, 'utf-8'),
			readFile(contractPath, 'utf-8')
		]);

		expect(JSON.parse(configText)).toEqual(
			expect.objectContaining({
				version: 1,
				templateVersion: 2
			})
		);
		expect(readmeText).toContain('/api/agent/journal/plan');
		expect(contractText).toContain('schedule-daily-tasks');
	});
});
