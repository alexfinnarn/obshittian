/**
 * Daily Tasks - Types and Helper Functions
 *
 * Daily tasks are recurring tasks that appear as tabs in the JournalPane.
 * Each task is defined by an id (e.g., "gym") and can appear on specific days.
 * The associated tag (#dt/gym) is derived from the id.
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
 * Derive the task tag from task id
 * @example getTaskTag('gym') => '#dt/gym'
 */
export function getTaskTag(taskId: string): string {
	return `${DAILY_TASK_PREFIX}${taskId}`;
}

/**
 * Check if a tag is a daily task tag
 */
export function isDailyTaskTag(tag: string): boolean {
	return tag.startsWith(DAILY_TASK_PREFIX);
}

/**
 * Extract task id from a daily task tag
 * @example extractTaskId('#dt/gym') => 'gym'
 */
export function extractTaskId(tag: string): string {
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
 * Create a new DailyTask with defaults
 */
export function createDailyTask(
	id: string,
	name: string,
	options?: Partial<Pick<DailyTask, 'days'>>
): DailyTask {
	return {
		id,
		name,
		days: options?.days ?? 'daily'
	};
}

/**
 * Stub for backwards compatibility - task completion is now derived from task item status
 * Will be replaced in phase 2
 */
export function getTaskEntryCount(
	_task: DailyTask,
	_entries: { tags: string[] }[]
): number {
	return 0;
}

/**
 * Stub for backwards compatibility - task completion is now derived from task item status
 * Will be replaced in phase 2
 */
export function isTaskComplete(
	_task: DailyTask,
	_entries: { tags: string[] }[]
): boolean {
	return false;
}

export async function loadNextTemplate(
	task: DailyTask,
	_currentEntryCount: number
): Promise<string> {
	const nextEntryNumber = _currentEntryCount + 1;
	const templatePath = getTemplatePathForEntry(
		getTaskTag(task.id),
		nextEntryNumber,
		nextEntryNumber
	);
	return await fileService.readFile(templatePath);
}

/**
 * Alias for backwards compatibility
 */
export function extractTaskName(tag: string): string {
	return extractTaskId(tag);
}

export function getTemplatePathForEntry(
	tag: string,
	entryNumber: number,
	targetCount: number
): string {
	const tagPath = tag.startsWith('#') ? tag.slice(1) : tag;
	const normalizedEntryNumber = Math.max(1, entryNumber);
	const templateNumber =
		targetCount > 0
			? Math.min(normalizedEntryNumber, targetCount)
			: normalizedEntryNumber;
	const paddedNum = String(templateNumber).padStart(2, '0');
	return `templates/tags/${tagPath}/${paddedNum}.md`;
}
