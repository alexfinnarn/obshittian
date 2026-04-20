import { fileService, type FileService } from '$lib/services/fileService';

export const AI_SUPPORT_ROOT = '.editor-agent';
export const AI_SUPPORT_CONTRACT_PATH = `${AI_SUPPORT_ROOT}/contract.md`;
export const AI_SUPPORT_CONFIG_PATH = `${AI_SUPPORT_ROOT}/config.json`;
export const AI_SUPPORT_COMMANDS_DIR = `${AI_SUPPORT_ROOT}/commands`;
export const AI_SUPPORT_COMMANDS_README_PATH = `${AI_SUPPORT_COMMANDS_DIR}/README.md`;
export const AI_SUPPORT_TEMPLATE_VERSION = 3;
export const AI_SUPPORT_CONFIG_VERSION = 1;

export type AiSupportCommandId = 'morning-standup' | 'evening-review';

export type AiSupportInstallState = 'not installed' | 'installed' | 'outdated' | 'invalid';
export type AiSupportInstallAction = 'install' | 'upgrade' | 'reinstall';

export interface AiSupportCommandConfig {
	overridePath: string;
}

export interface AiSupportConfig {
	version: number;
	templateVersion: number;
	installedAt: string;
	updatedAt: string;
	commands: Record<AiSupportCommandId, AiSupportCommandConfig>;
}

export interface AiSupportPathStatus {
	path: string;
	exists: boolean;
	kind?: 'file' | 'directory';
}

export interface AiSupportOverrideStatus extends AiSupportPathStatus {
	commandId: AiSupportCommandId;
}

export interface AiSupportStatus {
	state: AiSupportInstallState;
	bundledTemplateVersion: number;
	configVersion: number | null;
	templateVersion: number | null;
	managedFiles: AiSupportPathStatus[];
	overrideFiles: AiSupportOverrideStatus[];
	issue: string | null;
}

export const AI_SUPPORT_COMMANDS: Record<AiSupportCommandId, AiSupportCommandConfig> = {
	'morning-standup': {
		overridePath: `${AI_SUPPORT_COMMANDS_DIR}/morning-standup.md`
	},
	'evening-review': {
		overridePath: `${AI_SUPPORT_COMMANDS_DIR}/evening-review.md`
	}
};

export const AI_SUPPORT_MANAGED_FILE_PATHS = [
	AI_SUPPORT_CONTRACT_PATH,
	AI_SUPPORT_CONFIG_PATH,
	AI_SUPPORT_COMMANDS_README_PATH
] as const;

function createPathStatus(
	path: string,
	result: { exists: boolean; kind?: 'file' | 'directory' }
): AiSupportPathStatus {
	return {
		path,
		exists: result.exists,
		kind: result.kind
	};
}

function createOverrideStatus(
	commandId: AiSupportCommandId,
	result: { exists: boolean; kind?: 'file' | 'directory' }
): AiSupportOverrideStatus {
	return {
		commandId,
		path: AI_SUPPORT_COMMANDS[commandId].overridePath,
		exists: result.exists,
		kind: result.kind
	};
}

function getStatusWithIssue(
	state: AiSupportInstallState,
	managedFiles: AiSupportPathStatus[],
	overrideFiles: AiSupportOverrideStatus[],
	issue: string | null,
	config?: AiSupportConfig | null
): AiSupportStatus {
	return {
		state,
		bundledTemplateVersion: AI_SUPPORT_TEMPLATE_VERSION,
		configVersion: config?.version ?? null,
		templateVersion: config?.templateVersion ?? null,
		managedFiles,
		overrideFiles,
		issue
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function validateAiSupportConfig(raw: unknown): AiSupportConfig | null {
	if (!isRecord(raw)) return null;
	if (raw.version !== AI_SUPPORT_CONFIG_VERSION) return null;
	if (typeof raw.templateVersion !== 'number') return null;
	if (typeof raw.installedAt !== 'string' || typeof raw.updatedAt !== 'string') return null;
	if (!isRecord(raw.commands)) return null;

	for (const commandId of Object.keys(AI_SUPPORT_COMMANDS) as AiSupportCommandId[]) {
		const commandConfig = raw.commands[commandId];
		if (!isRecord(commandConfig) || commandConfig.overridePath !== AI_SUPPORT_COMMANDS[commandId].overridePath) {
			return null;
		}
	}

	return {
		version: raw.version,
		templateVersion: raw.templateVersion,
		installedAt: raw.installedAt,
		updatedAt: raw.updatedAt,
		commands: raw.commands as Record<AiSupportCommandId, AiSupportCommandConfig>
	};
}

async function tryReadAiSupportConfig(service: FileService): Promise<AiSupportConfig | null> {
	try {
		const rawText = await service.readFile(AI_SUPPORT_CONFIG_PATH);
		return validateAiSupportConfig(JSON.parse(rawText));
	} catch {
		return null;
	}
}

function buildContractMarkdown(): string {
	return `# Editor AI Support Contract

This directory is managed by the app.

Managed files:

- \`${AI_SUPPORT_CONTRACT_PATH}\`
- \`${AI_SUPPORT_CONFIG_PATH}\`
- \`${AI_SUPPORT_COMMANDS_README_PATH}\`

Optional user-owned command overrides:

- \`${AI_SUPPORT_COMMANDS['morning-standup'].overridePath}\`
- \`${AI_SUPPORT_COMMANDS['evening-review'].overridePath}\`

The app may install, upgrade, or reinstall managed files, but it must not overwrite optional override files.

Supported Codex commands:

- \`morning-standup\`
- \`evening-review\`

Command runtime endpoints:

- \`POST /api/agent/context\`
- \`POST /api/agent/journal/plan\`
- \`POST /api/agent/journal/apply\`

Recommended workflow:

1. Read \`/api/agent/context\` for the target date and command.
2. Build a change proposal for journal entries.
3. Preview the result with \`/api/agent/journal/plan\`.
4. Show the diff to the user.
5. Call \`/api/agent/journal/apply\` only after explicit confirmation.
`;
}

function buildCommandsReadme(): string {
	return `# AI Command Overrides

This folder is reserved for optional user-owned command overrides.

Supported override files:

- \`morning-standup.md\`
- \`evening-review.md\`

The app ships a bundled command package that targets the agent runtime endpoints:

- \`POST /api/agent/context\`
- \`POST /api/agent/journal/plan\`
- \`POST /api/agent/journal/apply\`

Override files are optional and are not created automatically.
`;
}

function buildAiSupportConfig(installedAt: string, updatedAt: string): AiSupportConfig {
	return {
		version: AI_SUPPORT_CONFIG_VERSION,
		templateVersion: AI_SUPPORT_TEMPLATE_VERSION,
		installedAt,
		updatedAt,
		commands: structuredClone(AI_SUPPORT_COMMANDS)
	};
}

async function getPathResult(
	path: string,
	service: FileService
): Promise<{ exists: boolean; kind?: 'file' | 'directory' }> {
	return await service.exists(path);
}

export async function readAiSupportStatus(service: FileService = fileService): Promise<AiSupportStatus> {
	const [rootResult, managedResults, overrideResults] = await Promise.all([
		getPathResult(AI_SUPPORT_ROOT, service),
		Promise.all(AI_SUPPORT_MANAGED_FILE_PATHS.map((path) => getPathResult(path, service))),
		Promise.all(
			(Object.keys(AI_SUPPORT_COMMANDS) as AiSupportCommandId[]).map((commandId) =>
				getPathResult(AI_SUPPORT_COMMANDS[commandId].overridePath, service)
			)
		)
	]);

	const managedFiles = AI_SUPPORT_MANAGED_FILE_PATHS.map((path, index) =>
		createPathStatus(path, managedResults[index])
	);
	const overrideFiles = (Object.keys(AI_SUPPORT_COMMANDS) as AiSupportCommandId[]).map(
		(commandId, index) => createOverrideStatus(commandId, overrideResults[index])
	);

	const anyManagedFileExists = managedFiles.some((file) => file.exists);
	const allManagedFilesExist = managedFiles.every((file) => file.exists && file.kind === 'file');

	if (!rootResult.exists && !anyManagedFileExists) {
		return getStatusWithIssue('not installed', managedFiles, overrideFiles, null);
	}

	if (rootResult.exists && rootResult.kind !== 'directory') {
		return getStatusWithIssue(
			'invalid',
			managedFiles,
			overrideFiles,
			'`.editor-agent` exists but is not a directory.'
		);
	}

	if (!allManagedFilesExist) {
		return getStatusWithIssue(
			'invalid',
			managedFiles,
			overrideFiles,
			'Managed AI support files are missing or incomplete.'
		);
	}

	const config = await tryReadAiSupportConfig(service);
	if (!config) {
		return getStatusWithIssue(
			'invalid',
			managedFiles,
			overrideFiles,
			'`.editor-agent/config.json` is unreadable or does not match the expected schema.'
		);
	}

	if (config.templateVersion < AI_SUPPORT_TEMPLATE_VERSION) {
		return getStatusWithIssue('outdated', managedFiles, overrideFiles, null, config);
	}

	return getStatusWithIssue('installed', managedFiles, overrideFiles, null, config);
}

async function writeManagedAiSupportFiles(
	action: AiSupportInstallAction,
	service: FileService = fileService
): Promise<AiSupportStatus> {
	const timestamp = new Date().toISOString();
	const existingConfig = await tryReadAiSupportConfig(service);
	const config = buildAiSupportConfig(existingConfig?.installedAt ?? timestamp, timestamp);

	const managedFiles = [
		[AI_SUPPORT_CONTRACT_PATH, buildContractMarkdown()],
		[AI_SUPPORT_CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`],
		[AI_SUPPORT_COMMANDS_README_PATH, buildCommandsReadme()]
	] as const;

	for (const [path, content] of managedFiles) {
		await service.writeFile(path, content);
	}

	return await readAiSupportStatus(service);
}

export async function installAiSupport(service: FileService = fileService): Promise<AiSupportStatus> {
	return await writeManagedAiSupportFiles('install', service);
}

export async function upgradeAiSupport(service: FileService = fileService): Promise<AiSupportStatus> {
	return await writeManagedAiSupportFiles('upgrade', service);
}

export async function reinstallAiSupport(service: FileService = fileService): Promise<AiSupportStatus> {
	return await writeManagedAiSupportFiles('reinstall', service);
}
