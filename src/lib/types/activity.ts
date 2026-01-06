/**
 * Activity logging types and interfaces.
 * Activity logs are stored as JSONL files in _reports/logs/YYYY-MM-DD.jsonl
 */

/** All possible activity event types */
export type ActivityEventType =
	| 'file.opened'
	| 'file.saved'
	| 'file.created'
	| 'file.renamed'
	| 'file.deleted'
	| 'vault.opened'
	| 'dailynote.opened';

/** Base activity log entry */
export interface ActivityLogEntry<T = Record<string, unknown>> {
	/** ISO 8601 timestamp */
	ts: string;
	/** Event type */
	event: ActivityEventType;
	/** Event-specific data */
	data: T;
}

/** Data for file.opened events */
export interface FileOpenedData {
	path: string;
	source: 'tree' | 'tab' | 'quickfile' | 'search';
}

/** Data for file.saved events */
export interface FileSavedData {
	path: string;
	sizeBytes: number;
}

/** Data for file.created events */
export interface FileCreatedData {
	path: string;
	kind: 'file' | 'folder';
}

/** Data for file.renamed events */
export interface FileRenamedData {
	oldPath: string;
	newPath: string;
}

/** Data for file.deleted events */
export interface FileDeletedData {
	path: string;
	kind: 'file' | 'folder';
}

/** Data for vault.opened events */
export interface VaultOpenedData {
	path: string;
	source: 'manual' | 'restored';
}

/** Data for dailynote.opened events */
export interface DailyNoteOpenedData {
	date: string;
	wasCreated: boolean;
}

/** Union type for all event data */
export type ActivityEventData =
	| FileOpenedData
	| FileSavedData
	| FileCreatedData
	| FileRenamedData
	| FileDeletedData
	| VaultOpenedData
	| DailyNoteOpenedData;

/** Directory for activity logs within vault */
export const ACTIVITY_LOGS_DIR = '_reports/logs';

/** Directory for generated reports within vault */
export const ACTIVITY_REPORTS_DIR = '_reports';
