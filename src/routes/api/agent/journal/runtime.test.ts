import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import yaml from 'js-yaml';
import { POST as APPLY } from './apply/+server';
import { POST as PLAN } from './plan/+server';

describe('agent journal runtime', () => {
	const originalVaultPath = process.env.VAULT_PATH;
	let tempVaultPath: string | null = null;

	beforeEach(async () => {
		tempVaultPath = await mkdtemp(path.join(os.tmpdir(), 'editor-agent-journal-'));
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

	it('plans journal changes as a diff without writing files', async () => {
		if (!tempVaultPath) throw new Error('Missing temp vault path');

		process.env.VAULT_PATH = tempVaultPath;
		await mkdir(path.join(tempVaultPath, 'Daily', '2026', '03'), { recursive: true });
		const journalPath = path.join(tempVaultPath, 'Daily', '2026', '03', '2026-03-15.yaml');
		await writeFile(
			journalPath,
			yaml.dump({
				version: 3,
				entries: [],
				taskItems: [
					{
						id: 'existing-task',
						taskId: 'gym',
						text: 'Warm up',
						status: 'pending',
						tags: ['#dt/gym'],
						order: 1,
						createdAt: '2026-03-15T08:00:00.000Z',
						updatedAt: '2026-03-15T08:00:00.000Z'
					}
				]
			})
		);
		const before = await readFile(journalPath, 'utf-8');

		const response = await PLAN({
			request: new Request('http://localhost/api/agent/journal/plan', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					date: '2026-03-15',
					dailyNotesFolder: 'Daily',
					entryUpserts: [
						{
							text: '## Standup\n\n- Focus on shipping phase 04',
							tags: ['standup']
						}
					],
					taskItemUpserts: [
						{
							taskId: 'gym',
							text: 'Lift',
							status: 'pending'
						}
					]
				})
			})
		} as never);
		const data = await response.json();
		const after = await readFile(journalPath, 'utf-8');

		expect(response.status).toBe(200);
		expect(data.hasChanges).toBe(true);
		expect(data.summary.fileAction).toBe('update');
		expect(data.summary.entryAdds).toBe(1);
		expect(data.summary.taskItemAdds).toBe(1);
		expect(data.diff).toContain('+++ Daily/2026/03/2026-03-15.yaml');
		expect(data.diff).toContain('Focus on shipping phase 04');
		expect(data.diff).toContain('Lift');
		expect(after).toBe(before);
	});

	it('applies planned changes only when confirm=true', async () => {
		if (!tempVaultPath) throw new Error('Missing temp vault path');

		process.env.VAULT_PATH = tempVaultPath;
		await mkdir(path.join(tempVaultPath, 'Daily', '2026', '03'), { recursive: true });
		const journalPath = path.join(tempVaultPath, 'Daily', '2026', '03', '2026-03-15.yaml');
		await writeFile(
			journalPath,
			yaml.dump({
				version: 3,
				entries: [],
				taskItems: []
			})
		);

		const rejected = await APPLY({
			request: new Request('http://localhost/api/agent/journal/apply', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					date: '2026-03-15',
					dailyNotesFolder: 'Daily',
					confirm: false,
					taskItemUpserts: [{ taskId: 'gym', text: 'Workout' }]
				})
			})
		} as never);
		expect(rejected.status).toBe(400);

		const accepted = await APPLY({
			request: new Request('http://localhost/api/agent/journal/apply', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					date: '2026-03-15',
					dailyNotesFolder: 'Daily',
					confirm: true,
					taskItemUpserts: [{ taskId: 'gym', text: 'Workout', tags: ['#dt/gym'] }]
				})
			})
		} as never);
		const data = await accepted.json();
		const saved = yaml.load(await readFile(journalPath, 'utf-8')) as {
			taskItems: Array<{ taskId: string; text: string; tags: string[] }>;
		};

		expect(accepted.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.summary.fileAction).toBe('create');
		expect(saved.taskItems).toHaveLength(1);
		expect(saved.taskItems[0]).toEqual(
			expect.objectContaining({
				taskId: 'gym',
				text: 'Workout',
				tags: ['#dt/gym']
			})
		);
	});

	it('returns 400 when a proposal references an unknown existing id', async () => {
		if (!tempVaultPath) throw new Error('Missing temp vault path');

		process.env.VAULT_PATH = tempVaultPath;

		const response = await PLAN({
			request: new Request('http://localhost/api/agent/journal/plan', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					date: '2026-03-15',
					dailyNotesFolder: 'Daily',
					taskItemDeleteIds: ['missing-id']
				})
			})
		} as never);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toContain('unknown id');
	});
});
