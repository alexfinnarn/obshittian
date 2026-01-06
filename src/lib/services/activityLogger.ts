/**
 * Activity logging service
 * Logs user activities to JSONL files for later analysis and reporting.
 * Logs are stored in _reports/logs/YYYY-MM-DD.jsonl
 */

import { fileService } from './fileService';
import {
	ACTIVITY_LOGS_DIR,
	type ActivityEventType,
	type ActivityLogEntry,
	type ActivityEventData,
} from '$lib/types/activity';

/**
 * Format a date as YYYY-MM-DD for log file naming
 */
function formatDateForPath(date: Date): string {
	return date.toISOString().split('T')[0];
}

/**
 * Get the log file path for a specific date
 */
export function getLogPath(date: Date): string {
	return `${ACTIVITY_LOGS_DIR}/${formatDateForPath(date)}.jsonl`;
}

/**
 * Ensure the logs directory exists
 */
async function ensureLogsDirectory(): Promise<void> {
	const result = await fileService.exists(ACTIVITY_LOGS_DIR);
	if (!result.exists) {
		// Create _reports first, then _reports/logs
		const reportsResult = await fileService.exists('_reports');
		if (!reportsResult.exists) {
			await fileService.createDirectory('_reports');
		}
		await fileService.createDirectory(ACTIVITY_LOGS_DIR);
	}
}

/**
 * Log an activity event.
 * This is fire-and-forget - errors are logged to console but don't propagate.
 */
export function logActivity<T extends ActivityEventData>(
	event: ActivityEventType,
	data: T
): void {
	// Fire and forget - don't await
	logActivityAsync(event, data).catch((err) => {
		console.error('Failed to log activity:', err);
	});
}

/**
 * Internal async implementation of activity logging
 */
async function logActivityAsync<T extends ActivityEventData>(
	event: ActivityEventType,
	data: T
): Promise<void> {
	// Check if vault is configured
	if (!fileService.getVaultPath()) {
		return; // Silently skip if no vault
	}

	const entry: ActivityLogEntry<T> = {
		ts: new Date().toISOString(),
		event,
		data,
	};

	const logPath = getLogPath(new Date());
	const line = JSON.stringify(entry);

	try {
		await ensureLogsDirectory();

		// Try to read existing content and append
		let existingContent = '';
		try {
			existingContent = await fileService.readFile(logPath);
		} catch {
			// File doesn't exist yet, that's fine
		}

		// Append new line (ensure newline separator)
		const newContent = existingContent
			? existingContent.trimEnd() + '\n' + line + '\n'
			: line + '\n';

		await fileService.writeFile(logPath, newContent);
	} catch (err) {
		// Re-throw for the caller to handle (caught in logActivity)
		throw err;
	}
}

/**
 * Read activities for a specific date
 */
export async function getActivities(date: Date): Promise<ActivityLogEntry[]> {
	const logPath = getLogPath(date);

	try {
		const content = await fileService.readFile(logPath);
		return parseJsonl(content);
	} catch {
		// File doesn't exist or can't be read
		return [];
	}
}

/**
 * Read activities for a date range (inclusive)
 */
export async function getActivitiesInRange(
	start: Date,
	end: Date
): Promise<ActivityLogEntry[]> {
	const activities: ActivityLogEntry[] = [];
	const current = new Date(start);
	current.setHours(0, 0, 0, 0);

	const endDate = new Date(end);
	endDate.setHours(23, 59, 59, 999);

	while (current <= endDate) {
		const dayActivities = await getActivities(current);
		activities.push(...dayActivities);
		current.setDate(current.getDate() + 1);
	}

	return activities;
}

/**
 * Parse JSONL content into activity entries
 */
function parseJsonl(content: string): ActivityLogEntry[] {
	const entries: ActivityLogEntry[] = [];
	const lines = content.split('\n').filter((line) => line.trim());

	for (const line of lines) {
		try {
			entries.push(JSON.parse(line));
		} catch {
			console.warn('Failed to parse activity log line:', line);
		}
	}

	return entries;
}

/**
 * Get all log files that exist in the logs directory
 */
export async function getLogDates(): Promise<Date[]> {
	try {
		const entries = await fileService.listDirectory(ACTIVITY_LOGS_DIR);
		return entries
			.filter((e) => e.kind === 'file' && e.name.endsWith('.jsonl'))
			.map((e) => {
				const dateStr = e.name.replace('.jsonl', '');
				return new Date(dateStr + 'T00:00:00');
			})
			.filter((d) => !isNaN(d.getTime()))
			.sort((a, b) => b.getTime() - a.getTime()); // Most recent first
	} catch {
		return [];
	}
}
