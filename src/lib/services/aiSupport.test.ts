import { beforeEach, describe, expect, it } from 'vitest';
import { createMockFileService } from './mockFileService';
import {
	AI_SUPPORT_COMMANDS,
	AI_SUPPORT_CONFIG_PATH,
	AI_SUPPORT_CONFIG_VERSION,
	AI_SUPPORT_CONTRACT_PATH,
	AI_SUPPORT_TEMPLATE_VERSION,
	AI_SUPPORT_COMMANDS_README_PATH,
	installAiSupport,
	readAiSupportStatus,
	reinstallAiSupport,
	upgradeAiSupport,
	type AiSupportConfig
} from './aiSupport';

describe('aiSupport service', () => {
	const mockFileService = createMockFileService();

	beforeEach(() => {
		mockFileService.reset();
		mockFileService.setVaultPath('/mock/vault');
	});

	function buildConfig(overrides: Partial<AiSupportConfig> = {}): AiSupportConfig {
		return {
			version: AI_SUPPORT_CONFIG_VERSION,
			templateVersion: AI_SUPPORT_TEMPLATE_VERSION,
			installedAt: '2026-03-15T10:00:00.000Z',
			updatedAt: '2026-03-15T10:00:00.000Z',
			commands: structuredClone(AI_SUPPORT_COMMANDS),
			...overrides
		};
	}

	async function seedManagedInstall(configOverrides: Partial<AiSupportConfig> = {}) {
		await mockFileService.writeFile(AI_SUPPORT_CONTRACT_PATH, '# Contract');
		await mockFileService.writeFile(
			AI_SUPPORT_CONFIG_PATH,
			JSON.stringify(buildConfig(configOverrides), null, 2)
		);
		await mockFileService.writeFile(AI_SUPPORT_COMMANDS_README_PATH, '# Commands');
	}

	it('reports not installed when no AI support files exist', async () => {
		const result = await readAiSupportStatus(mockFileService);

		expect(result.state).toBe('not installed');
		expect(result.templateVersion).toBeNull();
		expect(result.managedFiles.every((file) => !file.exists)).toBe(true);
	});

	it('reports installed when all managed files and current config exist', async () => {
		await seedManagedInstall();

		const result = await readAiSupportStatus(mockFileService);

		expect(result.state).toBe('installed');
		expect(result.templateVersion).toBe(AI_SUPPORT_TEMPLATE_VERSION);
		expect(result.issue).toBeNull();
	});

	it('reports outdated when config template version is older than bundled version', async () => {
		await seedManagedInstall({ templateVersion: AI_SUPPORT_TEMPLATE_VERSION - 1 });

		const result = await readAiSupportStatus(mockFileService);

		expect(result.state).toBe('outdated');
		expect(result.templateVersion).toBe(AI_SUPPORT_TEMPLATE_VERSION - 1);
	});

	it('reports invalid when managed files are partially missing', async () => {
		await mockFileService.writeFile(AI_SUPPORT_CONFIG_PATH, JSON.stringify(buildConfig(), null, 2));

		const result = await readAiSupportStatus(mockFileService);

		expect(result.state).toBe('invalid');
		expect(result.issue).toContain('missing or incomplete');
	});

	it('installs managed files without creating optional override files', async () => {
		const result = await installAiSupport(mockFileService);

		expect(result.state).toBe('installed');
		expect(await mockFileService.readFile(AI_SUPPORT_CONTRACT_PATH)).toContain('Editor AI Support Contract');
		expect(await mockFileService.readFile(AI_SUPPORT_COMMANDS_README_PATH)).toContain(
			'AI Command Overrides'
		);
		const config = JSON.parse(await mockFileService.readFile(AI_SUPPORT_CONFIG_PATH)) as AiSupportConfig;
		expect(config.version).toBe(AI_SUPPORT_CONFIG_VERSION);
		expect(config.templateVersion).toBe(AI_SUPPORT_TEMPLATE_VERSION);
		for (const commandId of Object.keys(AI_SUPPORT_COMMANDS) as Array<keyof typeof AI_SUPPORT_COMMANDS>) {
			expect(await mockFileService.exists(AI_SUPPORT_COMMANDS[commandId].overridePath)).toEqual({
				exists: false
			});
		}
	});

	it('upgrades managed files while preserving installedAt and optional overrides', async () => {
		await seedManagedInstall({
			templateVersion: AI_SUPPORT_TEMPLATE_VERSION - 1,
			installedAt: '2026-01-01T08:00:00.000Z'
		});
		await mockFileService.writeFile(
			AI_SUPPORT_COMMANDS['morning-standup'].overridePath,
			'# user override'
		);

		const result = await upgradeAiSupport(mockFileService);
		const config = JSON.parse(await mockFileService.readFile(AI_SUPPORT_CONFIG_PATH)) as AiSupportConfig;

		expect(result.state).toBe('installed');
		expect(config.installedAt).toBe('2026-01-01T08:00:00.000Z');
		expect(config.templateVersion).toBe(AI_SUPPORT_TEMPLATE_VERSION);
		expect(await mockFileService.readFile(AI_SUPPORT_COMMANDS['morning-standup'].overridePath)).toBe(
			'# user override'
		);
	});

	it('reinstalls invalid managed files without overwriting optional overrides', async () => {
		await mockFileService.writeFile(AI_SUPPORT_CONTRACT_PATH, '# broken');
		await mockFileService.writeFile(
			AI_SUPPORT_COMMANDS['morning-standup'].overridePath,
			'# keep me'
		);

		const result = await reinstallAiSupport(mockFileService);

		expect(result.state).toBe('installed');
		expect(await mockFileService.readFile(AI_SUPPORT_COMMANDS['morning-standup'].overridePath)).toBe(
			'# keep me'
		);
	});
});
