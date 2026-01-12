/**
 * Daily Tasks - Types and Helper Functions
 *
 * Daily tasks are recurring tasks that appear as tabs in the JournalPane.
 * Each task is defined by a tag (e.g., #dt/gym) and can appear on specific days.
 */

import { fileService } from '$lib/services/fileService';

export type DayOfWeek =
	| 'monday'
	| 'tuesday'
	| 'wednesday'
	| 'thursday'
	| 'friday'
	| 'saturday'
	| 'sunday';

export interface DailyTask {
	/** Unique identifier (e.g., "gym") */
	id: string;
	/** Display name for the tab (e.g., "Gym") */
	name: string;
	/** Full tag pattern (e.g., "#dt/gym") */
	tag: string;
	/** How many completions needed per day (default: 1) */
	targetCount: number;
	/** 'daily' for every day, or array of specific days */
	days: DayOfWeek[] | 'daily';
}

/** Tag prefix for daily tasks */
export const DAILY_TASK_PREFIX = '#dt/';

/** All days of the week */
export const ALL_DAYS: DayOfWeek[] = [
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
	'sunday'
];

/** Day names indexed by Date.getDay() (0 = Sunday) */
const DAY_NAMES: DayOfWeek[] = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday'
];

/**
 * Check if a tag is a daily task tag
 */
export function isDailyTaskTag(tag: string): boolean {
	return tag.startsWith(DAILY_TASK_PREFIX);
}

/**
 * Extract task name from a daily task tag
 * @example extractTaskName('#dt/gym') => 'gym'
 */
export function extractTaskName(tag: string): string {
	return tag.slice(DAILY_TASK_PREFIX.length);
}

/**
 * Create a daily task tag from a name
 * @example createDailyTaskTag('gym') => '#dt/gym'
 */
export function createDailyTaskTag(name: string): string {
	return `${DAILY_TASK_PREFIX}${name}`;
}

/**
 * Check if a task is visible on a given date
 */
export function isTaskVisibleOnDate(task: DailyTask, date: Date): boolean {
	if (task.days === 'daily') return true;
	const todayName = DAY_NAMES[date.getDay()];
	return task.days.includes(todayName);
}

/**
 * Get template path for a specific entry number
 * @example getTemplatePathForEntry('#dt/gym', 2, 3) => 'templates/tags/dt/gym/02.md'
 */
export function getTemplatePathForEntry(
	tag: string,
	entryNumber: number,
	targetCount: number
): string {
	const tagPath = tag.slice(1); // Remove leading #
	const templateNum = Math.min(entryNumber, targetCount); // Cap at targetCount
	const paddedNum = String(templateNum).padStart(2, '0');
	return `templates/tags/${tagPath}/${paddedNum}.md`;
}

/**
 * Load template content for a specific entry number
 */
export async function loadTemplateForEntry(
	task: DailyTask,
	entryNumber: number
): Promise<string> {
	const templatePath = getTemplatePathForEntry(task.tag, entryNumber, task.targetCount);
	return await fileService.readFile(templatePath);
}

/**
 * Load template for the next entry (based on current entry count)
 */
export async function loadNextTemplate(
	task: DailyTask,
	currentEntryCount: number
): Promise<string> {
	const nextEntryNumber = currentEntryCount + 1;
	return await loadTemplateForEntry(task, nextEntryNumber);
}

/**
 * Validate that all required templates exist for a task
 * @throws Error if any template is missing
 */
export async function validateTaskTemplates(tasks: DailyTask[]): Promise<void> {
	const missingTemplates: string[] = [];

	for (const task of tasks) {
		for (let i = 1; i <= task.targetCount; i++) {
			const templatePath = getTemplatePathForEntry(task.tag, i, task.targetCount);
			const existsResult = await fileService.exists(templatePath);
			if (!existsResult.exists) {
				missingTemplates.push(`${task.name}: ${templatePath}`);
			}
		}
	}

	if (missingTemplates.length > 0) {
		throw new Error(
			`Missing templates for daily tasks:\n${missingTemplates.join('\n')}`
		);
	}
}

/**
 * Create a new DailyTask with defaults
 */
export function createDailyTask(
	id: string,
	name: string,
	options?: Partial<Pick<DailyTask, 'targetCount' | 'days'>>
): DailyTask {
	return {
		id,
		name,
		tag: createDailyTaskTag(id),
		targetCount: options?.targetCount ?? 1,
		days: options?.days ?? 'daily'
	};
}

/**
 * Get the count of entries for a task on a given date
 */
export function getTaskEntryCount(
	task: DailyTask,
	entries: { tags: string[] }[]
): number {
	return entries.filter((entry) => entry.tags.includes(task.tag)).length;
}

/**
 * Check if a task is complete (entry count >= target count)
 */
export function isTaskComplete(
	task: DailyTask,
	entries: { tags: string[] }[]
): boolean {
	return getTaskEntryCount(task, entries) >= task.targetCount;
}
