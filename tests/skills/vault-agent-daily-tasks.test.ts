import { describe, expect, it } from 'vitest';
import { readFile } from 'fs/promises';
import path from 'path';

const skillDir = path.resolve('docs/skills/vault-agent-daily-tasks');

describe('vault-agent daily tasks skill package', () => {
	it('includes the shared package file and all three command docs', async () => {
		const filenames = [
			'README.md',
			'schedule-daily-tasks.md',
			'morning-standup.md',
			'evening-review.md'
		];

		const contents = await Promise.all(
			filenames.map(async (filename) => {
				const fullPath = path.join(skillDir, filename);
				return await readFile(fullPath, 'utf-8');
			})
		);

		expect(contents[0]).toContain('POST /api/agent/context');
		expect(contents[0]).toContain('POST /api/agent/journal/plan');
		expect(contents[0]).toContain('POST /api/agent/journal/apply');
		expect(contents[1]).toContain('schedule-daily-tasks');
		expect(contents[2]).toContain('morning-standup');
		expect(contents[3]).toContain('evening-review');
	});
});
