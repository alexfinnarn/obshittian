import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import {
	AI_SUPPORT_COMMANDS,
	AI_SUPPORT_CONFIG_PATH,
	type AiSupportCommandId,
	type AiSupportConfig
} from '$lib/services/aiSupport';
import {
	createJournalEntry,
	JOURNAL_DATA_VERSION,
	type JournalData,
	type JournalEntry
} from '$lib/types/journal';
import {
	BadRequestError,
	getVaultRoot,
	validateAndResolvePath,
	VaultNotConfiguredError
} from './pathUtils';

const DEFAULT_DAILY_NOTES_FOLDER = 'zzz_Daily Notes';

export interface AgentCommandContext {
	date: string;
	journalPath: string;
	journal: JournalData;
	override: {
		commandId: AiSupportCommandId;
		path: string;
		content: string | null;
	} | null;
	aiSupport: {
		installed: boolean;
		templateVersion: number | null;
	};
}

export interface JournalEntryUpsert {
	id?: string;
	text: string;
	tags?: string[];
}

export interface JournalChangeRequest {
	date: string;
	dailyNotesFolder?: string;
	entryUpserts?: JournalEntryUpsert[];
	entryDeleteIds?: string[];
}

export interface JournalPlanSummary {
	fileAction: 'create' | 'update' | 'delete' | 'noop';
	entryAdds: number;
	entryUpdates: number;
	entryDeletes: number;
}

export interface JournalPlanResult {
	date: string;
	journalPath: string;
	hasChanges: boolean;
	diff: string;
	currentData: JournalData;
	proposedData: JournalData;
	summary: JournalPlanSummary;
}

interface ParsedDate {
	date: Date;
	year: string;
	month: string;
	day: string;
}

function parseDateString(value: string): ParsedDate {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) {
		throw new BadRequestError('Invalid date format. Expected YYYY-MM-DD.');
	}

	const [, year, month, day] = match;
	const parsed = new Date(Number(year), Number(month) - 1, Number(day));
	if (
		Number.isNaN(parsed.getTime()) ||
		parsed.getFullYear() !== Number(year) ||
		parsed.getMonth() !== Number(month) - 1 ||
		parsed.getDate() !== Number(day)
	) {
		throw new BadRequestError('Invalid calendar date.');
	}

	return { date: parsed, year, month, day };
}

function getJournalRelativePath(dateString: string, dailyNotesFolder: string): string {
	const { year, month, day } = parseDateString(dateString);
	return `${dailyNotesFolder}/${year}/${month}/${year}-${month}-${day}.yaml`;
}

function normalizeJournalEntry(entry: Partial<JournalEntry>): JournalEntry {
	return {
		id: entry.id ?? crypto.randomUUID(),
		text: entry.text ?? '',
		tags: entry.tags ?? [],
		createdAt: entry.createdAt ?? new Date().toISOString(),
		updatedAt: entry.updatedAt ?? entry.createdAt ?? new Date().toISOString()
	};
}

function normalizeJournalData(data?: Partial<JournalData>): JournalData {
	return {
		version: JOURNAL_DATA_VERSION,
		entries: (data?.entries ?? []).map(normalizeJournalEntry)
	};
}

function serializeJournalData(data: JournalData): string {
	return yaml.dump(data, {
		lineWidth: -1,
		quotingType: '"',
		forceQuotes: false
	});
}

function getEmptyJournalData(): JournalData {
	return {
		version: JOURNAL_DATA_VERSION,
		entries: []
	};
}

async function maybeReadFile(relativePath: string): Promise<string | null> {
	try {
		const resolved = validateAndResolvePath(relativePath);
		return await readFile(resolved, 'utf-8');
	} catch {
		return null;
	}
}

async function loadAiSupportConfig(): Promise<AiSupportConfig | null> {
	const text = await maybeReadFile(AI_SUPPORT_CONFIG_PATH);
	if (!text) return null;

	try {
		return JSON.parse(text) as AiSupportConfig;
	} catch {
		return null;
	}
}

async function loadJournalDataForDate(dateString: string, dailyNotesFolder: string): Promise<JournalData> {
	const relativePath = getJournalRelativePath(dateString, dailyNotesFolder);
	const text = await maybeReadFile(relativePath);
	if (!text) return getEmptyJournalData();

	try {
		return normalizeJournalData(yaml.load(text) as Partial<JournalData>);
	} catch {
		return getEmptyJournalData();
	}
}

async function readCommandOverride(
	commandId: AiSupportCommandId
): Promise<{ commandId: AiSupportCommandId; path: string; content: string | null }> {
	const overridePath = AI_SUPPORT_COMMANDS[commandId].overridePath;
	return {
		commandId,
		path: overridePath,
		content: await maybeReadFile(overridePath)
	};
}

function validateEntryUpsert(input: JournalEntryUpsert): void {
	if (typeof input.text !== 'string') {
		throw new BadRequestError('Entry upserts require string text.');
	}

	if (input.tags && !Array.isArray(input.tags)) {
		throw new BadRequestError('Entry upsert tags must be an array when provided.');
	}
}

function cloneJournalData(data: JournalData): JournalData {
	return {
		version: data.version,
		entries: data.entries.map((entry) => ({ ...entry, tags: [...entry.tags] }))
	};
}

function createLineDiff(oldText: string, newText: string, filePath: string): string {
	if (oldText === newText) {
		return `--- ${filePath}\n+++ ${filePath}\n`;
	}

	const oldLines = oldText === '' ? [] : oldText.split('\n');
	const newLines = newText === '' ? [] : newText.split('\n');
	const matrix = Array.from({ length: oldLines.length + 1 }, () =>
		Array<number>(newLines.length + 1).fill(0)
	);

	for (let i = oldLines.length - 1; i >= 0; i -= 1) {
		for (let j = newLines.length - 1; j >= 0; j -= 1) {
			matrix[i][j] =
				oldLines[i] === newLines[j]
					? matrix[i + 1][j + 1] + 1
					: Math.max(matrix[i + 1][j], matrix[i][j + 1]);
		}
	}

	const diffLines = [`--- ${filePath}`, `+++ ${filePath}`, '@@'];
	let i = 0;
	let j = 0;
	while (i < oldLines.length && j < newLines.length) {
		if (oldLines[i] === newLines[j]) {
			diffLines.push(` ${oldLines[i]}`);
			i += 1;
			j += 1;
			continue;
		}

		if (matrix[i + 1][j] >= matrix[i][j + 1]) {
			diffLines.push(`-${oldLines[i]}`);
			i += 1;
		} else {
			diffLines.push(`+${newLines[j]}`);
			j += 1;
		}
	}

	while (i < oldLines.length) {
		diffLines.push(`-${oldLines[i]}`);
		i += 1;
	}

	while (j < newLines.length) {
		diffLines.push(`+${newLines[j]}`);
		j += 1;
	}

	return diffLines.join('\n');
}

function countEntryUpdates(before: JournalEntry[], after: JournalEntry[]): number {
	const beforeById = new Map(before.map((entry) => [entry.id, entry]));
	return after.filter((entry) => {
		const previous = beforeById.get(entry.id);
		if (!previous) return false;
		return (
			previous.text !== entry.text ||
			JSON.stringify(previous.tags) !== JSON.stringify(entry.tags)
		);
	}).length;
}

function buildSummary(before: JournalData, after: JournalData): JournalPlanSummary {
	const beforeEntryIds = new Set(before.entries.map((entry) => entry.id));
	const afterEntryIds = new Set(after.entries.map((entry) => entry.id));

	const entryAdds = after.entries.filter((entry) => !beforeEntryIds.has(entry.id)).length;
	const entryDeletes = before.entries.filter((entry) => !afterEntryIds.has(entry.id)).length;
	const entryUpdates = countEntryUpdates(before.entries, after.entries);

	let fileAction: JournalPlanSummary['fileAction'] = 'noop';
	if (before.entries.length === 0 && after.entries.length > 0) fileAction = 'create';
	else if (before.entries.length > 0 && after.entries.length === 0) fileAction = 'delete';
	else if (entryAdds > 0 || entryDeletes > 0 || entryUpdates > 0) fileAction = 'update';

	return {
		fileAction,
		entryAdds,
		entryUpdates,
		entryDeletes
	};
}

function ensureKnownIds<T extends { id: string }>(items: T[], ids: string[], label: string): void {
	for (const id of ids) {
		if (!items.some((item) => item.id === id)) {
			throw new BadRequestError(`${label} references unknown id: ${id}`);
		}
	}
}

function applyEntryChanges(base: JournalData, request: JournalChangeRequest): JournalData {
	const next = cloneJournalData(base);
	const deleteIds = request.entryDeleteIds ?? [];
	const upserts = request.entryUpserts ?? [];

	ensureKnownIds(next.entries, deleteIds, 'entryDeleteIds');
	next.entries = next.entries.filter((entry) => !deleteIds.includes(entry.id));

	for (const upsert of upserts) {
		validateEntryUpsert(upsert);
		if (upsert.id) {
			const existing = next.entries.find((entry) => entry.id === upsert.id);
			if (!existing) {
				throw new BadRequestError(`entryUpserts references unknown id: ${upsert.id}`);
			}
			existing.text = upsert.text;
			existing.tags = upsert.tags ?? existing.tags;
			existing.updatedAt = new Date().toISOString();
		} else {
			const entry = createJournalEntry(upsert.text, upsert.tags ?? []);
			next.entries = [...next.entries, entry];
		}
	}

	return next;
}

export async function buildAgentContext(
	dateString: string,
	commandId?: AiSupportCommandId,
	dailyNotesFolder = DEFAULT_DAILY_NOTES_FOLDER
): Promise<AgentCommandContext> {
	getVaultRoot();
	parseDateString(dateString);

	const aiSupportConfig = await loadAiSupportConfig();
	const journal = await loadJournalDataForDate(dateString, dailyNotesFolder);

	return {
		date: dateString,
		journalPath: getJournalRelativePath(dateString, dailyNotesFolder),
		journal,
		override: commandId ? await readCommandOverride(commandId) : null,
		aiSupport: {
			installed: aiSupportConfig !== null,
			templateVersion: aiSupportConfig?.templateVersion ?? null
		}
	};
}

export async function planJournalChanges(request: JournalChangeRequest): Promise<JournalPlanResult> {
	getVaultRoot();

	const dailyNotesFolder = request.dailyNotesFolder ?? DEFAULT_DAILY_NOTES_FOLDER;
	const currentData = await loadJournalDataForDate(request.date, dailyNotesFolder);
	const proposedData = applyEntryChanges(currentData, request);
	const journalPath = getJournalRelativePath(request.date, dailyNotesFolder);
	const currentText = currentData.entries.length > 0 ? serializeJournalData(currentData) : '';
	const proposedText = proposedData.entries.length > 0 ? serializeJournalData(proposedData) : '';
	const diff = createLineDiff(currentText, proposedText, journalPath);
	const summary = buildSummary(currentData, proposedData);

	return {
		date: request.date,
		journalPath,
		hasChanges: currentText !== proposedText,
		diff,
		currentData,
		proposedData,
		summary
	};
}

export async function applyJournalChanges(request: JournalChangeRequest): Promise<JournalPlanResult> {
	const plan = await planJournalChanges(request);
	const resolvedPath = validateAndResolvePath(plan.journalPath);

	if (!plan.hasChanges) {
		return plan;
	}

	if (plan.proposedData.entries.length === 0) {
		try {
			await unlink(resolvedPath);
		} catch {
			// Nothing to delete.
		}
		return plan;
	}

	await mkdir(path.dirname(resolvedPath), { recursive: true });
	await writeFile(resolvedPath, serializeJournalData(plan.proposedData), 'utf-8');
	return plan;
}

export function validateAgentCommandId(value: string): value is AiSupportCommandId {
	return value in AI_SUPPORT_COMMANDS;
}

export function validateJournalChangeRequest(body: JournalChangeRequest): void {
	parseDateString(body.date);

	for (const upsert of body.entryUpserts ?? []) {
		validateEntryUpsert(upsert);
	}
}

export function ensureConfirmed(confirm: boolean): void {
	if (!confirm) {
		throw new BadRequestError('Journal apply requests require confirm=true.');
	}
}

export function ensureVaultConfigured(): void {
	if (!process.env.VAULT_PATH) {
		throw new VaultNotConfiguredError();
	}
}
