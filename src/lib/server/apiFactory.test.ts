import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiHandler, validators } from './apiFactory';

// Mock pathUtils
vi.mock('./pathUtils', () => ({
	validateRequestBody: <T>(body: unknown, requiredFields: (keyof T)[]): body is T => {
		if (!body || typeof body !== 'object') return false;
		for (const field of requiredFields) {
			if (!(field as string in body)) return false;
		}
		return true;
	},
	createErrorResponse: (err: unknown) => {
		const error = err as Error;
		return new Response(JSON.stringify({ error: error.message, code: 'INTERNAL_ERROR' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}));

// Helper to create a mock request
function createMockRequest(body: unknown): Request {
	return {
		json: vi.fn().mockResolvedValue(body)
	} as unknown as Request;
}

// Helper to create mock RequestEvent
function createMockEvent(body: unknown) {
	return {
		request: createMockRequest(body),
		params: {},
		url: new URL('http://localhost/api/test'),
		locals: {},
		platform: undefined,
		cookies: {} as unknown,
		fetch: vi.fn(),
		getClientAddress: () => '127.0.0.1',
		isDataRequest: false,
		isSubRequest: false,
		route: { id: '/api/test' },
		setHeaders: vi.fn()
	};
}

describe('apiFactory', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('createApiHandler', () => {
		it('validates required fields and returns 400 for missing fields', async () => {
			const handler = createApiHandler<{ name: string; age: number }, { ok: true }>({
				requiredFields: ['name', 'age'],
				handler: async () => ({ ok: true })
			});

			const event = createMockEvent({ name: 'test' }); // missing 'age'
			const response = await handler(event as never);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.code).toBe('BAD_REQUEST');
			expect(data.error).toContain('age');
		});

		it('calls handler with validated body', async () => {
			const handlerFn = vi.fn().mockResolvedValue({ result: 'ok' });
			const handler = createApiHandler<{ name: string }, { result: string }>({
				requiredFields: ['name'],
				handler: handlerFn
			});

			const event = createMockEvent({ name: 'test' });
			await handler(event as never);

			expect(handlerFn).toHaveBeenCalledWith({ name: 'test' }, event.request);
		});

		it('returns handler result as JSON', async () => {
			const handler = createApiHandler<{ name: string }, { greeting: string }>({
				requiredFields: ['name'],
				handler: async ({ name }) => ({ greeting: `Hello, ${name}!` })
			});

			const event = createMockEvent({ name: 'World' });
			const response = await handler(event as never);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data).toEqual({ greeting: 'Hello, World!' });
		});

		it('runs custom validation and returns error response', async () => {
			const handler = createApiHandler<{ kind: string }, { ok: true }>({
				requiredFields: ['kind'],
				validate: (body) => {
					if (body.kind !== 'valid') {
						return { error: 'Invalid kind', code: 'BAD_REQUEST' };
					}
				},
				handler: async () => ({ ok: true })
			});

			const event = createMockEvent({ kind: 'invalid' });
			const response = await handler(event as never);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe('Invalid kind');
		});

		it('passes validation when validate returns undefined', async () => {
			const handlerFn = vi.fn().mockResolvedValue({ ok: true });
			const handler = createApiHandler<{ kind: string }, { ok: true }>({
				requiredFields: ['kind'],
				validate: () => undefined,
				handler: handlerFn
			});

			const event = createMockEvent({ kind: 'anything' });
			await handler(event as never);

			expect(handlerFn).toHaveBeenCalled();
		});

		it('handles async validation', async () => {
			const handler = createApiHandler<{ name: string }, { ok: true }>({
				requiredFields: ['name'],
				validate: async (body) => {
					await new Promise((r) => setTimeout(r, 1));
					if (body.name === 'invalid') {
						return { error: 'Name not allowed', code: 'BAD_REQUEST' };
					}
				},
				handler: async () => ({ ok: true })
			});

			const event = createMockEvent({ name: 'invalid' });
			const response = await handler(event as never);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe('Name not allowed');
		});

		it('catches handler errors and returns error response', async () => {
			const handler = createApiHandler<{ name: string }, { ok: true }>({
				requiredFields: ['name'],
				handler: async () => {
					throw new Error('Something went wrong');
				}
			});

			const event = createMockEvent({ name: 'test' });
			const response = await handler(event as never);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe('Something went wrong');
		});

		it('uses custom missing fields message', async () => {
			const handler = createApiHandler<{ path: string }, { ok: true }>({
				requiredFields: ['path'],
				missingFieldsMessage: 'Path is required for this operation',
				handler: async () => ({ ok: true })
			});

			const event = createMockEvent({});
			const response = await handler(event as never);
			const data = await response.json();

			expect(data.error).toBe('Path is required for this operation');
		});

		it('handles empty body', async () => {
			const handler = createApiHandler<{ name: string }, { ok: true }>({
				requiredFields: ['name'],
				handler: async () => ({ ok: true })
			});

			const event = createMockEvent(null);
			const response = await handler(event as never);

			expect(response.status).toBe(400);
		});
	});

	describe('validators', () => {
		describe('fileKind', () => {
			it('accepts "file" kind', () => {
				expect(validators.fileKind({ kind: 'file' })).toBeUndefined();
			});

			it('accepts "directory" kind', () => {
				expect(validators.fileKind({ kind: 'directory' })).toBeUndefined();
			});

			it('rejects invalid kinds', () => {
				const result = validators.fileKind({ kind: 'other' });
				expect(result).toEqual({
					error: 'Invalid kind: must be "file" or "directory"',
					code: 'BAD_REQUEST'
				});
			});

			it('rejects empty kind', () => {
				const result = validators.fileKind({ kind: '' });
				expect(result).toBeDefined();
			});
		});
	});
});
