import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const handle: Handle = async ({ event, resolve }) => {
	// Skip auth for health check endpoint (used by kamal-proxy)
	if (event.url.pathname === '/up') {
		return resolve(event);
	}

	const username = env.AUTH_USERNAME;
	const password = env.AUTH_PASSWORD;

	// Skip auth if credentials not configured (local dev)
	if (!username || !password) {
		return resolve(event);
	}

	const auth = event.request.headers.get('Authorization');

	if (!auth?.startsWith('Basic ')) {
		return new Response('Authentication required', {
			status: 401,
			headers: { 'WWW-Authenticate': 'Basic realm="Protected"' }
		});
	}

	const base64 = auth.slice(6);
	const decoded = atob(base64);
	const [providedUser, providedPass] = decoded.split(':');

	if (providedUser !== username || providedPass !== password) {
		return new Response('Invalid credentials', {
			status: 401,
			headers: { 'WWW-Authenticate': 'Basic realm="Protected"' }
		});
	}

	return resolve(event);
};
