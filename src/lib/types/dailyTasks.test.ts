import { describe, it, expect } from 'vitest';
import {
	type DailyTask,
	type DayOfWeek,
	DAILY_TASK_PREFIX,
	ALL_DAYS,
	isDailyTaskTag,
	extractTaskName,
	createDailyTaskTag,
	isTaskVisibleOnDate,
	getTemplatePathForEntry,
	createDailyTask,
	getTaskEntryCount,
	isTaskComplete
} from './dailyTasks';

describe('dailyTasks', () => {
	describe('isDailyTaskTag', () => {
		it('returns true for tags with #dt/ prefix', () => {
			expect(isDailyTaskTag('#dt/gym')).toBe(true);
			expect(isDailyTaskTag('#dt/songs')).toBe(true);
			expect(isDailyTaskTag('#dt/morning-routine')).toBe(true);
		});

		it('returns false for tags without #dt/ prefix', () => {
			expect(isDailyTaskTag('#gym')).toBe(false);
			expect(isDailyTaskTag('gym')).toBe(false);
			expect(isDailyTaskTag('#daily/gym')).toBe(false);
		});
	});

	describe('extractTaskName', () => {
		it('extracts task name from tag', () => {
			expect(extractTaskName('#dt/gym')).toBe('gym');
			expect(extractTaskName('#dt/morning-routine')).toBe('morning-routine');
			expect(extractTaskName('#dt/songs')).toBe('songs');
		});
	});

	describe('createDailyTaskTag', () => {
		it('creates tag from name', () => {
			expect(createDailyTaskTag('gym')).toBe('#dt/gym');
			expect(createDailyTaskTag('morning-routine')).toBe('#dt/morning-routine');
		});
	});

	describe('isTaskVisibleOnDate', () => {
		const dailyTask: DailyTask = {
			id: 'gym',
			name: 'Gym',
			tag: '#dt/gym',
			targetCount: 1,
			days: 'daily'
		};

		const mondayWednesdayFridayTask: DailyTask = {
			id: 'gym',
			name: 'Gym',
			tag: '#dt/gym',
			targetCount: 1,
			days: ['monday', 'wednesday', 'friday']
		};

		const tuesdayTask: DailyTask = {
			id: 'yoga',
			name: 'Yoga',
			tag: '#dt/yoga',
			targetCount: 1,
			days: ['tuesday']
		};

		// Helper to create a date at noon local time to avoid timezone issues
		function createLocalDate(year: number, month: number, day: number): Date {
			return new Date(year, month - 1, day, 12, 0, 0);
		}

		it('returns true for daily tasks on any day', () => {
			// Test various days of the week
			// January 6, 2025 is a Monday
			expect(isTaskVisibleOnDate(dailyTask, createLocalDate(2025, 1, 6))).toBe(true);
			// January 7, 2025 is a Tuesday
			expect(isTaskVisibleOnDate(dailyTask, createLocalDate(2025, 1, 7))).toBe(true);
			// January 11, 2025 is a Saturday
			expect(isTaskVisibleOnDate(dailyTask, createLocalDate(2025, 1, 11))).toBe(true);
			// January 12, 2025 is a Sunday
			expect(isTaskVisibleOnDate(dailyTask, createLocalDate(2025, 1, 12))).toBe(true);
		});

		it('returns true for tasks on their specified days', () => {
			// January 6, 2025 is a Monday
			expect(isTaskVisibleOnDate(mondayWednesdayFridayTask, createLocalDate(2025, 1, 6))).toBe(true);
			// January 8, 2025 is a Wednesday
			expect(isTaskVisibleOnDate(mondayWednesdayFridayTask, createLocalDate(2025, 1, 8))).toBe(true);
			// January 10, 2025 is a Friday
			expect(isTaskVisibleOnDate(mondayWednesdayFridayTask, createLocalDate(2025, 1, 10))).toBe(true);
		});

		it('returns false for tasks on non-specified days', () => {
			// January 7, 2025 is a Tuesday
			expect(isTaskVisibleOnDate(mondayWednesdayFridayTask, createLocalDate(2025, 1, 7))).toBe(false);
			// January 9, 2025 is a Thursday
			expect(isTaskVisibleOnDate(mondayWednesdayFridayTask, createLocalDate(2025, 1, 9))).toBe(false);
			// January 11, 2025 is a Saturday
			expect(isTaskVisibleOnDate(mondayWednesdayFridayTask, createLocalDate(2025, 1, 11))).toBe(false);
		});

		it('handles single day tasks correctly', () => {
			// January 7, 2025 is a Tuesday
			expect(isTaskVisibleOnDate(tuesdayTask, createLocalDate(2025, 1, 7))).toBe(true);
			// January 6, 2025 is a Monday
			expect(isTaskVisibleOnDate(tuesdayTask, createLocalDate(2025, 1, 6))).toBe(false);
		});
	});

	describe('getTemplatePathForEntry', () => {
		it('generates correct path for first entry', () => {
			expect(getTemplatePathForEntry('#dt/gym', 1, 3)).toBe('templates/tags/dt/gym/01.md');
		});

		it('generates correct path for middle entry', () => {
			expect(getTemplatePathForEntry('#dt/gym', 2, 3)).toBe('templates/tags/dt/gym/02.md');
		});

		it('generates correct path for last entry', () => {
			expect(getTemplatePathForEntry('#dt/gym', 3, 3)).toBe('templates/tags/dt/gym/03.md');
		});

		it('caps at targetCount for over-target entries', () => {
			expect(getTemplatePathForEntry('#dt/gym', 4, 3)).toBe('templates/tags/dt/gym/03.md');
			expect(getTemplatePathForEntry('#dt/gym', 10, 3)).toBe('templates/tags/dt/gym/03.md');
		});

		it('handles single target correctly', () => {
			expect(getTemplatePathForEntry('#dt/songs', 1, 1)).toBe('templates/tags/dt/songs/01.md');
			expect(getTemplatePathForEntry('#dt/songs', 2, 1)).toBe('templates/tags/dt/songs/01.md');
		});

		it('handles nested tag paths', () => {
			expect(getTemplatePathForEntry('#dt/morning/routine', 1, 1)).toBe(
				'templates/tags/dt/morning/routine/01.md'
			);
		});

		it('pads single digit numbers with zero', () => {
			expect(getTemplatePathForEntry('#dt/gym', 1, 10)).toBe('templates/tags/dt/gym/01.md');
			expect(getTemplatePathForEntry('#dt/gym', 9, 10)).toBe('templates/tags/dt/gym/09.md');
			expect(getTemplatePathForEntry('#dt/gym', 10, 10)).toBe('templates/tags/dt/gym/10.md');
		});
	});

	describe('createDailyTask', () => {
		it('creates task with defaults', () => {
			const task = createDailyTask('gym', 'Gym');
			expect(task).toEqual({
				id: 'gym',
				name: 'Gym',
				tag: '#dt/gym',
				targetCount: 1,
				days: 'daily'
			});
		});

		it('creates task with custom options', () => {
			const task = createDailyTask('gym', 'Gym', {
				targetCount: 3,
				days: ['monday', 'wednesday', 'friday']
			});
			expect(task).toEqual({
				id: 'gym',
				name: 'Gym',
				tag: '#dt/gym',
				targetCount: 3,
				days: ['monday', 'wednesday', 'friday']
			});
		});
	});

	describe('getTaskEntryCount', () => {
		const task: DailyTask = {
			id: 'gym',
			name: 'Gym',
			tag: '#dt/gym',
			targetCount: 3,
			days: 'daily'
		};

		it('returns 0 when no entries have the tag', () => {
			const entries = [
				{ tags: ['#other'] },
				{ tags: ['#different'] }
			];
			expect(getTaskEntryCount(task, entries)).toBe(0);
		});

		it('counts entries with the task tag', () => {
			const entries = [
				{ tags: ['#dt/gym'] },
				{ tags: ['#other'] },
				{ tags: ['#dt/gym', '#extra'] }
			];
			expect(getTaskEntryCount(task, entries)).toBe(2);
		});

		it('handles empty entries array', () => {
			expect(getTaskEntryCount(task, [])).toBe(0);
		});
	});

	describe('isTaskComplete', () => {
		const task: DailyTask = {
			id: 'gym',
			name: 'Gym',
			tag: '#dt/gym',
			targetCount: 3,
			days: 'daily'
		};

		it('returns false when count is less than target', () => {
			const entries = [
				{ tags: ['#dt/gym'] },
				{ tags: ['#dt/gym'] }
			];
			expect(isTaskComplete(task, entries)).toBe(false);
		});

		it('returns true when count equals target', () => {
			const entries = [
				{ tags: ['#dt/gym'] },
				{ tags: ['#dt/gym'] },
				{ tags: ['#dt/gym'] }
			];
			expect(isTaskComplete(task, entries)).toBe(true);
		});

		it('returns true when count exceeds target', () => {
			const entries = [
				{ tags: ['#dt/gym'] },
				{ tags: ['#dt/gym'] },
				{ tags: ['#dt/gym'] },
				{ tags: ['#dt/gym'] }
			];
			expect(isTaskComplete(task, entries)).toBe(true);
		});
	});

	describe('constants', () => {
		it('DAILY_TASK_PREFIX is correct', () => {
			expect(DAILY_TASK_PREFIX).toBe('#dt/');
		});

		it('ALL_DAYS contains all days of the week', () => {
			expect(ALL_DAYS).toEqual([
				'monday',
				'tuesday',
				'wednesday',
				'thursday',
				'friday',
				'saturday',
				'sunday'
			]);
		});
	});
});
