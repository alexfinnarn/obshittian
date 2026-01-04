import { test, expect } from '@playwright/test';

/**
 * Health check endpoint tests
 *
 * The /up endpoint is used by kamal-proxy to verify the app is healthy
 * before routing traffic to the container.
 */

test.describe('Health Check', () => {
	test('GET /up returns 200 with status ok', async ({ request }) => {
		const response = await request.get('/up');

		expect(response.status()).toBe(200);
		expect(await response.json()).toEqual({ status: 'ok' });
	});
});
