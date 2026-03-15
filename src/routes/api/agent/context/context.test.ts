import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import yaml from 'js-yaml';
import { POST } from './+server';

describe('POST /api/agent/context', () => {
	const originalVaultPath = process.env.VAULT_PATH;
	let tempVaultPath: string | null = null;

	beforeEach(async () => {
		tempVaultPath = await mkdtemp(path.join(os.tmpdir(), 'editor-agent-context-'));
	});

	afterEach(async () => {
		if (tempVaultPath) {
			await rm(tempVaultPath, { recursive: true, force: true });
		}

		if (originalVaultPath === undefined) {
			delete process.env.VAULT_PATH;
		} else {
			process.env.VAULT_PATH = originalVaultPath;
		}
	});

	it('returns daily task context, journal data, and override content for a command', async () => {
		if (!tempVaultPath) throw new Error('Missing temp vault path');

		process.env.VAULT_PATH = tempVaultPath;
		await writeFile(
			path.join(tempVaultPath, '.editor-config.json'),
			JSON.stringify({
				dailyTasks: [
					{ id: 'gym', name: 'Gym', days: 'daily' },
					{ id: 'review', name: 'Review', days: ['monday'] }
				]
			})
		);
		await mkdir(path.join(tempVaultPath, '.editor-agent', 'commands'), { recursive: true });
		await writeFile(
			path.join(tempVaultPath, '.editor-agent', 'config.json'),
			JSON.stringify({
				version: 1,
				templateVersion: 2,
				installedAt: '2026-03-15T10:00:00.000Z',
				updatedAt: '2026-03-15T10:00:00.000Z',
				commands: {
					'schedule-daily-tasks': {
						overridePath: '.editor-agent/commands/schedule-daily-tasks.md'
					},
					'morning-standup': {
						overridePath: '.editor-agent/commands/morning-standup.md'
					},
					'evening-review': {
						overridePath: '.editor-agent/commands/evening-review.md'
					}
				}
			})
		);
		await writeFile(
			path.join(tempVaultPath, '.editor-agent', 'commands', 'schedule-daily-tasks.md'),
			'# override'
		);
		await mkdir(path.join(tempVaultPath, 'Daily', '2026', '03'), { recursive: true });
		await writeFile(
			path.join(tempVaultPath, 'Daily', '2026', '03', '2026-03-16.yaml'),
			yaml.dump({
				version: 3,
				entries: [],
				taskItems: [
					{
						id: 'task-1',
						taskId: 'gym',
						text: 'Warm up',
						status: 'pending',
						tags: ['#dt/gym'],
						order: 1,
						createdAt: '2026-03-16T09:00:00.000Z',
						updatedAt: '2026-03-16T09:00:00.000Z'
					}
				]
			})
		);

		const response = await POST({
			request: new Request('http://localhost/api/agent/context', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					date: '2026-03-16',
					commandId: 'schedule-daily-tasks',
					dailyNotesFolder: 'Daily'
				})
			})
		} as never);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.journalPath).toBe('Daily/2026/03/2026-03-16.yaml');
		expect(data.aiSupport.installed).toBe(true);
		expect(data.aiSupport.templateVersion).toBe(2);
		expect(data.override.content).toBe('# override');
		expect(data.dailyTasks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: 'gym', visibleOnDate: true, taskTag: '#dt/gym' }),
				expect.objectContaining({ id: 'review', visibleOnDate: true, taskTag: '#dt/review' })
			])
		);
		expect(data.journal.taskItems).toHaveLength(1);
	});
});
