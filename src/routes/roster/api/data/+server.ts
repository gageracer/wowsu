import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Import the roster data directly - this will be bundled in production
import rosterData from '$lib/data/roster.json';

export const GET: RequestHandler = async () => {
	try {
		// In production, use the imported/bundled data
		if (!dev) {
			return json(rosterData);
		}

		// In dev mode, read from filesystem (allows live updates after roster changes)
		const rosterPath = join(process.cwd(), 'src', 'lib', 'data', 'roster.json');

		if (!existsSync(rosterPath)) {
			// Fallback to bundled data if file doesn't exist
			return json(rosterData);
		}

		const rosterText = await readFile(rosterPath, 'utf-8');
		const freshRosterData = JSON.parse(rosterText);

		return json(freshRosterData);
	} catch (error) {
		console.error('Error reading roster:', error);
		// Fallback to bundled data on error
		return json(rosterData);
	}
};
