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
	createDailyTaskItem,
	createJournalEntry,
	JOURNAL_DATA_VERSION,
	type DailyTaskItem,
	type DailyTaskItemStatus,
	type JournalData,
	type JournalEntry
} from '$lib/types/journal';
import type { DailyTask, DayOfWeek } from '$lib/types/dailyTasks';
import {
	BadRequestError,
	getVaultRoot,
	validateAndResolvePath,
	VaultNotConfiguredError
} from './pathUtils';

const VAULT_CONFIG_PATH = '.editor-config.json';

interface VaultConfigFile {
	dailyTasks?: DailyTask[];
}

const DEFAULT_DAILY_NOTES_FOLDER = 'zzz_Daily Notes';

export interface AgentCommandContext {
	date: string;
	journalPath: string;
	dailyTasks: Array<
		DailyTask & {
			taskTag: string;
			visibleOnDate: boolean;
		}
	>;
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
	order?: number;
}

export interface TaskItemUpsert {
	id?: string;
	taskId: string;
	text: string;
	status?: DailyTaskItemStatus;
	tags?: string[];
	order?: number;
}

export interface JournalChangeRequest {
	date: string;
	dailyNotesFolder?: string;
	entryUpserts?: JournalEntryUpsert[];
	entryDeleteIds?: string[];
	taskItemUpserts?: TaskItemUpsert[];
	taskItemDeleteIds?: string[];
}

export interface JournalPlanSummary {
	fileAction: 'create' | 'update' | 'delete' | 'noop';
	entryAdds: number;
	entryUpdates: number;
	entryDeletes: number;
	taskItemAdds: number;
	taskItemUpdates: number;
	taskItemDeletes: number;
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
		order: entry.order ?? 1,
		createdAt: entry.createdAt ?? new Date().toISOString(),
		updatedAt: entry.updatedAt ?? entry.createdAt ?? new Date().toISOString()
	};
}

function normalizeTaskItem(item: Partial<DailyTaskItem>): DailyTaskItem {
	return {
		id: item.id ?? crypto.randomUUID(),
		taskId: item.taskId ?? '',
		text: item.text ?? '',
		status: item.status ?? 'pending',
		tags: item.tags ?? [],
		order: item.order ?? 1,
		createdAt: item.createdAt ?? new Date().toISOString(),
		updatedAt: item.updatedAt ?? item.createdAt ?? new Date().toISOString()
	};
}

function normalizeJournalData(data?: Partial<JournalData>): JournalData {
	return {
		version: JOURNAL_DATA_VERSION,
		entries: (data?.entries ?? []).map(normalizeJournalEntry).sort((a, b) => a.order - b.order),
		taskItems: (data?.taskItems ?? []).map(normalizeTaskItem).sort((a, b) => a.order - b.order)
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
		entries: [],
		taskItems: []
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

async function loadVaultConfig(): Promise<VaultConfigFile> {
	const text = await maybeReadFile(VAULT_CONFIG_PATH);
	if (!text) return {};

	try {
		return JSON.parse(text) as VaultConfigFile;
	} catch {
		return {};
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

function getTaskTag(taskId: string): string {
	return `#dt/${taskId}`;
}

const DAY_NAMES: DayOfWeek[] = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday'
];

function isTaskVisibleOnDate(task: DailyTask, date: Date): boolean {
	if (task.days === 'daily') return true;
	return task.days.includes(DAY_NAMES[date.getDay()]);
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

function validateTaskItemUpsert(input: TaskItemUpsert): void {
	if (typeof input.taskId !== 'string' || !input.taskId.trim()) {
		throw new BadRequestError('Task item upserts require a taskId.');
	}
	if (typeof input.text !== 'string') {
		throw new BadRequestError('Task item upserts require string text.');
	}
	if (input.tags && !Array.isArray(input.tags)) {
		throw new BadRequestError('Task item upsert tags must be an array when provided.');
	}
	if (input.status && !['pending', 'in-progress', 'completed'].includes(input.status)) {
		throw new BadRequestError('Task item status must be pending, in-progress, or completed.');
	}
}

function nextEntryOrder(entries: JournalEntry[]): number {
	return entries.length === 0 ? 1 : Math.max(...entries.map((entry) => entry.order)) + 1;
}

function nextTaskItemOrder(taskItems: DailyTaskItem[], taskId: string): number {
	const matching = taskItems.filter((item) => item.taskId === taskId);
	return matching.length === 0 ? 1 : Math.max(...matching.map((item) => item.order)) + 1;
}

function cloneJournalData(data: JournalData): JournalData {
	return {
		version: data.version,
		entries: data.entries.map((entry) => ({ ...entry, tags: [...entry.tags] })),
		taskItems: data.taskItems.map((item) => ({ ...item, tags: [...item.tags] }))
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
			previous.order !== entry.order ||
			JSON.stringify(previous.tags) !== JSON.stringify(entry.tags)
		);
	}).length;
}

function countTaskItemUpdates(before: DailyTaskItem[], after: DailyTaskItem[]): number {
	const beforeById = new Map(before.map((item) => [item.id, item]));
	return after.filter((item) => {
		const previous = beforeById.get(item.id);
		if (!previous) return false;
		return (
			previous.text !== item.text ||
			previous.order !== item.order ||
			previous.status !== item.status ||
			previous.taskId !== item.taskId ||
			JSON.stringify(previous.tags) !== JSON.stringify(item.tags)
		);
	}).length;
}

function buildSummary(before: JournalData, after: JournalData): JournalPlanSummary {
	const beforeEntryIds = new Set(before.entries.map((entry) => entry.id));
	const afterEntryIds = new Set(after.entries.map((entry) => entry.id));
	const beforeTaskIds = new Set(before.taskItems.map((item) => item.id));
	const afterTaskIds = new Set(after.taskItems.map((item) => item.id));

	const entryAdds = after.entries.filter((entry) => !beforeEntryIds.has(entry.id)).length;
	const entryDeletes = before.entries.filter((entry) => !afterEntryIds.has(entry.id)).length;
	const taskItemAdds = after.taskItems.filter((item) => !beforeTaskIds.has(item.id)).length;
	const taskItemDeletes = before.taskItems.filter((item) => !afterTaskIds.has(item.id)).length;
	const entryUpdates = countEntryUpdates(before.entries, after.entries);
	const taskItemUpdates = countTaskItemUpdates(before.taskItems, after.taskItems);

	const beforeHasContent = before.entries.length > 0 || before.taskItems.length > 0;
	const afterHasContent = after.entries.length > 0 || after.taskItems.length > 0;

	let fileAction: JournalPlanSummary['fileAction'] = 'noop';
	if (!beforeHasContent && afterHasContent) fileAction = 'create';
	else if (beforeHasContent && !afterHasContent) fileAction = 'delete';
	else if (
		entryAdds > 0 ||
		entryDeletes > 0 ||
		entryUpdates > 0 ||
		taskItemAdds > 0 ||
		taskItemDeletes > 0 ||
		taskItemUpdates > 0
	) {
		fileAction = 'update';
	}

	return {
		fileAction,
		entryAdds,
		entryUpdates,
		entryDeletes,
		taskItemAdds,
		taskItemUpdates,
		taskItemDeletes
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
			existing.order = upsert.order ?? existing.order;
			existing.updatedAt = new Date().toISOString();
		} else {
			const entry = createJournalEntry(
				upsert.text,
				upsert.tags ?? [],
				upsert.order ?? nextEntryOrder(next.entries)
			);
			next.entries = [...next.entries, entry];
		}
	}

	next.entries.sort((a, b) => a.order - b.order);
	return next;
}

function applyTaskItemChanges(base: JournalData, request: JournalChangeRequest): JournalData {
	const next = cloneJournalData(base);
	const deleteIds = request.taskItemDeleteIds ?? [];
	const upserts = request.taskItemUpserts ?? [];

	ensureKnownIds(next.taskItems, deleteIds, 'taskItemDeleteIds');
	next.taskItems = next.taskItems.filter((item) => !deleteIds.includes(item.id));

	for (const upsert of upserts) {
		validateTaskItemUpsert(upsert);
		if (upsert.id) {
			const existing = next.taskItems.find((item) => item.id === upsert.id);
			if (!existing) {
				throw new BadRequestError(`taskItemUpserts references unknown id: ${upsert.id}`);
			}
			existing.taskId = upsert.taskId;
			existing.text = upsert.text;
			existing.status = upsert.status ?? existing.status;
			existing.tags = upsert.tags ?? existing.tags;
			existing.order = upsert.order ?? existing.order;
			existing.updatedAt = new Date().toISOString();
		} else {
			const item = createDailyTaskItem(
				upsert.taskId,
				upsert.text,
				upsert.tags ?? [getTaskTag(upsert.taskId)],
				upsert.order ?? nextTaskItemOrder(next.taskItems, upsert.taskId)
			);
			item.status = upsert.status ?? item.status;
			next.taskItems = [...next.taskItems, item];
		}
	}

	next.taskItems.sort((a, b) => a.order - b.order);
	return next;
}

export async function buildAgentContext(
	dateString: string,
	commandId?: AiSupportCommandId,
	dailyNotesFolder = DEFAULT_DAILY_NOTES_FOLDER
): Promise<AgentCommandContext> {
	getVaultRoot();

	const parsedDate = parseDateString(dateString);
	const vaultConfig = await loadVaultConfig();
	const aiSupportConfig = await loadAiSupportConfig();
	const journal = await loadJournalDataForDate(dateString, dailyNotesFolder);

	return {
		date: dateString,
		journalPath: getJournalRelativePath(dateString, dailyNotesFolder),
		dailyTasks: (vaultConfig.dailyTasks ?? []).map((task) => ({
			...task,
			taskTag: getTaskTag(task.id),
			visibleOnDate: isTaskVisibleOnDate(task, parsedDate.date)
		})),
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
	const withEntryChanges = applyEntryChanges(currentData, request);
	const proposedData = applyTaskItemChanges(withEntryChanges, request);
	const journalPath = getJournalRelativePath(request.date, dailyNotesFolder);
	const beforeHasContent = currentData.entries.length > 0 || currentData.taskItems.length > 0;
	const afterHasContent = proposedData.entries.length > 0 || proposedData.taskItems.length > 0;
	const currentText = beforeHasContent ? serializeJournalData(currentData) : '';
	const proposedText = afterHasContent ? serializeJournalData(proposedData) : '';
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

	const hasContent = plan.proposedData.entries.length > 0 || plan.proposedData.taskItems.length > 0;
	if (!hasContent) {
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
	for (const upsert of body.taskItemUpserts ?? []) {
		validateTaskItemUpsert(upsert);
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
