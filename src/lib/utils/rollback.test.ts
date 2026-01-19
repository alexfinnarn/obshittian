import { describe, it, expect, vi } from 'vitest';
import {
	withRollback,
	createPropertyRollback,
	withPropertyRollback,
	withArrayRollback,
	withSetRollback
} from './rollback';

describe('rollback utilities', () => {
	describe('withRollback', () => {
		it('returns true on successful save', async () => {
			const obj = { value: 'old' };

			const result = await withRollback({
				capture: () => obj.value,
				mutate: () => {
					obj.value = 'new';
				},
				save: () => Promise.resolve(true),
				rollback: (old) => {
					obj.value = old;
				}
			});

			expect(result).toBe(true);
			expect(obj.value).toBe('new');
		});

		it('rolls back on save failure', async () => {
			const obj = { value: 'old' };

			const result = await withRollback({
				capture: () => obj.value,
				mutate: () => {
					obj.value = 'new';
				},
				save: () => Promise.resolve(false),
				rollback: (old) => {
					obj.value = old;
				}
			});

			expect(result).toBe(false);
			expect(obj.value).toBe('old');
		});

		it('calls onSuccess after successful save', async () => {
			const onSuccess = vi.fn();

			await withRollback({
				capture: () => null,
				mutate: () => {},
				save: () => Promise.resolve(true),
				rollback: () => {},
				onSuccess
			});

			expect(onSuccess).toHaveBeenCalled();
		});

		it('does not call onSuccess on failure', async () => {
			const onSuccess = vi.fn();

			await withRollback({
				capture: () => null,
				mutate: () => {},
				save: () => Promise.resolve(false),
				rollback: () => {},
				onSuccess
			});

			expect(onSuccess).not.toHaveBeenCalled();
		});

		it('calls onRollback after failure', async () => {
			const onRollback = vi.fn();

			await withRollback({
				capture: () => 'captured',
				mutate: () => {},
				save: () => Promise.resolve(false),
				rollback: () => {},
				onRollback
			});

			expect(onRollback).toHaveBeenCalledWith('captured');
		});

		it('handles complex captured state', async () => {
			const entry = {
				text: 'old text',
				updatedAt: '2025-01-01',
				tags: ['tag1']
			};

			await withRollback({
				capture: () => ({
					text: entry.text,
					updatedAt: entry.updatedAt,
					tags: [...entry.tags]
				}),
				mutate: () => {
					entry.text = 'new text';
					entry.updatedAt = '2025-01-02';
					entry.tags = ['tag1', 'tag2'];
				},
				save: () => Promise.resolve(false),
				rollback: (old) => {
					entry.text = old.text;
					entry.updatedAt = old.updatedAt;
					entry.tags = old.tags;
				}
			});

			expect(entry.text).toBe('old text');
			expect(entry.updatedAt).toBe('2025-01-01');
			expect(entry.tags).toEqual(['tag1']);
		});
	});

	describe('createPropertyRollback', () => {
		it('captures and restores specified properties', () => {
			const obj = { a: 1, b: 'hello', c: true };
			const { capture, rollback } = createPropertyRollback(obj, ['a', 'b']);

			const captured = capture();
			obj.a = 2;
			obj.b = 'world';

			rollback(captured);

			expect(obj.a).toBe(1);
			expect(obj.b).toBe('hello');
		});

		it('does not affect unspecified properties', () => {
			const obj = { a: 1, b: 'hello', c: true };
			const { capture, rollback } = createPropertyRollback(obj, ['a']);

			const captured = capture();
			obj.a = 2;
			obj.c = false;

			rollback(captured);

			expect(obj.a).toBe(1);
			expect(obj.c).toBe(false); // unchanged by rollback
		});

		it('handles empty keys array', () => {
			const obj = { a: 1 };
			const { capture, rollback } = createPropertyRollback(obj, []);

			const captured = capture();
			obj.a = 2;

			rollback(captured);

			expect(obj.a).toBe(2); // nothing to rollback
		});
	});

	describe('withPropertyRollback', () => {
		it('updates property and saves', async () => {
			const obj = { value: 'old' };
			const save = vi.fn().mockResolvedValue(true);

			const result = await withPropertyRollback(obj, 'value', 'new', save);

			expect(result).toBe(true);
			expect(obj.value).toBe('new');
			expect(save).toHaveBeenCalled();
		});

		it('rolls back on save failure', async () => {
			const obj = { value: 'old' };

			const result = await withPropertyRollback(obj, 'value', 'new', () =>
				Promise.resolve(false)
			);

			expect(result).toBe(false);
			expect(obj.value).toBe('old');
		});

		it('applies additional updates', async () => {
			const obj = { text: 'old', updatedAt: 'time1' };

			await withPropertyRollback(obj, 'text', 'new', () => Promise.resolve(true), {
				additionalUpdates: { updatedAt: 'time2' }
			});

			expect(obj.text).toBe('new');
			expect(obj.updatedAt).toBe('time2');
		});

		it('rolls back additional updates on failure', async () => {
			const obj = { text: 'old', updatedAt: 'time1' };

			await withPropertyRollback(obj, 'text', 'new', () => Promise.resolve(false), {
				additionalUpdates: { updatedAt: 'time2' }
			});

			expect(obj.text).toBe('old');
			expect(obj.updatedAt).toBe('time1');
		});

		it('calls onSuccess after successful save', async () => {
			const obj = { value: 'old' };
			const onSuccess = vi.fn();

			await withPropertyRollback(obj, 'value', 'new', () => Promise.resolve(true), {
				onSuccess
			});

			expect(onSuccess).toHaveBeenCalled();
		});

		it('does not call onSuccess on failure', async () => {
			const obj = { value: 'old' };
			const onSuccess = vi.fn();

			await withPropertyRollback(obj, 'value', 'new', () => Promise.resolve(false), {
				onSuccess
			});

			expect(onSuccess).not.toHaveBeenCalled();
		});
	});

	describe('withArrayRollback', () => {
		it('mutates array and saves', async () => {
			let arr = [1, 2, 3];
			const setArr = (newArr: number[]) => {
				arr = newArr;
			};

			const result = await withArrayRollback(
				arr,
				(a) => [...a, 4],
				() => Promise.resolve(true),
				setArr
			);

			expect(result).toBe(true);
			expect(arr).toEqual([1, 2, 3, 4]);
		});

		it('rolls back array on failure', async () => {
			let arr = [1, 2, 3];
			const setArr = (newArr: number[]) => {
				arr = newArr;
			};

			const result = await withArrayRollback(
				arr,
				(a) => [...a, 4],
				() => Promise.resolve(false),
				setArr
			);

			expect(result).toBe(false);
			expect(arr).toEqual([1, 2, 3]);
		});

		it('handles array removal', async () => {
			let arr = [1, 2, 3];
			const setArr = (newArr: number[]) => {
				arr = newArr;
			};

			await withArrayRollback(
				arr,
				(a) => a.filter((x) => x !== 2),
				() => Promise.resolve(false),
				setArr
			);

			expect(arr).toEqual([1, 2, 3]);
		});

		it('handles complex objects in array', async () => {
			let arr = [{ id: 1, name: 'a' }];
			const setArr = (newArr: typeof arr) => {
				arr = newArr;
			};

			await withArrayRollback(
				arr,
				(a) => [...a, { id: 2, name: 'b' }],
				() => Promise.resolve(false),
				setArr
			);

			expect(arr).toHaveLength(1);
			expect(arr[0]).toEqual({ id: 1, name: 'a' });
		});
	});

	describe('withSetRollback', () => {
		it('mutates set and saves', async () => {
			let set = new Set([1, 2, 3]);
			const setSet = (newSet: Set<number>) => {
				set = newSet;
			};

			const result = await withSetRollback(
				set,
				(s) => {
					s.add(4);
					return s;
				},
				() => Promise.resolve(true),
				setSet
			);

			expect(result).toBe(true);
			expect(set.has(4)).toBe(true);
		});

		it('rolls back set on failure', async () => {
			let set = new Set([1, 2, 3]);
			const setSet = (newSet: Set<number>) => {
				set = newSet;
			};

			const result = await withSetRollback(
				set,
				(s) => {
					s.add(4);
					return s;
				},
				() => Promise.resolve(false),
				setSet
			);

			expect(result).toBe(false);
			expect(set.has(4)).toBe(false);
			expect(set.size).toBe(3);
		});

		it('handles string sets', async () => {
			let dates = new Set(['2025-01-01', '2025-01-02']);
			const setDates = (newSet: Set<string>) => {
				dates = newSet;
			};

			await withSetRollback(
				dates,
				(s) => {
					s.add('2025-01-03');
					return s;
				},
				() => Promise.resolve(false),
				setDates
			);

			expect(dates.has('2025-01-03')).toBe(false);
			expect(dates.size).toBe(2);
		});
	});
});
